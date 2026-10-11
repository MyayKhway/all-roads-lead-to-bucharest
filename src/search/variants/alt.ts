import { romaniaGraph } from '@/data/graph'
import { astarSearch } from '@/search/algorithms/astar'
import { createAltHeuristic } from '@/search/heuristics/alt'
import type { SearchVariant } from '@/search/variant'

/** A* with the ALT heuristic (landmarks + triangle inequality). Landmark tables are built once here. */
export const altAstarVariant: SearchVariant = {
  id: 'astar-alt',
  name: 'A* + ALT Landmarks',
  algorithmName: 'A*',
  heuristicName: 'ALT (Landmarks + Triangle Inequality)',
  author: 'HTH',
  algorithm: astarSearch,
  heuristic: createAltHeuristic(romaniaGraph, { landmarkCount: 3 }),
}
