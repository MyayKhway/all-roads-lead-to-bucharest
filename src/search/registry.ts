import type { SearchVariant } from '@/search/variant'
import { validateSearchVariants } from '@/search/variant'
import { magneticFieldVariant } from '@/search/variants/magneticFieldVariant'

import { altAstarVariant } from '@/search/variants/alt'
import { bfsVariant } from '@/search/variants/bfs'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'
import { ucsVariant } from '@/search/variants/ucs'

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Algorithm authors add contract-compatible variants to this array.
 */
const variants: SearchVariant[] = [
  ntbAstarVariant,
  altAstarVariant,
  ucsVariant,
  bfsVariant,
  magneticFieldVariant,
]

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
