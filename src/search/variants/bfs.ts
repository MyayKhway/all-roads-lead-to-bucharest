import { bfsSearch } from '@/search/algorithms/bfs'
import type { SearchVariant } from '@/search/variant'

/** Blind baseline that ignores road costs, so its routes can be suboptimal. */
export const bfsVariant: SearchVariant = {
  id: 'bfs',
  name: 'Breadth-First Search',
  algorithmName: 'Breadth-First Search',
  heuristicName: null,
  author: 'KentLynn',
  algorithm: bfsSearch,
}
