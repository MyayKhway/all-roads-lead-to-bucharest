/**
 * RomaniaMap — the main 3D scene.
 */

import type { AstarResult } from '../algorithms/astar'
import type { CityMap } from '../data/cities'
import type { Edge } from '../data/graph'
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
      {/* Lighting */}
      <ambientLight intensity={0.7} color="#FFF8E7" />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.1}
        color="#FFF5E0"
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
      <directionalLight position={[-5, 8, -4]} intensity={0.35} color="#D4E8FF" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#FCF0AF" roughness={0.95} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#F5E88A" roughness={0.9} metalness={0} />
      </mesh>

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
