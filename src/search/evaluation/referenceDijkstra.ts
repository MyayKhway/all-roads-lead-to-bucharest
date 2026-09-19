import type { CityId } from '@/data/cityIds'
import type { SearchAlgorithm } from '@/search/contracts'

/** Reconstructs a start-to-goal path from predecessor links recorded toward the start. */
function reconstructPath(
  previousCity: ReadonlyMap<CityId, CityId>,
  start: CityId,
  goal: CityId,
): readonly CityId[] | null {
  const reversedPath: CityId[] = [goal]
  let current = goal

  while (current !== start) {
    const previous = previousCity.get(current)
    if (previous === undefined) {
      return null
    }

    reversedPath.push(previous)
    current = previous
  }

  return reversedPath.reverse()
}

/**
 * Stable correctness oracle for shortest-path cost comparisons.
 * It favors straightforward logic over candidate-algorithm performance.
 */
export const referenceDijkstra: SearchAlgorithm = (problem) => {
  const { graph, start, goal } = problem
  const unvisited = new Set(graph.cityIds)
  const bestCost = new Map<CityId, number>()
  const previousCity = new Map<CityId, CityId>()

  for (const city of graph.cityIds) {
    bestCost.set(city, Number.POSITIVE_INFINITY)
  }
  bestCost.set(start, 0)

  while (unvisited.size > 0) {
    let current: CityId | undefined
    let currentCost = Number.POSITIVE_INFINITY

    // Select the unsettled city with the cheapest known route.
    for (const city of unvisited) {
      const cityCost = bestCost.get(city) ?? Number.POSITIVE_INFINITY
      if (cityCost < currentCost) {
        current = city
        currentCost = cityCost
      }
    }

    // No finite unsettled city remains, so the goal is disconnected.
    if (current === undefined || !Number.isFinite(currentCost)) {
      return {
        status: 'failure',
        reason: 'unreachable',
      }
    }

    if (current === goal) {
      const path = reconstructPath(previousCity, start, goal)
      if (path === null) {
        return {
          status: 'failure',
          reason: 'unreachable',
        }
      }

      return {
        status: 'success',
        path,
        pathCost: currentCost,
      }
    }

    unvisited.delete(current)

    for (const neighbor of graph.adjacency[current] ?? []) {
      if (!unvisited.has(neighbor.city)) {
        continue
      }

      const candidateCost = currentCost + neighbor.distance
      const knownCost = bestCost.get(neighbor.city) ?? Number.POSITIVE_INFINITY

      // Remember only a strictly cheaper route so equal-cost ties stay deterministic.
      if (candidateCost < knownCost) {
        bestCost.set(neighbor.city, candidateCost)
        previousCity.set(neighbor.city, current)
      }
    }
  }

  return {
    status: 'failure',
    reason: 'unreachable',
  }
}
