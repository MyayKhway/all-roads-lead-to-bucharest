/**
 * App — root component.
 *
 * State machine:
 *   idle        → user configures options
 *   searching   → recorded expansions replay step by step
 *   navigating  → green path draws city-by-city
 *   done        → route shown, OrbitControls re-enabled
 */

import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ComparisonPanel from './components/ComparisonPanel'
import ControlPanel from './components/ControlPanel'
import ExplainPage from './components/explain/ExplainPage'
import HelpPanel from './components/HelpPanel'
import ReplayControls, { type ReplaySpeed } from './components/ReplayControls'
import ResultsPanel from './components/ResultsPanel'
import RomaniaMap from './components/RomaniaMap'
import { cities } from './data/cities'
import { isCityId } from './data/cityIds'
import { edges } from './data/graph'
import { deriveSearchView, type Phase, stepDurationMs } from './lib/searchView'
import { ThemeContext } from './lib/ThemeContext'
import { sceneColorFor } from './lib/theme'
import { useTheme } from './lib/useTheme'
import type { AllPairsComparisonResponse } from './search/allPairsComparison.worker'
import type { AllPairsComparison, RouteComparison } from './search/comparison'
import type { ComparisonRequest, ComparisonResponse } from './search/comparison.worker'
import { type RouteRun, runRoute } from './search/presentation'
import { searchVariantRegistry } from './search/registry'
import { findSearchVariant } from './search/variant'

import './App.css'

const SEGMENT_DURATION = 1.0 // seconds per path segment
const EXPLAIN_HASH = '#/explain'

/** The explain page is a hash route, so it works on any static host without rewrites. */
function useExplainRoute(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(() => window.location.hash === EXPLAIN_HASH)
  useEffect(() => {
    const sync = () => setOpen(window.location.hash === EXPLAIN_HASH)
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const navigate = useCallback((next: boolean) => {
    window.location.hash = next ? EXPLAIN_HASH : ''
  }, [])
  return [open, navigate]
}

export default function App() {
  const [theme, toggleTheme] = useTheme()

  // ── form state ──────────────────────────────────────────────────────────────
  const [startCity, setStartCity] = useState<string>('arad')
  const [goalCity, setGoalCity] = useState<string>('bucharest')
  const [variantId, setVariantId] = useState<string>(searchVariantRegistry[0]?.id ?? '')
  const [explainOpen, setExplainOpen] = useExplainRoute()
  const [helpOpen, setHelpOpen] = useState<boolean>(false)

  // ── result / animation state ─────────────────────────────────────────────────
  const [pathResult, setPathResult] = useState<RouteRun | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealed, setRevealed] = useState<number>(0)
  const [playing, setPlaying] = useState<boolean>(true)
  const [speed, setSpeed] = useState<ReplaySpeed>(1)
  const [animProgress, setAnimProgress] = useState<number>(0)
  const [noPath, setNoPath] = useState<boolean>(false)

  const view = useMemo(() => deriveSearchView(pathResult, revealed), [pathResult, revealed])
  // A paused replay leaves the controls free; only moving playback locks them.
  const isAnimating = (phase === 'searching' && playing) || phase === 'navigating'
  const totalSteps = pathResult?.steps.length ?? 0

  // ── comparison state ─────────────────────────────────────────────────────────
  const [comparison, setComparison] = useState<RouteComparison | null>(null)
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false)
  const [allPairsComparison, setAllPairsComparison] = useState<AllPairsComparison | null>(null)
  const [isMeasuringAllPairs, setIsMeasuringAllPairs] = useState<boolean>(false)
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  const [allPairsError, setAllPairsError] = useState<string | null>(null)
  // Hidden until asked for, so the finished route stays visible.
  const [comparisonOpen, setComparisonOpen] = useState<boolean>(false)

  const animRef = useRef<number | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latestRequestRef = useRef<number>(0)

  // Two workers for the app's lifetime: one answers route requests (only the newest is
  // shown), the other runs the all-routes benchmark once, after the first route answer.
  useEffect(() => {
    const worker = new Worker(new URL('./search/comparison.worker.ts', import.meta.url), {
      type: 'module',
    })
    const allPairsWorker = new Worker(
      new URL('./search/allPairsComparison.worker.ts', import.meta.url),
      { type: 'module' },
    )
    let allPairsStarted = false

    worker.onmessage = (event: MessageEvent<ComparisonResponse>) => {
      if (!allPairsStarted) {
        allPairsStarted = true
        setIsMeasuringAllPairs(true)
        allPairsWorker.postMessage(null)
      }
      if (event.data.requestId !== latestRequestRef.current) return
      if (event.data.type === 'error') {
        setComparisonError(event.data.message)
      } else {
        setComparison(event.data.comparison)
        setComparisonError(null)
      }
      setIsMeasuring(false)
    }
    worker.onerror = () => {
      setComparisonError('The comparison worker failed to start.')
      setIsMeasuring(false)
    }

    allPairsWorker.onmessage = (event: MessageEvent<AllPairsComparisonResponse>) => {
      if (event.data.type === 'error') setAllPairsError(event.data.message)
      else setAllPairsComparison(event.data.comparison)
      setIsMeasuringAllPairs(false)
    }
    allPairsWorker.onerror = () => {
      setAllPairsError('The all-routes benchmark worker failed to start.')
      setIsMeasuringAllPairs(false)
    }

    workerRef.current = worker
    return () => {
      worker.terminate()
      allPairsWorker.terminate()
    }
  }, [])

  // ── run one variant, then replay its search ─────────────────────────────────
  const animateRoute = useCallback(
    (selectedVariantId: string) => {
      if (!isCityId(startCity) || !isCityId(goalCity) || startCity === goalCity) return

      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      setAnimProgress(0)

      const result = runRoute(
        findSearchVariant(searchVariantRegistry, selectedVariantId),
        startCity,
        goalCity,
      )
      setPathResult(result)
      setNoPath(result === null)
      setRevealed(result === null ? 0 : 1)
      setPlaying(true)
      setPhase(result === null ? 'idle' : 'searching')
    },
    [startCity, goalCity],
  )

  // ── replay the search, one expansion at a time ───────────────────────────────
  useEffect(() => {
    if (phase !== 'searching' || !playing) return
    const timer = window.setTimeout(() => {
      if (revealed < totalSteps) setRevealed(revealed + 1)
      else setPhase('navigating')
    }, stepDurationMs(totalSteps) / speed)
    return () => window.clearTimeout(timer)
  }, [phase, playing, revealed, totalSteps, speed])

  // ── draw the green route city by city ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'navigating' || !pathResult) return
    const totalSegments = pathResult.path.length - 1
    if (totalSegments <= 0) {
      setPhase('done')
      return
    }
    const totalDuration = totalSegments * SEGMENT_DURATION * 1000
    let startTime: number | null = null

    function tick(now: number) {
      if (startTime === null) startTime = now
      const t = Math.min((now - startTime) / totalDuration, 1)
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      setAnimProgress(eased * totalSegments)
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        animRef.current = null
        setPhase('done')
      }
    }
    animRef.current = requestAnimationFrame(tick)
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    }
  }, [phase, pathResult])

  // ── replay controls (also usable after the route has drawn) ─────────────────
  const seekStep = useCallback(
    (step: number) => {
      setPlaying(false)
      setRevealed(Math.min(Math.max(1, step), totalSteps))
      setPhase('searching')
    },
    [totalSteps],
  )

  const handleStepBack = useCallback(() => seekStep(revealed - 1), [seekStep, revealed])

  const handleStepForward = useCallback(() => {
    setPlaying(false)
    if (revealed < totalSteps) setRevealed(revealed + 1)
    else setPhase('navigating')
  }, [revealed, totalSteps])

  const handleSkip = useCallback(() => {
    setRevealed(totalSteps)
    setPhase('navigating')
  }, [totalSteps])

  const handleTogglePlay = useCallback(() => {
    if (phase === 'done') {
      setRevealed(1)
      setPhase('searching')
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }, [phase])

  // ── find path: animate the chosen variant, measure all of them ───────────────
  const handleFindPath = useCallback(() => {
    if (!isCityId(startCity) || !isCityId(goalCity) || startCity === goalCity) return
    animateRoute(variantId)

    latestRequestRef.current += 1
    const request: ComparisonRequest = {
      requestId: latestRequestRef.current,
      start: startCity,
      goal: goalCity,
    }
    setIsMeasuring(true)
    setComparisonOpen(false)
    workerRef.current?.postMessage(request)
  }, [startCity, goalCity, variantId, animateRoute])

  const handleSelectComparedVariant = useCallback(
    (selectedVariantId: string) => {
      setVariantId(selectedVariantId)
      animateRoute(selectedVariantId)
    },
    [animateRoute],
  )

  // ── reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    setPathResult(null)
    setPhase('idle')
    setRevealed(0)
    setAnimProgress(0)
    setNoPath(false)
    latestRequestRef.current += 1
    setComparison(null)
    setIsMeasuring(false)
  }, [])

  // cleanup on unmount
  useEffect(
    () => () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    },
    [],
  )

  // ── city click ───────────────────────────────────────────────────────────────
  const handleCityClick = useCallback(
    (cityId: string, shiftKey: boolean) => {
      if (isAnimating) return
      // Shift+click always sets the start directly, without first clearing it —
      // a plain click can't do this unambiguously once both ends are already set,
      // since it's also how you pick a new destination.
      if (shiftKey) {
        setStartCity(cityId)
        if (cityId === goalCity) setGoalCity('')
        return
      }
      if (!startCity) {
        setStartCity(cityId)
        return
      }
      if (!goalCity) {
        setGoalCity(cityId)
        return
      }
      if (cityId === startCity) setStartCity('')
      else setGoalCity(cityId)
    },
    [isAnimating, startCity, goalCity],
  )

  return (
    <ThemeContext.Provider value={theme}>
      <div className="app-root">
        {/* Left: pickers and actions */}
        <ControlPanel
          startCity={startCity}
          goalCity={goalCity}
          variantId={variantId}
          isAnimating={isAnimating}
          phase={phase}
          theme={theme}
          onStart={setStartCity}
          onGoal={setGoalCity}
          onVariant={setVariantId}
          onFindPath={handleFindPath}
          onReset={handleReset}
          onToggleTheme={toggleTheme}
          onHelp={() => setHelpOpen(true)}
        />

        {/* 3D canvas */}
        <div className="canvas-container">
          <Canvas
            shadows
            camera={{ position: [2, 12, 14], fov: 45 }}
            gl={{ antialias: true }}
            // Nothing on the map is visible behind the explain page, so stop rendering it.
            frameloop={explainOpen ? 'never' : 'always'}
            style={{ background: sceneColorFor(theme).sky }}
          >
            <Suspense fallback={null}>
              <RomaniaMap
                cities={cities}
                edges={edges}
                pathResult={pathResult}
                phase={phase}
                view={view}
                animProgress={animProgress}
                onCityClick={handleCityClick}
              />
            </Suspense>
          </Canvas>

          <div className="canvas-fog" />

          {noPath && (
            <div className="toast toast--error">⚠ No path found between the selected cities.</div>
          )}
          {pathResult && phase !== 'idle' && (
            <ReplayControls
              phase={phase}
              revealed={revealed}
              total={totalSteps}
              current={view.current}
              playing={playing}
              speed={speed}
              onTogglePlay={handleTogglePlay}
              onStepBack={handleStepBack}
              onStepForward={handleStepForward}
              onSkip={handleSkip}
              onSeek={seekStep}
              onSpeed={setSpeed}
            />
          )}

          {/* Measured from Find Path, but only shown once the route has drawn */}
          {phase === 'done' &&
            !comparisonOpen &&
            (comparison || isMeasuring || comparisonError) && (
              <button
                type="button"
                className="comparison-toggle"
                onClick={() => setComparisonOpen(true)}
              >
                📊 See Comparison Results
              </button>
            )}
          {phase === 'done' && comparisonOpen && (
            <ComparisonPanel
              comparison={comparison}
              isMeasuring={isMeasuring}
              error={comparisonError}
              allPairsComparison={allPairsComparison}
              isMeasuringAllPairs={isMeasuringAllPairs}
              allPairsError={allPairsError}
              selectedVariantId={variantId}
              disabled={isAnimating}
              onSelect={handleSelectComparedVariant}
              onClose={() => setComparisonOpen(false)}
            />
          )}
        </div>

        {/* Right: the rationale for each step, then the route found */}
        <ResultsPanel
          phase={phase}
          view={view}
          pathResult={pathResult}
          onExplain={() => setExplainOpen(true)}
        />

        {explainOpen && (
          <ExplainPage
            startCity={startCity}
            goalCity={goalCity}
            initialVariantId={variantId}
            onBack={() => setExplainOpen(false)}
          />
        )}

        {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
      </div>
    </ThemeContext.Provider>
  )
}
