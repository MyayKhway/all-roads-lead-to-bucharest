import { createAStarV2 } from '@/algorithms/aStarV2'
import { cachedMagneticHeuristic, magneticHeuristic } from '@/heuristics/magneticAlignmentV2'
import type { SearchVariant } from '@/search/variant'

/** Magnetic alignment uses its precomputed road lookup through the private A* callback. */
export const magneticAlignmentVariant: SearchVariant = {
  id: 'astar-magnetic-alignment',
  name: 'A* with magnetic alignment',
  algorithmName: 'A*',
  heuristicName: 'Full-range magnetic alignment',
  author: 'Tony',
  algorithm: createAStarV2(cachedMagneticHeuristic),
  heuristic: magneticHeuristic,
}
