import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'

/** Defines the graph, initial state, and goal state for one search. */
export interface SearchProblem {
  readonly graph: WeightedGraph
  readonly start: CityId
  readonly goal: CityId
}

/** Returns a finite, non-negative estimate in the graph's path-cost units. */
export type Heuristic = (current: CityId, problem: SearchProblem) => number

export interface SearchSuccess {
  readonly status: 'success'
  /** Ordered from the problem's start city through its goal city. */
  readonly path: readonly CityId[]
  /** Sum of the graph's edge costs along `path`. */
  readonly pathCost: number
}

export interface SearchFailure {
  readonly status: 'failure'
  readonly reason: 'unreachable'
}

export type SearchResult = SearchSuccess | SearchFailure

export interface SearchAlgorithmContext {
  readonly heuristic?: Heuristic
  /** Receives diagnostic events synchronously when observation is enabled. */
  readonly eventListener?: SearchEventListener
}

export type SearchAlgorithm = (
  problem: SearchProblem,
  context: SearchAlgorithmContext,
) => SearchResult

/** Emitted by the harness immediately before it invokes the algorithm. */
export interface SearchStartedEvent {
  readonly type: 'search-started'
  readonly start: CityId
  readonly goal: CityId
}

/** Emitted by the harness immediately after the algorithm returns. */
export interface SearchEndedEvent {
  readonly type: 'search-ended'
  readonly result: SearchResult
}

/** Emitted the first time a city is accepted into the frontier. */
export interface NodeDiscoveredEvent {
  readonly type: 'node-discovered'
  readonly city: CityId
  readonly parent: CityId | null
  readonly pathCost: number
}

/** Emitted after a city is selected from the frontier, before examining its neighbors. */
export interface NodeExpandedEvent {
  readonly type: 'node-expanded'
  readonly city: CityId
  readonly pathCost: number
}

/** Emitted when a cheaper path replaces the currently known path to a city. */
export interface NodeUpdatedEvent {
  readonly type: 'node-updated'
  readonly city: CityId
  readonly parent: CityId
  readonly previousPathCost: number
  readonly pathCost: number
}

/** Emitted after an operation changes the number of entries in the frontier. */
export interface FrontierSizeChangedEvent {
  readonly type: 'frontier-size-changed'
  readonly size: number
}

/** Emitted by a diagnostic wrapper immediately after evaluating the heuristic. */
export interface HeuristicEvaluatedEvent {
  readonly type: 'heuristic-evaluated'
  readonly city: CityId
  readonly goal: CityId
  readonly heuristicValue: number
}

export type SearchEvent =
  | SearchStartedEvent
  | SearchEndedEvent
  | NodeDiscoveredEvent
  | NodeExpandedEvent
  | NodeUpdatedEvent
  | FrontierSizeChangedEvent
  | HeuristicEvaluatedEvent

export type SearchEventListener = (event: SearchEvent) => void
