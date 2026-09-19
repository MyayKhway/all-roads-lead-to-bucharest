import type { SearchVariant } from '@/search/variant'

/** Formats registry metadata for command-line discovery without running a search. */
export function formatVariantList(variants: readonly SearchVariant[]): string {
  if (variants.length === 0) {
    return 'No search variants are registered.'
  }
  return variants
    .map(
      (variant) =>
        `${variant.id}: ${variant.name} (${variant.algorithmName} / ${variant.heuristicName ?? 'no heuristic'})`,
    )
    .join('\n')
}
