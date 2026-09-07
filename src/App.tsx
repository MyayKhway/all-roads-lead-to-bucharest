/**
 * App — root component.
 *
 * State machine:
 *   idle       → user configures options
 *   animating  → green path draws city-by-city
 *   done       → route shown, OrbitControls re-enabled
 */

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import { cities } from './data/cities';
import { edges }  from './data/graph';
import { astar, HEURISTICS } from './algorithms/astar';
import type { AstarResult, HeuristicName } from './algorithms/astar';

import RomaniaMap   from './components/RomaniaMap';
import ControlPanel from './components/ControlPanel';

import './App.css';

const SEGMENT_DURATION = 1.0; // seconds per path segment

export default function App() {
  // ── form state ──────────────────────────────────────────────────────────────
  const [startCity,  setStartCity]  = useState<string>('arad');
  const [goalCity,   setGoalCity]   = useState<string>('bucharest');
  const [algorithm,  setAlgorithm]  = useState<string>('astar');
  const [heuristic,  setHeuristic]  = useState<HeuristicName>(HEURISTICS.MAGNETIC_FIELD);

  // ── result / animation state ─────────────────────────────────────────────────
  const [pathResult,   setPathResult]   = useState<AstarResult | null>(null);
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [isAnimating,  setIsAnimating]  = useState<boolean>(false);
  const [noPath,       setNoPath]       = useState<boolean>(false);

  const animRef      = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // ── find path ────────────────────────────────────────────────────────────────
  const handleFindPath = useCallback(() => {
    if (!startCity || !goalCity || startCity === goalCity) return;

    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    setNoPath(false);
    setAnimProgress(0);
    setPathResult(null);

    const result = astar(startCity, goalCity, heuristic);

    if (!result) {
      setNoPath(true);
      return;
    }

    setPathResult(result);
    setIsAnimating(true);
    startTimeRef.current = null;

    const totalSegments = result.path.length - 1;
    const totalDuration = totalSegments * SEGMENT_DURATION * 1000;

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t       = Math.min(elapsed / totalDuration, 1);
      // ease-in-out cubic
      const eased   = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setAnimProgress(eased * totalSegments);

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setAnimProgress(totalSegments);
        setIsAnimating(false);
        animRef.current = null;
      }
    }

    animRef.current = requestAnimationFrame(tick);
  }, [startCity, goalCity, heuristic]);

  // ── reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setPathResult(null);
    setAnimProgress(0);
    setIsAnimating(false);
    setNoPath(false);
  }, []);

  // cleanup on unmount
  useEffect(() => () => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
  }, []);

  // ── city click ───────────────────────────────────────────────────────────────
  const handleCityClick = useCallback((cityId: string) => {
    if (isAnimating) return;
    if (!startCity)        { setStartCity(cityId); return; }
    if (!goalCity)         { setGoalCity(cityId);  return; }
    if (cityId === startCity) setStartCity('');
    else                      setGoalCity(cityId);
  }, [isAnimating, startCity, goalCity]);

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
          <div className="toast toast--error">
            ⚠ No path found between the selected cities.
          </div>
        )}
        {isAnimating && (
          <div className="toast toast--info">
            🗺 Navigating route…
          </div>
        )}
      </div>

      {/* Sidebar */}
      <ControlPanel
        startCity={startCity}
        goalCity={goalCity}
        algorithm={algorithm}
        heuristic={heuristic}
        isAnimating={isAnimating}
        pathResult={pathResult}
        onStart={setStartCity}
        onGoal={setGoalCity}
        onAlgorithm={setAlgorithm}
        onHeuristic={setHeuristic}
        onFindPath={handleFindPath}
        onReset={handleReset}
      />
    </div>
  );
}
