import type { Heuristic, SearchAlgorithm } from '@/search/contracts'

/** One named algorithm-and-heuristic configuration available to the application. */
export interface SearchVariant {
  /** Stable identifier used by benchmark options, reports, and future UI selection. */
  readonly id: string
  /** Author-chosen name for this complete algorithm-and-heuristic configuration. */
  readonly name: string
  readonly algorithmName: string
  /** Null when the variant does not use a heuristic. */
  readonly heuristicName: string | null
  readonly author: string
  readonly algorithm: SearchAlgorithm
  /** Omitted for blind searches and other algorithms that do not use a heuristic. */
  readonly heuristic?: Heuristic
}
