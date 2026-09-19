import type { SearchResult } from '@/search/contracts'
import type { SearchExecution } from '@/search/evaluation/execution'

export interface ReferenceComparisonResult {
  readonly referencePathCost: number | null
  readonly isOptimal: boolean | null
  readonly costOvershoot: number | null
  readonly costOvershootPercentage: number | null
}

/** Compares one valid candidate execution with a precomputed reference result. */
export function compareWithReference(
  execution: SearchExecution,
  referenceResult: SearchResult,
): ReferenceComparisonResult {
  const referencePathCost = referenceResult.status === 'success' ? referenceResult.pathCost : null
  const candidatePathCost = execution.metrics.calculatedPathCost

  // Invalid or unreachable results do not provide two path costs that can be compared.
  if (!execution.metrics.resultValid || referencePathCost === null || candidatePathCost === null) {
    return Object.freeze({
      referencePathCost,
      isOptimal: null,
      costOvershoot: null,
      costOvershootPercentage: null,
    })
  }

  const costOvershoot = candidatePathCost - referencePathCost
  if (costOvershoot < 0) {
    throw new Error('Candidate path cost cannot be lower than the reference shortest-path cost')
  }

  const costOvershootPercentage =
    referencePathCost === 0
      ? costOvershoot === 0
        ? 0
        : null
      : (costOvershoot / referencePathCost) * 100

  return Object.freeze({
    referencePathCost,
    isOptimal: costOvershoot === 0,
    costOvershoot,
    costOvershootPercentage,
  })
}
