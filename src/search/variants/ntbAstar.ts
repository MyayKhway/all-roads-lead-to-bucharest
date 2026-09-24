import { astarSearch } from '@/search/algorithms/astar'
import { ntbHeuristic, ntbPlusHeuristic } from '@/search/heuristics/ntb'
import type { SearchVariant } from '@/search/variant'

/** Benchmark A* with the sum of unavoidable minimum boundary tolls. */
export const ntbAstarVariant: SearchVariant = {
  id: 'astar-ntb',
  name: 'A* + NTB',
  algorithmName: 'A*',
  heuristicName: 'NTB',
  author: 'APS',
  algorithm: astarSearch,
  heuristic: ntbHeuristic,
}

/** Benchmark the same A* implementation with one-edge NTB lookahead. */
export const ntbPlusAstarVariant: SearchVariant = {
  id: 'astar-ntb-plus',
  name: 'A* + NTB+',
  algorithmName: 'A*',
  heuristicName: 'NTB+',
  author: 'APS',
  algorithm: astarSearch,
  heuristic: ntbPlusHeuristic,
}
