import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import { executeSearch } from '@/search/evaluation/execution'
import type { SearchMetrics } from '@/search/evaluation/metrics'
import type { SearchVariant } from '@/search/variant'

/** One variant's answer for the UI: the route plus how much work finding it took. */
export interface RouteRun {
  readonly variant: SearchVariant
  readonly path: readonly CityId[]
  readonly pathCost: number
  /** Cities in the order the search expanded them. */
  readonly expandedOrder: readonly CityId[]
  readonly metrics: SearchMetrics
}

/** Runs one registered variant on the Romania map; null when the goal is unreachable. */
export function runRoute(variant: SearchVariant, start: CityId, goal: CityId): RouteRun | null {
  const expandedOrder: CityId[] = []
  const { result, metrics } = executeSearch({
    problem: { graph: romaniaGraph, start, goal },
    algorithm: variant.algorithm,
    ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    eventListener: (event) => {
      if (event.type === 'node-expanded') expandedOrder.push(event.city)
    },
  })

  if (result.status !== 'success') return null
  return { variant, path: result.path, pathCost: result.pathCost, expandedOrder, metrics }
}
