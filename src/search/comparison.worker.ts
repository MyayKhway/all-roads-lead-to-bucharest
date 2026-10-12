import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import { compareVariants, type RouteComparison } from '@/search/comparison'
import { ROUTE_COMPARISON_VARIANTS } from '@/search/comparisonVariants'
import { precomputeNtbEstimates } from '@/search/heuristics/ntb'

export interface ComparisonRequest {
  readonly requestId: number
  readonly start: CityId
  readonly goal: CityId
}

export type ComparisonResponse =
  | { readonly type: 'route'; readonly requestId: number; readonly comparison: RouteComparison }
  | { readonly type: 'error'; readonly requestId: number; readonly message: string }

// Prepare every goal table once when the worker loads, before any timed search can begin.
precomputeNtbEstimates(romaniaGraph)

// Shorter than the CLI's defaults so the selected-route comparison finishes in about a second.
const ROUTE_TIMING = { warmupMs: 30, minTrialMs: 10, trials: 25 } as const

// Timing runs here so repeated searches never stall the map animation.
self.onmessage = (event: MessageEvent<ComparisonRequest>) => {
  const { requestId, start, goal } = event.data
  let response: ComparisonResponse
  try {
    const comparison = compareVariants(ROUTE_COMPARISON_VARIANTS, start, goal, ROUTE_TIMING)
    response = { type: 'route', requestId, comparison }
  } catch (error) {
    response = { type: 'error', requestId, message: String(error) }
  }
  self.postMessage(response)
}
