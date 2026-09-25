import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { Heuristic } from '@/search/contracts'

/** Find each city's minimum number of unweighted road hops to the goal. */
function hopDistancesFromGoal(graph: WeightedGraph, goal: CityId): ReadonlyMap<CityId, number> {
  const distances = new Map<CityId, number>([[goal, 0]])
  const queue: CityId[] = [goal]

  // Breadth-first traversal assigns each city its nearest hop layer.
  for (let index = 0; index < queue.length; index += 1) {
    const city = queue[index]
    if (city === undefined) continue
    const nextDistance = (distances.get(city) ?? 0) + 1

    for (const neighbor of graph.adjacency[city] ?? []) {
      if (distances.has(neighbor.city)) continue
      distances.set(neighbor.city, nextDistance)
      queue.push(neighbor.city)
    }
  }

  return distances
}

/** Find the component containing `current` after removing cities below one hop threshold. */
function regionAtThreshold(
  graph: WeightedGraph,
  current: CityId,
  threshold: number,
  hopDistances: ReadonlyMap<CityId, number>,
): ReadonlySet<CityId> {
  const region = new Set<CityId>([current])
  const queue: CityId[] = [current]

  // Only roads whose other endpoint remains in the induced subgraph can grow the region.
  for (let index = 0; index < queue.length; index += 1) {
    const city = queue[index]
    if (city === undefined) continue

    for (const neighbor of graph.adjacency[city] ?? []) {
      const neighborHops = hopDistances.get(neighbor.city)
      if (neighborHops === undefined || neighborHops < threshold || region.has(neighbor.city)) {
        continue
      }
      region.add(neighbor.city)
      queue.push(neighbor.city)
    }
  }

  return region
}

/** Return the cheapest original road with exactly one endpoint inside a region. */
function minimumBoundaryCost(graph: WeightedGraph, region: ReadonlySet<CityId>): number {
  let minimum = Number.POSITIVE_INFINITY

  // Scan the original edges so the toll uses road weights, never hop counts or coordinates.
  for (const edge of graph.edges) {
    if (region.has(edge.from) !== region.has(edge.to)) {
      minimum = Math.min(minimum, edge.distance)
    }
  }

  if (!Number.isFinite(minimum)) {
    throw new Error('A reachable NTB region has no boundary road')
  }
  return minimum
}

/** Sum minimum road costs across the nested hop-layer barriers around `current`. */
export const ntbHeuristic: Heuristic = (current, problem) => {
  if (current === problem.goal) return 0

  const hopDistances = hopDistancesFromGoal(problem.graph, problem.goal)
  const currentHops = hopDistances.get(current)

  // A disconnected city has no finite route to the goal; zero remains a safe estimate.
  if (currentHops === undefined) return 0

  let estimate = 0

  // Each threshold creates a distinct barrier that every goal-bound route must cross.
  for (let threshold = 1; threshold <= currentHops; threshold += 1) {
    const region = regionAtThreshold(problem.graph, current, threshold, hopDistances)
    estimate += minimumBoundaryCost(problem.graph, region)
  }

  return estimate
}
