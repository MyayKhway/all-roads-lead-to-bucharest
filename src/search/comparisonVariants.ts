import type { SearchVariant } from '@/search/variant'
import { bfsVariant } from '@/search/variants/bfs'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'
import { ucsVariant } from '@/search/variants/ucs'

/** The method the comparison report presents. */
export const COMPARISON_FOCUS: SearchVariant = ntbAstarVariant

/** The blind search the focus is measured against: like A*, it always finds the shortest route. */
export const COMPARISON_BASELINE: SearchVariant = ucsVariant

/** Added to the all-routes benchmark only: BFS minimises roads taken, not road cost. */
export const COMPARISON_EXTRAS: readonly SearchVariant[] = [bfsVariant]

/** The selected-route comparison is the focus against its baseline alone. */
export const ROUTE_COMPARISON_VARIANTS: readonly SearchVariant[] = [
  COMPARISON_FOCUS,
  COMPARISON_BASELINE,
]
