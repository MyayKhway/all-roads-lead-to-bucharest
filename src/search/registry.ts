import type { SearchVariant } from '@/search/variant'
import { validateSearchVariants } from '@/search/variant'

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Algorithm authors add contract-compatible variants to this array.
 */
const variants: SearchVariant[] = []

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
