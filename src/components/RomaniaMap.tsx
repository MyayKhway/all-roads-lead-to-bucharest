/**
 * RomaniaMap — the main 3D scene.
 */

import { Grid } from '@react-three/drei'
import type { AstarResult } from '../algorithms/astar'
import type { CityMap } from '../data/cities'
import type { Edge } from '../data/graph'
import { COLOR } from '../lib/theme'
import type { CityStatus } from './CityNode'

import CityNode from './CityNode'
import NavigationCamera from './NavigationCamera'
import NavigationPath from './NavigationPath'
import type { RoadStatus } from './Road'
import Road from './Road'

interface RomaniaMapProps {
  cities: CityMap
  edges: Edge[]
  pathResult: AstarResult | null
  animProgress: number
  isAnimating: boolean
  onCityClick: (cityId: string) => void
}

function getCityStatus(cityId: string, pathResult: AstarResult | null): CityStatus {
  if (!pathResult) return 'normal'
  const { path, exploredOrder } = pathResult
  if (cityId === path[0]) return 'start'
  if (cityId === path[path.length - 1]) return 'goal'
  if (path.includes(cityId)) return 'path'
  if (exploredOrder.includes(cityId)) return 'explored'
  return 'normal'
}

function getEdgeStatus(fromId: string, toId: string, pathResult: AstarResult | null): RoadStatus {
  if (!pathResult) return 'normal'
  const { path } = pathResult
  for (let i = 0; i < path.length - 1; i++) {
    if (
      (path[i] === fromId && path[i + 1] === toId) ||
      (path[i] === toId && path[i + 1] === fromId)
    )
      return 'path'
  }
  return 'normal'
}

export default function RomaniaMap({
  cities,
  edges,
  pathResult,
  animProgress,
  isAnimating,
  onCityClick,
}: RomaniaMapProps) {
  return (
    <>
      {/* Atmosphere */}
      <color attach="background" args={[COLOR.bgScene]} />
      <fog attach="fog" args={[COLOR.bgSceneFar, 30, 64]} />

      {/* Lighting */}
      <ambientLight intensity={0.95} color="#c3d3e0" />
      <directionalLight
        position={[8, 15, 6]}
        intensity={1.8}
        color="#ffe9c2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-6, 8, -5]} intensity={0.55} color="#7fa0c9" />
      <pointLight position={[0, 3, 0]} intensity={0.35} color={COLOR.amber} distance={14} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={COLOR.bgScene} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[21, 15]} />
        <meshStandardMaterial color="#30433a" roughness={0.95} metalness={0} />
      </mesh>
      <Grid
        position={[0, -0.005, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#425a4d"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#5c7c6a"
        fadeDistance={38}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid
      />

      {/* Roads */}
      {edges.map(({ from, to }) => (
        <Road
          key={`${from}-${to}`}
          from={cities[from]?.position ?? [0, 0, 0]}
          to={cities[to]?.position ?? [0, 0, 0]}
          status={getEdgeStatus(from, to, pathResult)}
        />
      ))}

      {/* City nodes */}
      {Object.values(cities).map((city) => (
        <CityNode
          key={city.id}
          city={city}
          status={getCityStatus(city.id, pathResult)}
          onClick={onCityClick}
        />
      ))}

      {/* Animated navigation path */}
      {pathResult && (
        <NavigationPath path={pathResult.path} cities={cities} animProgress={animProgress} />
      )}

      {/* Camera */}
      <NavigationCamera
        path={pathResult?.path ?? null}
        cities={cities}
        animProgress={animProgress}
        isAnimating={isAnimating}
      />
    </>
  )
}
