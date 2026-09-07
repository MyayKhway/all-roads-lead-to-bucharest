/**
 * NavigationPath — animates the green route line step-by-step.
 *
 * Receives:
 *   path          string[]  — ordered city ids
 *   cities        object    — city data map
 *   animProgress  number    — 0..path.length-1, drives how much of the line is drawn
 *
 * The line is drawn using a series of TubeGeometry segments, one per edge.
 * Each segment animates its length from 0 → full as animProgress crosses its index.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const LINE_RADIUS   = 0.045;
const LINE_SEGMENTS = 12;
const PATH_Y        = 0.12; // float above the road

// Build a smooth CatmullRom curve along a pair of points
function makeSegmentCurve(posA, posB) {
  const a = new THREE.Vector3(posA[0], PATH_Y, posA[2]);
  const b = new THREE.Vector3(posB[0], PATH_Y, posB[2]);
  // Add a midpoint slightly elevated for a subtle arc
  const mid = a.clone().lerp(b, 0.5);
  mid.y = PATH_Y + 0.15;
  return new THREE.CatmullRomCurve3([a, mid, b]);
}

// A single animated tube segment
function PathSegment({ posA, posB, progress }) {
  // progress 0 → 1 for this segment
  const clampedProgress = Math.max(0, Math.min(1, progress));

  const geometry = useMemo(() => {
    const curve = makeSegmentCurve(posA, posB);
    // Sample more points so we can reveal sub-segments
    const totalPoints = 20;
    const drawPoints  = Math.max(2, Math.round(clampedProgress * totalPoints));
    const points      = curve.getPoints(totalPoints);
    const partial     = points.slice(0, drawPoints);

    if (partial.length < 2) return null;

    const partialCurve = new THREE.CatmullRomCurve3(partial);
    return new THREE.TubeGeometry(partialCurve, Math.max(drawPoints - 1, 1), LINE_RADIUS, LINE_SEGMENTS, false);
  }, [posA, posB, clampedProgress]);

  if (!geometry || clampedProgress <= 0) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#43A047"
        emissive="#2E7D32"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

// Glowing sphere at the current navigation head
function NavigationHead({ position }) {
  if (!position) return null;
  const [x, , z] = position;
  return (
    <group position={[x, PATH_Y + 0.05, z]}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#76FF03"
          emissive="#76FF03"
          emissiveIntensity={1.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.22, 24]} />
        <meshStandardMaterial
          color="#76FF03"
          emissive="#76FF03"
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          side={2}
        />
      </mesh>
    </group>
  );
}

export default function NavigationPath({ path, cities, animProgress }) {
  if (!path || path.length < 2) return null;

  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const segmentProgress = Math.max(0, Math.min(1, animProgress - i));
    segments.push({
      id:       `${path[i]}-${path[i + 1]}`,
      posA:     cities[path[i]].position,
      posB:     cities[path[i + 1]].position,
      progress: segmentProgress,
    });
  }

  // The current head position interpolates along the current active segment
  const activeIdx = Math.min(Math.floor(animProgress), path.length - 2);
  const segFrac   = animProgress - activeIdx;
  const headPos   = useMemo(() => {
    if (animProgress >= path.length - 1) return cities[path[path.length - 1]].position;
    const a = new THREE.Vector3(...cities[path[activeIdx]].position);
    const b = new THREE.Vector3(...cities[path[activeIdx + 1]].position);
    return a.lerp(b, Math.max(0, Math.min(1, segFrac))).toArray();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animProgress, path]);

  return (
    <group>
      {segments.map(({ id, posA, posB, progress }) => (
        <PathSegment key={id} posA={posA} posB={posB} progress={progress} />
      ))}
      {animProgress > 0 && animProgress < path.length - 1 + 0.05 && (
        <NavigationHead position={headPos} />
      )}
    </group>
  );
}
