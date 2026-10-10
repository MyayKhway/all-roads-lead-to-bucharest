import { createAStarV2 } from '@/algorithms/aStarV2'
import { cachedMagneticHeuristic, magneticHeuristic } from '@/heuristics/magneticAlignmentV2'
import type { SearchVariant } from '@/search/variant'

/** The magnetic field uses its precomputed road lookup through the private A* callback. */
export const magneticFieldVariant: SearchVariant = {
  id: 'astar-magnetic-field',
  name: 'A* with magnetic field heuristic',
  algorithmName: 'A*',
  heuristicName: 'Magnetic field',
  author: 'Tony',
  algorithm: createAStarV2(cachedMagneticHeuristic),
  heuristic: magneticHeuristic,
}
