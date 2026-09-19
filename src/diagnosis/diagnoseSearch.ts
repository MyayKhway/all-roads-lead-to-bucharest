import { compareWithReference, type ReferenceComparisonResult } from '@/benchmark/comparison'
import { executeSearch, type SearchExecution } from '@/benchmark/execution'
import { referenceDijkstra } from '@/benchmark/reference'
import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { SearchEvent, SearchProblem, SearchResult } from '@/search/contracts'
import { type SearchVariant, validateSearchVariants } from '@/search/variant'

export interface DiagnoseSearchInput {
  readonly graph: WeightedGraph
  readonly variant: SearchVariant
  readonly start: CityId
  readonly goal: CityId
}

export interface SearchDiagnosis {
  readonly variantId: string
  readonly variantName: string
  readonly algorithmName: string
  readonly heuristicName: string | null
  readonly author: string
  readonly problem: SearchProblem
  readonly execution: SearchExecution
  readonly referenceResult: SearchResult
  readonly comparison: ReferenceComparisonResult
  readonly events: readonly SearchEvent[]
}

/** Diagnoses one variant and city pair without running calibrated timing trials. */
export function diagnoseSearch({
  graph,
  variant,
  start,
  goal,
}: DiagnoseSearchInput): SearchDiagnosis {
  validateSearchVariants([variant])
  if (!graph.cityIds.includes(start) || !graph.cityIds.includes(goal)) {
    throw new RangeError(`Diagnosis contains a city outside the graph: ${start} -> ${goal}`)
  }

  const problem: SearchProblem = { graph, start, goal }
  // Calculate the oracle separately so its work is not included in candidate metrics.
  const referenceResult = referenceDijkstra(problem, {})
  const events: SearchEvent[] = []
  const execution = executeSearch({
    problem,
    algorithm: variant.algorithm,
    ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    eventListener: (event) => events.push(event),
  })

  return Object.freeze({
    variantId: variant.id,
    variantName: variant.name,
    algorithmName: variant.algorithmName,
    heuristicName: variant.heuristicName,
    author: variant.author,
    problem,
    execution,
    referenceResult,
    comparison: compareWithReference(execution, referenceResult),
    events: Object.freeze([...events]),
  })
}
