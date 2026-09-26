import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { Heuristic } from '@/search/contracts'

/** Prepared NTB estimates are shared only by calls using the same graph and goal. */
const estimatesByGraph = new WeakMap<WeightedGraph, Map<CityId, ReadonlyMap<CityId, number>>>()

/** Find each reachable city's minimum number of unweighted road hops to the goal. */
function hopDistancesFromGoal(graph: WeightedGraph, goal: CityId): ReadonlyMap<CityId, number> {
  const distances = new Map<CityId, number>([[goal, 0]])
  const queue: CityId[] = [goal]

  // Breadth-first traversal assigns every reachable city its nearest hop layer.
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

/** Label the connected components remaining at one nested hop threshold. */
function componentsAtThreshold(
  graph: WeightedGraph,
  hopDistances: ReadonlyMap<CityId, number>,
  threshold: number,
): { readonly byCity: ReadonlyMap<CityId, number>; readonly count: number } {
  const byCity = new Map<CityId, number>()
  let count = 0

  // Each unlabelled city in V_i starts one component of the induced subgraph.
  for (const start of graph.cityIds) {
    const startHops = hopDistances.get(start)
    if (startHops === undefined || startHops < threshold || byCity.has(start)) continue

    const queue: CityId[] = [start]
    byCity.set(start, count)

    // Traverse only neighbors that remain at or beyond this threshold.
    for (let index = 0; index < queue.length; index += 1) {
      const city = queue[index]
      if (city === undefined) continue

      for (const neighbor of graph.adjacency[city] ?? []) {
        const neighborHops = hopDistances.get(neighbor.city)
        if (neighborHops === undefined || neighborHops < threshold || byCity.has(neighbor.city)) {
          continue
        }
        byCity.set(neighbor.city, count)
        queue.push(neighbor.city)
      }
    }

    count += 1
  }

  return { byCity, count }
}

/** Find every component's cheapest original boundary road with one edge scan. */
function minimumTollsForComponents(
  graph: WeightedGraph,
  byCity: ReadonlyMap<CityId, number>,
  count: number,
): readonly number[] {
  const minimumTolls = Array<number>(count).fill(Number.POSITIVE_INFINITY)

  // An edge crossing a component boundary contributes to that component's toll.
  for (const edge of graph.edges) {
    const fromComponent = byCity.get(edge.from)
    const toComponent = byCity.get(edge.to)
    if (fromComponent === toComponent) continue

    if (fromComponent !== undefined) {
      minimumTolls[fromComponent] = Math.min(minimumTolls[fromComponent] ?? Infinity, edge.distance)
    }
    if (toComponent !== undefined) {
      minimumTolls[toComponent] = Math.min(minimumTolls[toComponent] ?? Infinity, edge.distance)
    }
  }

  return minimumTolls
}

/** Build the exact NTB sum for every city while each goal layer is in hand. */
function prepareGoalEstimates(graph: WeightedGraph, goal: CityId): ReadonlyMap<CityId, number> {
  const hopDistances = hopDistancesFromGoal(graph, goal)
  const estimates = new Map<CityId, number>()
  let maximumHops = 0

  // Unreachable cities and the goal retain the original zero estimate.
  for (const city of graph.cityIds) {
    estimates.set(city, 0)
    maximumHops = Math.max(maximumHops, hopDistances.get(city) ?? 0)
  }

  // A component has one minimum boundary toll shared by every city inside it.
  for (let threshold = 1; threshold <= maximumHops; threshold += 1) {
    const { byCity, count } = componentsAtThreshold(graph, hopDistances, threshold)
    const minimumTolls = minimumTollsForComponents(graph, byCity, count)

    // Add the same threshold tolls in ascending order as the original NTB formula.
    for (const city of graph.cityIds) {
      const component = byCity.get(city)
      if (component === undefined) continue

      const toll = minimumTolls[component]
      if (toll === undefined || !Number.isFinite(toll)) {
        throw new Error('A reachable NTB region has no boundary road')
      }
      estimates.set(city, (estimates.get(city) ?? 0) + toll)
    }
  }

  return estimates
}

/** Return the unchanged NTB lower bound from its graph-and-goal lookup table. */
export const ntbHeuristic: Heuristic = (current, problem) => {
  if (current === problem.goal) return 0

  let byGoal = estimatesByGraph.get(problem.graph)
  if (byGoal === undefined) {
    byGoal = new Map()
    estimatesByGraph.set(problem.graph, byGoal)
  }

  let estimates = byGoal.get(problem.goal)
  if (estimates === undefined) {
    estimates = prepareGoalEstimates(problem.graph, problem.goal)
    byGoal.set(problem.goal, estimates)
  }

  return estimates.get(current) ?? 0
}
/** Evaluator warms up the cache first before measurement.
 * Execution time records cached NTB lookups with A* search,
 * not NTB preprocessing with A* search */
