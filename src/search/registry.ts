import type { SearchVariant } from '@/search/variant'
import { validateSearchVariants } from '@/search/variant'

// Import the two A* configurations so the shared registry can expose them.
import { ntbAstarVariant, ntbPlusAstarVariant } from '@/search/variants/ntbAstar' //aps
// Import the blind uniform-cost baseline for comparison with A*.
import { ucsVariant } from '@/search/variants/ucs' //aps

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Algorithm authors add contract-compatible variants to this array.
 */

// Make NTB and NTB+ available to diagnosis and benchmark commands.
// Register UCS beside the two A* variants for diagnosis and benchmarking.
const variants: SearchVariant[] = [ntbAstarVariant, ntbPlusAstarVariant, ucsVariant] //aps

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
