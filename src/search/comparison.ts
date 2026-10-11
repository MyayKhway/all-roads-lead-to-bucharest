import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import type { SearchProblem } from '@/search/contracts'
import { measureVariantExecutionTime } from '@/search/evaluation/benchmark/suite'
import type { TimingOptions } from '@/search/evaluation/benchmark/timer'
import { executeSearch } from '@/search/evaluation/execution'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import type { SearchVariant } from '@/search/variant'

/** One variant's row in the comparison view; plain data so it can cross a worker boundary. */
export interface VariantComparison {
  readonly variantId: string
  readonly name: string
  readonly algorithmName: string
  readonly heuristicName: string | null
  /** Null when the variant found no route. */
  readonly pathCost: number | null
  readonly optimal: boolean
  /** Median microseconds per search, measured without diagnostic events. */
  readonly timeUs: number | null
  /** Peak frontier entries plus closed-set entries: the textbook's space measure. */
  readonly memoryEntries: number
  readonly peakFrontierEntries: number
  readonly closedSetEntries: number
  readonly nodesExpanded: number
  readonly nodesGenerated: number
}

export interface RouteComparison {
  readonly start: CityId
  readonly goal: CityId
  /** Shortest road distance from the reference Dijkstra, or null when unreachable. */
  readonly optimalCost: number | null
  readonly rows: readonly VariantComparison[]
}

/** Runs every variant on one pair with the same instrumentation and timing as the benchmark. */
export function compareVariants(
  variants: readonly SearchVariant[],
  start: CityId,
  goal: CityId,
  timingOptions?: TimingOptions,
): RouteComparison {
  const problem: SearchProblem = { graph: romaniaGraph, start, goal }
  const reference = referenceDijkstra(problem, {})
  const optimalCost = reference.status === 'success' ? reference.pathCost : null

  const rows = variants.map((variant): VariantComparison => {
    const { metrics } = executeSearch({
      problem,
      algorithm: variant.algorithm,
      ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    })
    const pathCost = metrics.resultValid ? metrics.calculatedPathCost : null

    return {
      variantId: variant.id,
      name: variant.name,
      algorithmName: variant.algorithmName,
      heuristicName: variant.heuristicName,
      pathCost,
      optimal: pathCost !== null && pathCost === optimalCost,
      timeUs:
        pathCost === null
          ? null
          : measureVariantExecutionTime(variant, problem, timingOptions).medianUs,
      memoryEntries: metrics.peakFrontierEntries + metrics.closedSetEntries,
      peakFrontierEntries: metrics.peakFrontierEntries,
      closedSetEntries: metrics.closedSetEntries,
      nodesExpanded: metrics.nodesExpanded,
      nodesGenerated: metrics.nodesGenerated,
    }
  })

  return { start, goal, optimalCost, rows }
}
