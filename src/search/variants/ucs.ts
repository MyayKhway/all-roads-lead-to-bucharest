import { ucsSearch } from '@/search/algorithms/ucs'
import type { SearchVariant } from '@/search/variant'

/** Compare heuristic-guided A* against a search ordered only by travelled road cost. */
export const ucsVariant: SearchVariant = {
  id: 'ucs',
  name: 'Uniform-Cost Search',
  algorithmName: 'Uniform-Cost Search',
  heuristicName: null,
  author: 'APS',
  algorithm: ucsSearch,
}
