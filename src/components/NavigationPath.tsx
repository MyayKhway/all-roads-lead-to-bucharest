/**
 * NavigationPath — animates the green route line step-by-step.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { CityMap, Position3D } from '../data/cities'
import { positionOf } from '../data/cities'

interface NavigationPathProps {
  path: string[]
  cities: CityMap
  animProgress: number
}

const LINE_RADIUS = 0.045
const LINE_SEGMENTS = 12
const PATH_Y = 0.12

function makeSegmentCurve(posA: Position3D, posB: Position3D): THREE.CatmullRomCurve3 {
  const a = new THREE.Vector3(posA[0], PATH_Y, posA[2])
  const b = new THREE.Vector3(posB[0], PATH_Y, posB[2])
  const mid = a.clone().lerp(b, 0.5)
  mid.y = PATH_Y + 0.15
  return new THREE.CatmullRomCurve3([a, mid, b])
}

// ─── Single animated segment ──────────────────────────────────────────────────

interface PathSegmentProps {
  posA: Position3D
  posB: Position3D
  progress: number // 0..1 for this segment
}

function PathSegment({ posA, posB, progress }: PathSegmentProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress))

  const geometry = useMemo<THREE.TubeGeometry | null>(() => {
    if (clampedProgress <= 0) return null
    const curve = makeSegmentCurve(posA, posB)
    const totalPoints = 20
    const drawPoints = Math.max(2, Math.round(clampedProgress * totalPoints))
    const points = curve.getPoints(totalPoints)
    const partial = points.slice(0, drawPoints)
    if (partial.length < 2) return null
    const partialCurve = new THREE.CatmullRomCurve3(partial)
    return new THREE.TubeGeometry(
      partialCurve,
      Math.max(drawPoints - 1, 1),
      LINE_RADIUS,
      LINE_SEGMENTS,
      false,
    )
  }, [posA, posB, clampedProgress])

  if (!geometry || clampedProgress <= 0) return null

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
  )
}

// ─── Glowing navigation head ──────────────────────────────────────────────────

interface NavigationHeadProps {
  position: Position3D
}

function NavigationHead({ position }: NavigationHeadProps) {
  const [x, , z] = position
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
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.22, 24]} />
        <meshStandardMaterial
          color="#76FF03"
          emissive="#76FF03"
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NavigationPath({ path, cities, animProgress }: NavigationPathProps) {
  const isDrawable = path.length >= 2

  // Computed unconditionally: a hook must not sit behind an early return.
  const headPos = useMemo<Position3D | null>(() => {
    if (!isDrawable) return null

    if (animProgress >= path.length - 1) {
      return positionOf(cities, path[path.length - 1]) ?? null
    }

    const activeIdx = Math.min(Math.floor(animProgress), path.length - 2)
    const segFrac = animProgress - activeIdx
    const fromPos = positionOf(cities, path[activeIdx])
    const toPos = positionOf(cities, path[activeIdx + 1])
    if (fromPos === undefined || toPos === undefined) return null

    const lerped = new THREE.Vector3(...fromPos).lerp(
      new THREE.Vector3(...toPos),
      Math.max(0, Math.min(1, segFrac)),
    )
    return [lerped.x, lerped.y, lerped.z]
  }, [isDrawable, path, cities, animProgress])

  if (!isDrawable) return null

  const segments: { id: string; posA: Position3D; posB: Position3D; progress: number }[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const posA = positionOf(cities, path[i])
    const posB = positionOf(cities, path[i + 1])
    if (posA === undefined || posB === undefined) continue
    segments.push({
      id: `${path[i]}-${path[i + 1]}`,
      posA,
      posB,
      progress: Math.max(0, Math.min(1, animProgress - i)),
    })
  }

  return (
    <group>
      {segments.map(({ id, posA, posB, progress }) => (
        <PathSegment key={id} posA={posA} posB={posB} progress={progress} />
      ))}
      {headPos !== null && animProgress > 0 && animProgress < path.length - 1 + 0.05 && (
        <NavigationHead position={headPos} />
      )}
    </group>
  )
}
