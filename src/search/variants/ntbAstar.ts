import { astarSearch } from '@/search/algorithms/astar'
import { ntbHeuristic } from '@/search/heuristics/ntb'
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
