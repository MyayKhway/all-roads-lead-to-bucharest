/**
 * RomaniaMap — the main 3D scene.
 */

import type { CityMap } from '../data/cities'
import type { Edge } from '../data/graph'
import { SCENE_COLOR } from '../lib/theme'
import type { RouteRun } from '../search/presentation'
import type { CityStatus } from './CityNode'

import CityNode from './CityNode'
import NavigationCamera from './NavigationCamera'
import NavigationPath from './NavigationPath'
import type { RoadStatus } from './Road'
import Road from './Road'
import Scenery from './Scenery'
import Terrain from './Terrain'

interface RomaniaMapProps {
  cities: CityMap
  edges: Edge[]
  pathResult: RouteRun | null
  animProgress: number
  isAnimating: boolean
  onCityClick: (cityId: string) => void
}

function getCityStatus(cityId: string, pathResult: RouteRun | null): CityStatus {
  if (!pathResult) return 'normal'
  const { path, expandedOrder } = pathResult
  if (cityId === path[0]) return 'start'
  if (cityId === path[path.length - 1]) return 'goal'
  if (path.some((step) => step === cityId)) return 'path'
  if (expandedOrder.some((expanded) => expanded === cityId)) return 'explored'
  return 'normal'
}

function getEdgeStatus(fromId: string, toId: string, pathResult: RouteRun | null): RoadStatus {
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
      {/* Atmosphere — soft daylight with a light haze for depth */}
      <color attach="background" args={[SCENE_COLOR.sky]} />
      <fog attach="fog" args={[SCENE_COLOR.fog, 24, 52]} />

      {/* Lighting: sky/ground fill + a warm sun casting soft shadows */}
      <hemisphereLight args={[SCENE_COLOR.hemiSky, SCENE_COLOR.hemiGround, 1.15]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[9, 16, 7]}
        intensity={2.5}
        color={SCENE_COLOR.sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={3}
      />

      {/* Ground, relief and vegetation (decorative only) */}
      <Terrain />
      <Scenery />

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
