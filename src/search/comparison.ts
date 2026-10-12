import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import type { SearchProblem, SearchResult } from '@/search/contracts'
import { createVariantOperation } from '@/search/evaluation/benchmark/suite'
import {
  measureInterleavedExecutionTimes,
  type TimingOptions,
  type TimingResult,
} from '@/search/evaluation/benchmark/timer'
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
  /** Interquartile range of the timing trials, so overlapping spreads are visible. */
  readonly timeP25Us: number | null
  readonly timeP75Us: number | null
  /**
   * The harness's structural memory estimate, the same figure the benchmark CLI reports: entries
   * held by the frontier at its peak plus the closed set and every cost table at the end, each
   * weighted by an assumed entry size. Closed sets and cost tables only grow, so their final size
   * is their peak. A* and UCS keep two tables (best cost and parent), BFS keeps two (reached cost
   * and parent), so methods compare like for like. Not measured JavaScript heap usage.
   */
  readonly estimatedBytes: number
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
  /** Mean structural memory estimate per route; see `VariantComparison.estimatedBytes`. */
  readonly averageEstimatedBytes: number
  /** Mean percentage above the shortest road cost; optimal routes contribute zero. */
  readonly averageCostOverrunPercent: number
  readonly worstCostOverrunPercent: number
  /** Median microseconds for one complete pass over every ordered city pair. */
  readonly medianSuiteTimeUs: number
  readonly p25SuiteTimeUs: number
  readonly p75SuiteTimeUs: number
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

/**
 * Runs every variant on one pair with the same instrumentation as the benchmark, then times
 * the variants that found a route against each other in alternating order.
 */
export function compareVariants(
  variants: readonly SearchVariant[],
  start: CityId,
  goal: CityId,
  timingOptions?: TimingOptions,
): RouteComparison {
  const problem: SearchProblem = { graph: romaniaGraph, start, goal }
  const reference = referenceDijkstra(problem, {})
  const optimalCost = reference.status === 'success' ? reference.pathCost : null

  const runs = variants.map((variant) => {
    const { metrics } = executeSearch({
      problem,
      algorithm: variant.algorithm,
      ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    })
    return { variant, metrics, pathCost: metrics.resultValid ? metrics.calculatedPathCost : null }
  })

  const timedRuns = runs.filter((run) => run.pathCost !== null)
  const timings = measureInterleavedExecutionTimes(
    timedRuns.map((run) => createVariantOperation(run.variant, problem)),
    timingOptions,
  )
  const timingByVariant = new Map<string, TimingResult>()
  timedRuns.forEach((run, index) => {
    const timing = timings[index]
    if (timing !== undefined) timingByVariant.set(run.variant.id, timing)
  })

  const rows = runs.map(({ variant, metrics, pathCost }): VariantComparison => {
    const timing = timingByVariant.get(variant.id)
    return {
      variantId: variant.id,
      name: variant.name,
      algorithmName: variant.algorithmName,
      heuristicName: variant.heuristicName,
      pathCost,
      optimal: pathCost !== null && pathCost === optimalCost,
      timeUs: timing?.medianUs ?? null,
      timeP25Us: timing?.p25Us ?? null,
      timeP75Us: timing?.p75Us ?? null,
      estimatedBytes: metrics.estimatedBytes,
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
  timing: TimingResult,
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
  let estimatedBytes = 0
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
    estimatedBytes += metrics.estimatedBytes
  }

  const pairCount = pairs.length
  if (pairCount === 0) throw new Error('All-pairs comparison requires at least two cities')

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
    averageEstimatedBytes: estimatedBytes / pairCount,
    averageCostOverrunPercent: validRoutes === 0 ? 0 : totalCostOverrunPercent / validRoutes,
    worstCostOverrunPercent,
    medianSuiteTimeUs: timing.medianUs,
    p25SuiteTimeUs: timing.p25Us,
    p75SuiteTimeUs: timing.p75Us,
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
  if (pairs.length === 0) throw new Error('All-pairs comparison requires at least two cities')
  const variants = [focusVariant, baselineVariant, ...extraVariants]
  const timings = measureInterleavedExecutionTimes(
    variants.map((variant) => () => runTimedSuite(variant, pairs)),
    timingOptions,
  )
  const rows = variants.map((variant, index) => {
    const timing = timings[index]
    if (timing === undefined) throw new Error(`No timing was recorded for ${variant.id}`)
    return collectAllPairResults(variant, pairs, timing)
  })

  return {
    pairCount: pairs.length,
    focusVariantId: focusVariant.id,
    baselineVariantId: baselineVariant.id,
    rows,
  }
}
