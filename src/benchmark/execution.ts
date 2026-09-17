import { deriveSearchMetrics, type SearchMetrics } from '@/benchmark/metrics'
import { createSearchProbe } from '@/benchmark/probe'
import type {
  Heuristic,
  SearchAlgorithm,
  SearchAlgorithmContext,
  SearchEventListener,
  SearchProbeSnapshot,
  SearchProblem,
  SearchResult,
} from '@/search/contracts'
import { type SearchResultValidation, validateSearchResult } from '@/search/validation'

export interface ExecuteSearchInput {
  readonly problem: SearchProblem
  readonly algorithm: SearchAlgorithm
  readonly heuristic?: Heuristic
  readonly eventListener?: SearchEventListener
}

export interface SearchExecution {
  readonly result: SearchResult
  readonly validation: SearchResultValidation
  readonly probeSnapshot: SearchProbeSnapshot
  readonly metrics: SearchMetrics
}

/** Runs one algorithm with fresh instrumentation, then validates and measures its result. */
export function executeSearch({
  problem,
  algorithm,
  heuristic,
  eventListener,
}: ExecuteSearchInput): SearchExecution {
  const probe = createSearchProbe()
  const context: SearchAlgorithmContext = {
    probe,
    ...(heuristic === undefined ? {} : { heuristic }),
    ...(eventListener === undefined ? {} : { eventListener }),
  }

  eventListener?.({
    type: 'search-started',
    start: problem.start,
    goal: problem.goal,
  })

  const result = algorithm(problem, context)

  eventListener?.({
    type: 'search-ended',
    result,
  })

  // Capture immediately so validation and metric derivation are outside the search work.
  const probeSnapshot = probe.snapshot()
  const validation = validateSearchResult(problem, result)
  const metrics = deriveSearchMetrics({ result, validation, probeSnapshot })

  return Object.freeze({
    result,
    validation,
    probeSnapshot,
    metrics,
  })
}
