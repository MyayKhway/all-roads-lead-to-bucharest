/**
 * App — root component.
 *
 * State machine:
 *   idle       → user configures options
 *   searching  → A* runs (synchronous, so very brief)
 *   animating  → green path draws city-by-city
 *   done       → route shown, OrbitControls re-enabled
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas }     from '@react-three/fiber';
import { Suspense }   from 'react';

import { cities }     from './data/cities.js';
import { edges }      from './data/graph.js';
import { astar, HEURISTICS } from './algorithms/astar.js';

import RomaniaMap   from './components/RomaniaMap.jsx';
import ControlPanel from './components/ControlPanel.jsx';

import './App.css';

// How many seconds each path segment takes to animate
const SEGMENT_DURATION = 1.0;

export default function App() {
  // ---- form state ----
  const [startCity,  setStartCity]  = useState('arad');
  const [goalCity,   setGoalCity]   = useState('bucharest');
  const [algorithm,  setAlgorithm]  = useState('astar');
  const [heuristic,  setHeuristic]  = useState(HEURISTICS.MAGNETIC_FIELD);

  // ---- result / animation state ----
  const [pathResult,   setPathResult]   = useState(null);
  const [animProgress, setAnimProgress] = useState(0);   // 0..path.length-1
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [noPath,       setNoPath]       = useState(false);

  const animRef      = useRef(null);
  const startTimeRef = useRef(null);

  // ---- find path ----
  const handleFindPath = useCallback(() => {
    if (!startCity || !goalCity || startCity === goalCity) return;

    // Cancel any running animation
    if (animRef.current) {
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

    // Animate: progress from 0 → result.path.length - 1
    const totalSegments = result.path.length - 1;
    const totalDuration = totalSegments * SEGMENT_DURATION * 1000; // ms

    function tick(now) {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / totalDuration, 1);
      // Ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const progress = eased * totalSegments;
      setAnimProgress(progress);

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

  // ---- reset ----
  const handleReset = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setPathResult(null);
    setAnimProgress(0);
    setIsAnimating(false);
    setNoPath(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  // City click — set as start or goal depending on what's already selected
  const handleCityClick = useCallback((cityId) => {
    if (isAnimating) return;
    if (!startCity) { setStartCity(cityId); return; }
    if (!goalCity  ) { setGoalCity(cityId);  return; }
    // Toggle: if it's the start, move start; otherwise move goal
    if (cityId === startCity) setStartCity('');
    else                      setGoalCity(cityId);
  }, [isAnimating, startCity, goalCity]);

  return (
    <div className="app-root">
      {/* ---- 3D canvas ---- */}
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

        {/* Subtle fog overlay at bottom */}
        <div className="canvas-fog" />

        {/* No-path toast */}
        {noPath && (
          <div className="toast toast--error">
            ⚠ No path found between the selected cities.
          </div>
        )}

        {/* Animating status badge */}
        {isAnimating && (
          <div className="toast toast--info">
            🗺 Navigating route…
          </div>
        )}
      </div>

      {/* ---- Sidebar ---- */}
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
