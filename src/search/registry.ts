import type { SearchVariant } from '@/search/variant'
import { validateSearchVariants } from '@/search/variant'

import { ntbAstarVariant, ntbPlusAstarVariant } from '@/search/variants/ntbAstar'
import { ucsVariant } from '@/search/variants/ucs'

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Algorithm authors add contract-compatible variants to this array.
 */

const variants: SearchVariant[] = [ntbAstarVariant, ntbPlusAstarVariant, ucsVariant]

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
