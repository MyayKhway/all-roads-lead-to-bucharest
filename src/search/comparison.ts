import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import type { SearchProblem, SearchResult } from '@/search/contracts'
import { measureVariantExecutionTime } from '@/search/evaluation/benchmark/suite'
import { measureExecutionTime, type TimingOptions } from '@/search/evaluation/benchmark/timer'
import { executeSearch } from '@/search/evaluation/execution'
import { createSearchProbe } from '@/search/evaluation/probe'
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
  /** Structural entry count: peak frontier plus final closed-set and cost-table entries. */
  readonly memoryEntries: number
  readonly peakFrontierEntries: number
  readonly closedSetEntries: number
  readonly costTableEntries: number
  readonly nodesExpanded: number
  readonly nodesGenerated: number
  readonly edgesExamined: number
}

export interface RouteComparison {
  readonly start: CityId
  readonly goal: CityId
  /** Shortest road distance from the reference Dijkstra, or null when unreachable. */
  readonly optimalCost: number | null
  readonly rows: readonly VariantComparison[]
}

export interface AllPairsVariantComparison {
  readonly variantId: string
  readonly name: string
  readonly heuristicName: string | null
  readonly validRoutes: number
  readonly optimalRoutes: number
  readonly averagePathCost: number
  readonly averageNodesExpanded: number
  readonly averageNodesGenerated: number
  readonly averageEdgesExamined: number
  readonly averagePeakFrontierEntries: number
  readonly averageClosedSetEntries: number
  readonly averageCostTableEntries: number
  /** Mean percentage above the shortest road cost; optimal routes contribute zero. */
  readonly averageCostOverrunPercent: number
  readonly worstCostOverrunPercent: number
  /** Median microseconds for one complete pass over every ordered city pair. */
  readonly medianSuiteTimeUs: number
  readonly averageTimeUs: number
}

export interface AllPairsComparison {
  readonly pairCount: number
  readonly focusVariantId: string
  readonly baselineVariantId: string
  readonly rows: readonly AllPairsVariantComparison[]
}

interface PreparedAllPair {
  readonly problem: SearchProblem
  readonly optimalCost: number | null
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
      memoryEntries:
        metrics.peakFrontierEntries + metrics.closedSetEntries + metrics.costTableEntries,
      peakFrontierEntries: metrics.peakFrontierEntries,
      closedSetEntries: metrics.closedSetEntries,
      costTableEntries: metrics.costTableEntries,
      nodesExpanded: metrics.nodesExpanded,
      nodesGenerated: metrics.nodesGenerated,
      edgesExamined: metrics.edgesExamined,
    }
  })

  return { start, goal, optimalCost, rows }
}

function prepareAllPairs(): readonly PreparedAllPair[] {
  const pairs: PreparedAllPair[] = []
  for (const start of romaniaGraph.cityIds) {
    for (const goal of romaniaGraph.cityIds) {
      if (start === goal) continue

      const problem: SearchProblem = { graph: romaniaGraph, start, goal }
      const reference = referenceDijkstra(problem, {})
      pairs.push({
        problem,
        optimalCost: reference.status === 'success' ? reference.pathCost : null,
      })
    }
  }
  return pairs
}

/** Run one complete suite without validation or metric derivation inside the timed section. */
function runTimedSuite(variant: SearchVariant, pairs: readonly PreparedAllPair[]): SearchResult {
  let finalResult: SearchResult | undefined
  for (const { problem } of pairs) {
    finalResult = variant.algorithm(problem, {
      probe: createSearchProbe(),
      ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    })
  }
  if (finalResult === undefined) throw new Error('All-pairs timing requires at least one city pair')
  return finalResult
}

function collectAllPairResults(
  variant: SearchVariant,
  pairs: readonly PreparedAllPair[],
  timingOptions: TimingOptions | undefined,
): AllPairsVariantComparison {
  let validRoutes = 0
  let optimalRoutes = 0
  let totalPathCost = 0
  let pathCostSamples = 0
  let nodesExpanded = 0
  let nodesGenerated = 0
  let edgesExamined = 0
  let peakFrontierEntries = 0
  let closedSetEntries = 0
  let costTableEntries = 0
  let totalCostOverrunPercent = 0
  let worstCostOverrunPercent = 0

  for (const { problem, optimalCost } of pairs) {
    const { metrics } = executeSearch({
      problem,
      algorithm: variant.algorithm,
      ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    })
    const pathCost = metrics.resultValid ? metrics.calculatedPathCost : null

    if (metrics.resultValid) validRoutes += 1
    if (pathCost !== null) {
      totalPathCost += pathCost
      pathCostSamples += 1
    }
    if (pathCost !== null && pathCost === optimalCost) optimalRoutes += 1
    if (pathCost !== null && optimalCost !== null && optimalCost > 0) {
      const overrunPercent = Math.max(0, ((pathCost - optimalCost) / optimalCost) * 100)
      totalCostOverrunPercent += overrunPercent
      worstCostOverrunPercent = Math.max(worstCostOverrunPercent, overrunPercent)
    }
    nodesExpanded += metrics.nodesExpanded
    nodesGenerated += metrics.nodesGenerated
    edgesExamined += metrics.edgesExamined
    peakFrontierEntries += metrics.peakFrontierEntries
    closedSetEntries += metrics.closedSetEntries
    costTableEntries += metrics.costTableEntries
  }

  const pairCount = pairs.length
  if (pairCount === 0) throw new Error('All-pairs comparison requires at least two cities')
  const timing = measureExecutionTime(() => runTimedSuite(variant, pairs), timingOptions)

  return {
    variantId: variant.id,
    name: variant.name,
    heuristicName: variant.heuristicName,
    validRoutes,
    optimalRoutes,
    averagePathCost: pathCostSamples === 0 ? 0 : totalPathCost / pathCostSamples,
    averageNodesExpanded: nodesExpanded / pairCount,
    averageNodesGenerated: nodesGenerated / pairCount,
    averageEdgesExamined: edgesExamined / pairCount,
    averagePeakFrontierEntries: peakFrontierEntries / pairCount,
    averageClosedSetEntries: closedSetEntries / pairCount,
    averageCostTableEntries: costTableEntries / pairCount,
    averageCostOverrunPercent: validRoutes === 0 ? 0 : totalCostOverrunPercent / validRoutes,
    worstCostOverrunPercent,
    medianSuiteTimeUs: timing.medianUs,
    averageTimeUs: timing.medianUs / pairCount,
  }
}

/**
 * Compare one heuristic with its blind baseline across every ordered pair of distinct cities.
 * Extra variants are measured the same way and follow the focus and baseline in `rows`.
 */
export function compareAllPairs(
  focusVariant: SearchVariant,
  baselineVariant: SearchVariant,
  timingOptions?: TimingOptions,
  extraVariants: readonly SearchVariant[] = [],
): AllPairsComparison {
  const pairs = prepareAllPairs()
  const rows = [focusVariant, baselineVariant, ...extraVariants].map((variant) =>
    collectAllPairResults(variant, pairs, timingOptions),
  )

  return {
    pairCount: pairs.length,
    focusVariantId: focusVariant.id,
    baselineVariantId: baselineVariant.id,
    rows,
  }
}
