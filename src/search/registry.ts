import { altVariant, type SearchVariant, validateSearchVariants } from '@/search/variant'

/**
 * Application-wide variant catalog shared by production, diagnosis, and benchmarking.
 * Register contract-compatible variants here, as described in the search guide.
 */
const variants: SearchVariant[] = [altVariant]

validateSearchVariants(variants)

export const searchVariantRegistry: readonly SearchVariant[] = Object.freeze(variants)
