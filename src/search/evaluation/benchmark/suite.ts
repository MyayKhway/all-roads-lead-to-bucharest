import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { SearchAlgorithmContext, SearchProblem, SearchResult } from '@/search/contracts'
import {
  measureExecutionTime,
  type TimingOptions,
  type TimingResult,
} from '@/search/evaluation/benchmark/timer'
import { executeSearch, type SearchExecution } from '@/search/evaluation/execution'
import { createSearchProbe } from '@/search/evaluation/probe'
import {
  compareWithReference,
  type ReferenceComparisonResult,
} from '@/search/evaluation/referenceComparison'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { type SearchVariant, validateSearchVariants } from '@/search/variant'

export interface BenchmarkCityPair {
  readonly start: CityId
  readonly goal: CityId
  /** Timing is opt-in because calibrated trials cost much more than one count run. */
  readonly measureTiming?: boolean
}

export interface BenchmarkSuiteInput {
  readonly graph: WeightedGraph
  /** The registry rows selected for this benchmark run. */
  readonly variants: readonly SearchVariant[]
  readonly cityPairs: readonly BenchmarkCityPair[]
  readonly timingOptions?: TimingOptions
}

export interface BenchmarkRecord {
  readonly variantId: string
  readonly variantName: string
  readonly algorithmName: string
  readonly heuristicName: string | null
  readonly author: string
  readonly start: CityId
  readonly goal: CityId
  readonly execution: SearchExecution
  readonly comparison: ReferenceComparisonResult
  readonly timing: TimingResult | null
}

function cityPairKey(start: CityId, goal: CityId): string {
  return `${start}->${goal}`
}

function createProblem(graph: WeightedGraph, pair: BenchmarkCityPair): SearchProblem {
  if (!graph.cityIds.includes(pair.start) || !graph.cityIds.includes(pair.goal)) {
    throw new RangeError(
      `Benchmark pair contains a city outside the graph: ${pair.start} -> ${pair.goal}`,
    )
  }

  return {
    graph,
    start: pair.start,
    goal: pair.goal,
  }
}

/** Measures only algorithm execution while retaining the standardized search structures. */
function measureVariantExecutionTime(
  variant: SearchVariant,
  problem: SearchProblem,
  timingOptions: TimingOptions | undefined,
): TimingResult {
  return measureExecutionTime(() => {
    const context: SearchAlgorithmContext = {
      probe: createSearchProbe(),
      ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    }
    return variant.algorithm(problem, context)
  }, timingOptions)
}

/** Runs selected search variants against the same precomputed reference results. */
export function runBenchmarkSuite({
  graph,
  variants,
  cityPairs,
  timingOptions,
}: BenchmarkSuiteInput): readonly BenchmarkRecord[] {
  validateSearchVariants(variants)

  const preparedCases = cityPairs.map((pair) => ({ pair, problem: createProblem(graph, pair) }))
  const referenceByPair = new Map<string, SearchResult>()

  // Finish the reference phase before candidates run so oracle work stays outside measurement.
  for (const { pair, problem } of preparedCases) {
    const key = cityPairKey(pair.start, pair.goal)
    if (!referenceByPair.has(key)) {
      referenceByPair.set(key, referenceDijkstra(problem, {}))
    }
  }

  const records: BenchmarkRecord[] = []
  for (const { pair, problem } of preparedCases) {
    const reference = referenceByPair.get(cityPairKey(pair.start, pair.goal))
    if (reference === undefined) {
      throw new Error('Missing precomputed reference result for benchmark pair')
    }

    for (const variant of variants) {
      const execution = executeSearch({
        problem,
        algorithm: variant.algorithm,
        ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
      })

      records.push(
        Object.freeze({
          variantId: variant.id,
          variantName: variant.name,
          algorithmName: variant.algorithmName,
          heuristicName: variant.heuristicName,
          author: variant.author,
          start: pair.start,
          goal: pair.goal,
          execution,
          comparison: compareWithReference(execution, reference),
          timing:
            pair.measureTiming && execution.metrics.resultValid
              ? measureVariantExecutionTime(variant, problem, timingOptions)
              : null,
        }),
      )
    }
  }

  return Object.freeze(records)
}
