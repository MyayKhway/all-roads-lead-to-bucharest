import type { CityId } from '../data/cityIds.js'
import type { WeightedGraph } from '../data/graph.js'

// inputs to all searches
export interface SearchProblem {
  readonly graph: WeightedGraph
  readonly start: CityId
  readonly goal: CityId
}

export type Heuristic = (current: CityId, problem: SearchProblem) => number

export interface SearchSuccess {
  readonly status: 'success'
  readonly path: readonly CityId[]
  readonly pathCost: number
}

export interface SearchFailure {
  readonly status: 'failure'
  readonly reason: 'unreachable'
}

export type SearchResult = SearchSuccess | SearchFailure
