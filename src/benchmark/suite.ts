import { compareWithReference, type ReferenceComparisonResult } from '@/benchmark/comparison'
import { executeSearch, type SearchExecution } from '@/benchmark/execution'
import { createSearchProbe } from '@/benchmark/probe'
import { referenceDijkstra } from '@/benchmark/reference'
import { measureExecutionTime, type TimingOptions, type TimingResult } from '@/benchmark/timer'
import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { SearchAlgorithmContext, SearchProblem, SearchResult } from '@/search/contracts'
import type { SearchVariant } from '@/search/registry'

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

function validateVariants(variants: readonly SearchVariant[]): void {
  const ids = new Set<string>()

  for (const variant of variants) {
    if (variant.id.trim().length === 0) {
      throw new RangeError('Search variant IDs must not be empty')
    }
    if (ids.has(variant.id)) {
      throw new RangeError(`Duplicate search variant ID: ${variant.id}`)
    }
    if (variant.name.trim().length === 0 || variant.algorithmName.trim().length === 0) {
      throw new RangeError('Search variant and algorithm names must not be empty')
    }
    if (variant.heuristicName !== null && variant.heuristicName.trim().length === 0) {
      throw new RangeError('Heuristic names must not be empty')
    }
    if ((variant.heuristicName === null) !== (variant.heuristic === undefined)) {
      throw new RangeError(
        'A heuristic name and function must either both be present or both be absent',
      )
    }
    ids.add(variant.id)
  }
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
  validateVariants(variants)

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
