import type { SearchVariant } from '@/search/variant'
import { validateSearchVariants } from '@/search/variant'

// added by aps
// Import the two A* configurations so the shared registry can expose them.
import { ntbAstarVariant, ntbPlusAstarVariant } from '@/search/variants/ntbAstar'

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Algorithm authors add contract-compatible variants to this array.
 */

// added by aps
// Make NTB and NTB+ available to diagnosis and benchmark commands.
const variants: SearchVariant[] = [ntbAstarVariant, ntbPlusAstarVariant]

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
