import { astar } from '@/search/algorithms/astar'
import { heartbeatHeuristic } from '@/search/heuristics/heartbeat'
import type { SearchVariant } from '@/search/variant'
import { validateSearchVariants } from '@/search/variant'

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Algorithm authors add contract-compatible variants to this array.
 */
const variants: SearchVariant[] = [
  {
    id: 'astar-heartbeat',
    name: 'A* with Heartbeat',
    algorithmName: 'A*',
    heuristicName: 'Heartbeat (cardiovascular landmarks)',
    author: 'Luu',
    algorithm: astar,
    heuristic: heartbeatHeuristic,
  },
]

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
