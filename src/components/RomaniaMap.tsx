/**
 * RomaniaMap — the main 3D scene.
 */

import { useMemo } from 'react'
import type { CityMap } from '../data/cities'
import { isCityId } from '../data/cityIds'
import type { Edge } from '../data/graph'
import { romaniaGraph } from '../data/graph'
import { type Phase, roadKey, type SearchView } from '../lib/searchView'
import { SCENE_COLOR } from '../lib/theme'
import { explainNtb } from '../search/heuristics/ntbBreakdown'
import type { RouteRun } from '../search/presentation'
import type { CityStatus } from './CityNode'

import CityNode from './CityNode'
import NavigationCamera from './NavigationCamera'
import NavigationPath from './NavigationPath'
import NtbRings from './NtbRings'
import type { RoadStatus } from './Road'
import Road from './Road'
import Scenery from './Scenery'
import Terrain from './Terrain'

interface RomaniaMapProps {
  cities: CityMap
  edges: Edge[]
  pathResult: RouteRun | null
  phase: Phase
  view: SearchView
  animProgress: number
  onCityClick: (cityId: string) => void
}

function getCityStatus(
  cityId: string,
  pathResult: RouteRun | null,
  phase: Phase,
  view: SearchView,
): CityStatus {
  if (!pathResult) return 'normal'
  const { path } = pathResult
  if (cityId === path[0]) return 'start'
  if (cityId === path[path.length - 1]) return 'goal'
  // While replaying, only what the search has seen so far is shown.
  if (phase === 'searching') {
    if (cityId === view.current) return 'current'
    if (view.frontier.has(cityId)) return 'frontier'
    return view.explored.includes(cityId) ? 'explored' : 'normal'
  }
  if (path.some((step) => step === cityId)) return 'path'
  if (view.explored.includes(cityId)) return 'explored'
  return 'normal'
}

function getEdgeStatus(
  fromId: string,
  toId: string,
  pathResult: RouteRun | null,
  phase: Phase,
  view: SearchView,
  tollRoads: ReadonlySet<string>,
): RoadStatus {
  if (!pathResult) return 'normal'
  if (tollRoads.has(roadKey(fromId, toId))) return 'toll'
  const { path } = pathResult
  if (phase !== 'searching') {
    for (let i = 0; i < path.length - 1; i++) {
      if (
        (path[i] === fromId && path[i + 1] === toId) ||
        (path[i] === toId && path[i + 1] === fromId)
      )
        return 'path'
    }
  }
  return view.touchedRoads.has(roadKey(fromId, toId)) ? 'explored' : 'normal'
}

export default function RomaniaMap({
  cities,
  edges,
  pathResult,
  phase,
  view,
  animProgress,
  onCityClick,
}: RomaniaMapProps) {
  // The route and camera flight only start once the replay has finished.
  const route = pathResult && phase !== 'searching' ? pathResult.path : null
  const goal = pathResult?.path.at(-1)

  // While A* + NTB replays, show its rings and the tolls behind the current city's h.
  const showRings = phase === 'searching' && pathResult?.variant.id === 'astar-ntb'
  const tollRoads = useMemo(() => {
    const current = view.current
    if (!showRings || !goal || !current || !isCityId(current) || current === goal) {
      return new Set<string>()
    }
    const breakdown = explainNtb(romaniaGraph, current, goal)
    return new Set(breakdown.tolls.map((t) => roadKey(t.road.from, t.road.to)))
  }, [showRings, goal, view.current])

  return (
    <>
      {/* Atmosphere — soft daylight with a light haze for depth */}
      <color attach="background" args={[SCENE_COLOR.sky]} />
      <fog attach="fog" args={[SCENE_COLOR.fog, 40, 90]} />

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

      {showRings && goal && <NtbRings cities={cities} goal={goal} />}

      {/* Roads */}
      {edges.map(({ from, to }) => (
        <Road
          key={`${from}-${to}`}
          from={cities[from]?.position ?? [0, 0, 0]}
          to={cities[to]?.position ?? [0, 0, 0]}
          status={getEdgeStatus(from, to, pathResult, phase, view, tollRoads)}
        />
      ))}

      {/* City nodes */}
      {Object.values(cities).map((city) => (
        <CityNode
          key={city.id}
          city={city}
          status={getCityStatus(city.id, pathResult, phase, view)}
          onClick={onCityClick}
        />
      ))}

      {/* Animated navigation path */}
      {route && <NavigationPath path={route} cities={cities} animProgress={animProgress} />}

      {/* Camera */}
      <NavigationCamera
        path={route}
        cities={cities}
        animProgress={animProgress}
        isAnimating={phase === 'navigating'}
      />
    </>
  )
}
