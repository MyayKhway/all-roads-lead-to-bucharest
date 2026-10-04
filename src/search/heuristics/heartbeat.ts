/**
 * Heartbeat heuristic — an ALT-style (landmarks + triangle inequality) estimate.
 *
 * The road network is read as a simplified cardiovascular system: a small set
 * of far-apart "landmark" cities act as reference organs whose true shortest
 * road distance to every other city is measured once, in advance. During a
 * search, the remaining distance from any city to the goal is estimated from
 * how those pre-measured distances shift — a pressure differential rather
 * than a geometric guess.
 *
 * This intentionally does not use Euclidean or Manhattan distance over the
 * 3D scene coordinates in `src/data/cities.ts` — those are presentation
 * coordinates, not road distances (see docs/search-evaluation/README.md,
 * "Use the canonical graph"). Every number this heuristic touches comes from
 * `problem.graph`, the same road-distance graph the algorithm's g(n) uses.
 *
 * h(n) = max over landmarks L of |dist(L, goal) - dist(L, n)|
 *
 * For an undirected graph, the triangle inequality gives, for every landmark L:
 *   dist(L, goal) <= dist(L, n) + dist(n, goal)
 *   dist(L, n)    <= dist(L, goal) + dist(n, goal)
 * so |dist(L, goal) - dist(L, n)| <= dist(n, goal) = h*(n) for every L, and
 * therefore also for the max over all landmarks. The heuristic is admissible.
 * It is also consistent: moving from n to neighbor m along an edge of cost w
 * changes each landmark term by at most w, so h(n) <= w + h(m).
 *
 * Landmark distances are measured once per graph (memoized) rather than on
 * every heuristic call, so a search's timed work is a handful of lookups and
 * subtractions, not a live shortest-path search.
 */

import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { Heuristic } from '@/search/contracts'

const LANDMARK_COUNT = 3

/** Plain single-source shortest-path distances over road costs (km). Preprocessing only. */
function distancesFrom(graph: WeightedGraph, source: CityId): ReadonlyMap<CityId, number> {
  const unvisited = new Set<CityId>(graph.cityIds)
  const bestCost = new Map<CityId, number>()

  for (const city of graph.cityIds) {
    bestCost.set(city, Number.POSITIVE_INFINITY)
  }
  bestCost.set(source, 0)

  while (unvisited.size > 0) {
    let current: CityId | undefined
    let currentCost = Number.POSITIVE_INFINITY

    for (const city of unvisited) {
      const cost = bestCost.get(city) ?? Number.POSITIVE_INFINITY
      if (cost < currentCost) {
        current = city
        currentCost = cost
      }
    }

    if (current === undefined || !Number.isFinite(currentCost)) {
      break // remaining cities are unreachable from the source
    }

    unvisited.delete(current)

    for (const neighbor of graph.adjacency[current] ?? []) {
      if (!unvisited.has(neighbor.city)) continue
      const candidate = currentCost + neighbor.distance
      if (candidate < (bestCost.get(neighbor.city) ?? Number.POSITIVE_INFINITY)) {
        bestCost.set(neighbor.city, candidate)
      }
    }
  }

  return bestCost
}

/**
 * Farthest-point (maxmin) landmark selection: start from an arbitrary city,
 * then repeatedly add whichever city is currently farthest from every
 * already-chosen landmark. This spreads landmarks across the graph, which
 * gives the triangle-inequality bound more room to be informative.
 */
function selectLandmarks(graph: WeightedGraph, count: number): readonly CityId[] {
  const [seed] = graph.cityIds
  if (seed === undefined) return []

  const landmarks: CityId[] = [seed]
  const minDistanceToLandmarks = new Map<CityId, number>(
    graph.cityIds.map((city) => [city, Number.POSITIVE_INFINITY]),
  )

  for (let i = 0; i < count; i++) {
    const latest = landmarks[landmarks.length - 1]
    if (latest === undefined) break

    const distancesFromLatest = distancesFrom(graph, latest)
    for (const city of graph.cityIds) {
      const previous = minDistanceToLandmarks.get(city) ?? Number.POSITIVE_INFINITY
      const toLatest = distancesFromLatest.get(city) ?? Number.POSITIVE_INFINITY
      minDistanceToLandmarks.set(city, Math.min(previous, toLatest))
    }

    if (landmarks.length >= count) break

    let farthestCity: CityId | undefined
    let farthestDistance = -1
    for (const city of graph.cityIds) {
      if (landmarks.includes(city)) continue
      const distance = minDistanceToLandmarks.get(city) ?? -1
      if (Number.isFinite(distance) && distance > farthestDistance) {
        farthestDistance = distance
        farthestCity = city
      }
    }

    if (farthestCity === undefined) break // graph exhausted or disconnected
    landmarks.push(farthestCity)
  }

  return landmarks
}

interface LandmarkIndex {
  readonly landmarks: readonly CityId[]
  readonly distanceFromLandmark: ReadonlyMap<CityId, ReadonlyMap<CityId, number>>
}

const landmarkIndexCache = new WeakMap<WeightedGraph, LandmarkIndex>()

function getLandmarkIndex(graph: WeightedGraph): LandmarkIndex {
  const cached = landmarkIndexCache.get(graph)
  if (cached !== undefined) return cached

  const landmarks = selectLandmarks(graph, LANDMARK_COUNT)
  const distanceFromLandmark = new Map<CityId, ReadonlyMap<CityId, number>>()
  for (const landmark of landmarks) {
    distanceFromLandmark.set(landmark, distancesFrom(graph, landmark))
  }

  const index: LandmarkIndex = { landmarks, distanceFromLandmark }
  landmarkIndexCache.set(graph, index)
  return index
}

export const heartbeatHeuristic: Heuristic = (current, problem) => {
  const { graph, goal } = problem
  if (current === goal) return 0

  const { landmarks, distanceFromLandmark } = getLandmarkIndex(graph)

  let best = 0
  for (const landmark of landmarks) {
    const distances = distanceFromLandmark.get(landmark)
    const toGoal = distances?.get(goal)
    const toCurrent = distances?.get(current)
    if (toGoal === undefined || toCurrent === undefined) continue
    if (!Number.isFinite(toGoal) || !Number.isFinite(toCurrent)) continue

    const estimate = Math.abs(toGoal - toCurrent)
    if (estimate > best) best = estimate
  }

  return best
}
