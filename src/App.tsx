/**
 * App — root component.
 *
 * State machine:
 *   idle       → user configures options
 *   animating  → green path draws city-by-city
 *   done       → route shown, OrbitControls re-enabled
 */

import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import ComparisonPanel from './components/ComparisonPanel'
import ControlPanel from './components/ControlPanel'
import RomaniaMap from './components/RomaniaMap'
import { cities } from './data/cities'
import { isCityId } from './data/cityIds'
import { edges } from './data/graph'
import type { RouteComparison } from './search/comparison'
import type { ComparisonRequest, ComparisonResponse } from './search/comparison.worker'
import { type RouteRun, runRoute } from './search/presentation'
import { searchVariantRegistry } from './search/registry'
import { findSearchVariant } from './search/variant'

import './App.css'

const SEGMENT_DURATION = 1.0 // seconds per path segment

export default function App() {
  // ── form state ──────────────────────────────────────────────────────────────
  const [startCity, setStartCity] = useState<string>('arad')
  const [goalCity, setGoalCity] = useState<string>('bucharest')
  const [variantId, setVariantId] = useState<string>(searchVariantRegistry[0]?.id ?? '')

  // ── result / animation state ─────────────────────────────────────────────────
  const [pathResult, setPathResult] = useState<RouteRun | null>(null)
  const [animProgress, setAnimProgress] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [noPath, setNoPath] = useState<boolean>(false)

  // ── comparison state ─────────────────────────────────────────────────────────
  const [comparison, setComparison] = useState<RouteComparison | null>(null)
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false)

  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latestRequestRef = useRef<number>(0)

  // One worker for the app's lifetime; only the newest request's answer is shown.
  useEffect(() => {
    const worker = new Worker(new URL('./search/comparison.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<ComparisonResponse>) => {
      if (event.data.requestId !== latestRequestRef.current) return
      setComparison(event.data.comparison)
      setIsMeasuring(false)
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  // ── show one variant's route ─────────────────────────────────────────────────
  const animateRoute = useCallback(
    (selectedVariantId: string) => {
      if (!isCityId(startCity) || !isCityId(goalCity) || startCity === goalCity) return

      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }

      setNoPath(false)
      setAnimProgress(0)
      setPathResult(null)

      const result = runRoute(
        findSearchVariant(searchVariantRegistry, selectedVariantId),
        startCity,
        goalCity,
      )

      if (!result) {
        setNoPath(true)
        return
      }

      setPathResult(result)
      setIsAnimating(true)
      startTimeRef.current = null

      const totalSegments = result.path.length - 1
      const totalDuration = totalSegments * SEGMENT_DURATION * 1000

      function tick(now: number) {
        if (startTimeRef.current === null) startTimeRef.current = now
        const elapsed = now - startTimeRef.current
        const t = Math.min(elapsed / totalDuration, 1)
        // ease-in-out cubic
        const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
        setAnimProgress(eased * totalSegments)

        if (t < 1) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          setAnimProgress(totalSegments)
          setIsAnimating(false)
          animRef.current = null
        }
      }

      animRef.current = requestAnimationFrame(tick)
    },
    [startCity, goalCity],
  )

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
    setAnimProgress(0)
    setIsAnimating(false)
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
    (cityId: string) => {
      if (isAnimating) return
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
    <div className="app-root">
      {/* 3D canvas */}
      <div className="canvas-container">
        <Canvas
          shadows
          camera={{ position: [2, 12, 14], fov: 45 }}
          gl={{ antialias: true }}
          style={{ background: '#E8F4EA' }}
        >
          <Suspense fallback={null}>
            <RomaniaMap
              cities={cities}
              edges={edges}
              pathResult={pathResult}
              animProgress={animProgress}
              isAnimating={isAnimating}
              onCityClick={handleCityClick}
            />
          </Suspense>
        </Canvas>

        <div className="canvas-fog" />

        {noPath && (
          <div className="toast toast--error">⚠ No path found between the selected cities.</div>
        )}
        {isAnimating && <div className="toast toast--info">🗺 Navigating route…</div>}

        <ComparisonPanel
          comparison={comparison}
          isMeasuring={isMeasuring}
          selectedVariantId={variantId}
          disabled={isAnimating}
          onSelect={handleSelectComparedVariant}
          onClose={() => setComparison(null)}
        />
      </div>

      {/* Sidebar */}
      <ControlPanel
        startCity={startCity}
        goalCity={goalCity}
        variantId={variantId}
        isAnimating={isAnimating}
        pathResult={pathResult}
        onStart={setStartCity}
        onGoal={setGoalCity}
        onVariant={setVariantId}
        onFindPath={handleFindPath}
        onReset={handleReset}
      />
    </div>
  )
}
