import type { SearchProbeSnapshot, SearchResult } from '@/search/contracts'
import type { SearchResultValidation } from '@/search/validation'

/** Auditable assumptions used only for the structural memory estimate. */
export const BYTE_ESTIMATES = {
  frontierEntry: 48,
  closedSetEntry: 32,
  costTableEntry: 40,
} as const

export interface SearchMetrics {
  readonly nodesGenerated: number
  readonly nodesExpanded: number
  readonly frontierPushes: number
  readonly frontierPops: number
  readonly peakFrontierEntries: number
  readonly closedSetEntries: number
  readonly costTableEntries: number
  readonly edgesExamined: number
  readonly heuristicEvaluations: number
  readonly customCounts: Readonly<Record<string, number>>
  /** Structural estimate based on entry counts, not measured JavaScript heap usage. */
  readonly estimatedBytes: number
  /** True only when a successful result also passes validation. */
  readonly goalReached: boolean
  /** Graph-derived cost, or null when a complete path cost is unavailable. */
  readonly calculatedPathCost: number | null
  /** Number of roads (graph edges) in the returned path, not the number of cities. */
  readonly pathEdgeCount: number
  /** Whether the result is a legitimate answer; this does not imply optimality. */
  readonly resultValid: boolean
}

export interface SearchMetricsInput {
  readonly result: SearchResult
  readonly validation: SearchResultValidation
  readonly probeSnapshot: SearchProbeSnapshot
}

/** Combines one completed search's validated result and probe observations. */
export function deriveSearchMetrics({
  result,
  validation,
  probeSnapshot,
}: SearchMetricsInput): SearchMetrics {
  const resultValid = validation.status === 'valid'
  const goalReached = resultValid && result.status === 'success'
  const pathEdgeCount = result.status === 'success' ? Math.max(result.path.length - 1, 0) : 0

  const estimatedBytes =
    probeSnapshot.peakFrontierEntries * BYTE_ESTIMATES.frontierEntry +
    probeSnapshot.closedSetEntries * BYTE_ESTIMATES.closedSetEntry +
    probeSnapshot.costTableEntries * BYTE_ESTIMATES.costTableEntry

  return Object.freeze({
    nodesGenerated: probeSnapshot.nodesGenerated,
    nodesExpanded: probeSnapshot.nodesExpanded,
    frontierPushes: probeSnapshot.frontierPushes,
    frontierPops: probeSnapshot.frontierPops,
    peakFrontierEntries: probeSnapshot.peakFrontierEntries,
    closedSetEntries: probeSnapshot.closedSetEntries,
    costTableEntries: probeSnapshot.costTableEntries,
    edgesExamined: probeSnapshot.edgesExamined,
    heuristicEvaluations: probeSnapshot.heuristicEvaluations,
    customCounts: Object.freeze({ ...probeSnapshot.customCounts }),
    estimatedBytes,
    goalReached,
    calculatedPathCost: validation.calculatedPathCost,
    pathEdgeCount,
    resultValid,
  })
}
