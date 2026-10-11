import type { CityId } from '@/data/cityIds'
import type { Edge, WeightedGraph } from '@/data/graph'
import { componentsAtThreshold, hopDistancesFromGoal } from '@/search/heuristics/ntb'

/** The cheapest road out of one nested region around the goal. */
export interface NtbToll {
  /** Cities at least this many roads from the goal form the region being left. */
  readonly threshold: number
  readonly road: Edge
}

export interface NtbBreakdown {
  readonly city: CityId
  readonly goal: CityId
  /** Roads (hops) from every reachable city to the goal. */
  readonly hops: ReadonlyMap<CityId, number>
  /** Tolls in the order a route crosses them: outermost boundary first. */
  readonly tolls: readonly NtbToll[]
  readonly total: number
}

/** Shows which roads make up the NTB estimate for one city, for display only. */
export function explainNtb(graph: WeightedGraph, city: CityId, goal: CityId): NtbBreakdown {
  const hops = hopDistancesFromGoal(graph, goal)
  const cityHops = hops.get(city) ?? 0
  const tolls: NtbToll[] = []

  for (let threshold = cityHops; threshold >= 1; threshold -= 1) {
    const { byCity } = componentsAtThreshold(graph, hops, threshold)
    const region = byCity.get(city)
    let cheapest: Edge | undefined

    // A boundary road has exactly one end inside the city's region.
    for (const edge of graph.edges) {
      const inside = (byCity.get(edge.from) === region) !== (byCity.get(edge.to) === region)
      if (inside && (cheapest === undefined || edge.distance < cheapest.distance)) cheapest = edge
    }
    if (cheapest !== undefined) tolls.push({ threshold, road: cheapest })
  }

  return {
    city,
    goal,
    hops,
    tolls,
    total: tolls.reduce((sum, toll) => sum + toll.road.distance, 0),
  }
}
