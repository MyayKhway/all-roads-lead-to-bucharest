import type { Heuristic, SearchAlgorithm } from '@/search/contracts'

/** One named algorithm-and-heuristic configuration available to the application. */
export interface SearchVariant {
  /** Stable identifier used by benchmark options, reports, and future UI selection. */
  readonly id: string
  /** Author-chosen name for this complete algorithm-and-heuristic configuration. */
  readonly name: string
  readonly algorithmName: string
  /** Null when the variant does not use a heuristic. */
  readonly heuristicName: string | null
  readonly author: string
  readonly algorithm: SearchAlgorithm
  /** Omitted for blind searches and other algorithms that do not use a heuristic. */
  readonly heuristic?: Heuristic
}

/** Validates metadata shared by production, diagnosis, and benchmark workflows. */
export function validateSearchVariants(variants: readonly SearchVariant[]): void {
  const ids = new Set<string>()

  for (const variant of variants) {
    if (variant.id.trim().length === 0) {
      throw new RangeError('Search variant IDs must not be empty')
    }
    if (ids.has(variant.id)) {
      throw new RangeError(`Duplicate search variant ID: ${variant.id}`)
    }
    if (variant.name.trim().length === 0 || variant.algorithmName.trim().length === 0) {
      throw new RangeError('Search variant and algorithm names must not be empty')
    }
    if (variant.heuristicName !== null && variant.heuristicName.trim().length === 0) {
      throw new RangeError('Heuristic names must not be empty')
    }
    if ((variant.heuristicName === null) !== (variant.heuristic === undefined)) {
      throw new RangeError(
        'A heuristic name and function must either both be present or both be absent',
      )
    }
    ids.add(variant.id)
  }
}

/** Resolves a selected variant from any supplied registry or subset. */
export function findSearchVariant(
  variants: readonly SearchVariant[],
  variantId: string,
): SearchVariant {
  const variant = variants.find((candidate) => candidate.id === variantId)
  if (variant === undefined) {
    throw new RangeError(`Unknown search variant: ${variantId}`)
  }
  return variant
}
