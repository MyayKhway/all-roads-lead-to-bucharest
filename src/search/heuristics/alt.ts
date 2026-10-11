import type { CityId } from '@/data/cityIds'
import type { AdjacencyMap, WeightedGraph } from '@/data/graph'
import type { Heuristic } from '@/search/contracts'

interface LandmarkDistances {
  /** Distances from the landmark to each city. */
  readonly fromLandmark: ReadonlyMap<CityId, number>
  /** Distances from each city to the landmark. */
  readonly toLandmark: ReadonlyMap<CityId, number>
}

/** Computes single-source shortest-path distances with Dijkstra's algorithm. */
function shortestDistances(
  graph: AdjacencyMap,
  cityIds: readonly CityId[],
  source: CityId,
): ReadonlyMap<CityId, number> {
  const distances = new Map<CityId, number>()
  const unsettled = new Set(cityIds)

  for (const city of cityIds) {
    distances.set(city, Number.POSITIVE_INFINITY)
  }
  distances.set(source, 0)

  while (unsettled.size > 0) {
    let current: CityId | undefined
    let currentDistance = Number.POSITIVE_INFINITY

    for (const city of unsettled) {
      const distance = distances.get(city) ?? Number.POSITIVE_INFINITY
      if (distance < currentDistance) {
        current = city
        currentDistance = distance
      }
    }

    if (current === undefined) {
      break
    }
    unsettled.delete(current)

    for (const neighbor of graph[current] ?? []) {
      if (!unsettled.has(neighbor.city)) {
        continue
      }
      const candidate = currentDistance + neighbor.distance
      if (candidate < (distances.get(neighbor.city) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.city, candidate)
      }
    }
  }

  return distances
}

/** Builds a reversed adjacency map so directed ALT bounds are also supported. */
function reverseAdjacency(graph: WeightedGraph): AdjacencyMap {
  const reversed: Record<string, { city: CityId; distance: number }[]> = Object.fromEntries(
    graph.cityIds.map((city) => [city, []]),
  )

  for (const from of graph.cityIds) {
    for (const neighbor of graph.adjacency[from] ?? []) {
      const incoming = reversed[neighbor.city]
      if (incoming === undefined) {
        throw new RangeError(`Graph contains an unknown city: ${neighbor.city}`)
      }
      incoming.push({ city: from, distance: neighbor.distance })
    }
  }

  return reversed
}

/** Rejects malformed graph data before it can invalidate shortest-path bounds. */
function validateGraph(graph: WeightedGraph): void {
  if (graph.cityIds.length === 0 || new Set(graph.cityIds).size !== graph.cityIds.length) {
    throw new RangeError('ALT requires a graph with unique city IDs')
  }

  const cityIds = new Set(graph.cityIds)
  for (const city of graph.cityIds) {
    for (const neighbor of graph.adjacency[city] ?? []) {
      if (!cityIds.has(neighbor.city)) {
        throw new RangeError(`Graph contains an unknown city: ${neighbor.city}`)
      }
      if (!Number.isFinite(neighbor.distance) || neighbor.distance < 0) {
        throw new RangeError('ALT requires finite, non-negative edge distances')
      }
    }
  }
}

/**
 * Creates an ALT (A*, landmarks, triangle inequality) heuristic for a weighted graph.
 * Landmark distance tables are computed once when the heuristic is created.
 *
 * For directed graphs, both triangle-inequality bounds are used:
 * d(L, goal) - d(L, current) and d(current, L) - d(goal, L).
 */
export function createAltHeuristic(
  graph: WeightedGraph,
  options: { readonly landmarkCount?: number } = {},
): Heuristic {
  const landmarkCount = options.landmarkCount ?? Math.min(4, graph.cityIds.length)

  if (!Number.isSafeInteger(landmarkCount) || landmarkCount < 1) {
    throw new RangeError('ALT landmarkCount must be a positive integer')
  }
  if (landmarkCount > graph.cityIds.length) {
    throw new RangeError('ALT landmarkCount must not exceed the number of graph cities')
  }

  validateGraph(graph)
  const reverse = reverseAdjacency(graph)
  const forward = graph.adjacency
  const firstLandmark = graph.cityIds[0]
  if (firstLandmark === undefined) {
    throw new RangeError('ALT requires a graph with at least one city')
  }

  const landmarks: CityId[] = [firstLandmark]
  const landmarkTables: LandmarkDistances[] = []
  const forwardDistances = new Map<CityId, ReadonlyMap<CityId, number>>([
    [firstLandmark, shortestDistances(forward, graph.cityIds, firstLandmark)],
  ])

  // Pick the city farthest from its nearest selected landmark, breaking ties by graph order.
  while (landmarks.length < landmarkCount) {
    let farthest: CityId | undefined
    let farthestDistance = Number.NEGATIVE_INFINITY

    for (const city of graph.cityIds) {
      if (landmarks.includes(city)) {
        continue
      }

      let nearestLandmarkDistance = Number.POSITIVE_INFINITY
      for (const landmark of landmarks) {
        const distance = forwardDistances.get(landmark)?.get(city) ?? Number.POSITIVE_INFINITY
        nearestLandmarkDistance = Math.min(nearestLandmarkDistance, distance)
      }
      if (nearestLandmarkDistance > farthestDistance) {
        farthest = city
        farthestDistance = nearestLandmarkDistance
      }
    }

    if (farthest === undefined) {
      break
    }
    landmarks.push(farthest)
    forwardDistances.set(farthest, shortestDistances(forward, graph.cityIds, farthest))
  }

  for (const landmark of landmarks) {
    const fromLandmark = forwardDistances.get(landmark)
    if (fromLandmark === undefined) {
      throw new Error(`Missing ALT distance table for landmark: ${landmark}`)
    }
    landmarkTables.push({
      fromLandmark,
      toLandmark: shortestDistances(reverse, graph.cityIds, landmark),
    })
  }

  return (current, problem) => {
    if (problem.graph !== graph) {
      throw new RangeError('ALT heuristic must be used with the graph it was created for')
    }

    let estimate = 0
    for (const table of landmarkTables) {
      const fromCurrent = table.fromLandmark.get(current)
      const fromGoal = table.fromLandmark.get(problem.goal)
      // A landmark in another component bounds nothing, and A* requires finite estimates.
      if (
        fromCurrent !== undefined &&
        fromGoal !== undefined &&
        Number.isFinite(fromCurrent) &&
        Number.isFinite(fromGoal)
      ) {
        estimate = Math.max(estimate, fromGoal - fromCurrent)
      }

      const toCurrent = table.toLandmark.get(current)
      const toGoal = table.toLandmark.get(problem.goal)
      if (
        toCurrent !== undefined &&
        toGoal !== undefined &&
        Number.isFinite(toCurrent) &&
        Number.isFinite(toGoal)
      ) {
        estimate = Math.max(estimate, toCurrent - toGoal)
      }
    }

    return Math.max(0, estimate)
  }
}
