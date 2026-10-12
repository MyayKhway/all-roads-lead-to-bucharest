import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import {
  type AllPairsComparison,
  compareAllPairs,
  compareVariants,
  type RouteComparison,
} from '@/search/comparison'
import {
  COMPARISON_BASELINE,
  COMPARISON_EXTRAS,
  COMPARISON_FOCUS,
  COMPARISON_VARIANTS,
} from '@/search/comparisonVariants'
import { precomputeNtbEstimates } from '@/search/heuristics/ntb'

export interface ComparisonRequest {
  readonly type: 'route'
  readonly requestId: number
  readonly start: CityId
  readonly goal: CityId
}

export interface RouteComparisonResponse {
  readonly type: 'route'
  readonly requestId: number
  readonly comparison: RouteComparison
}

export interface AllPairsComparisonResponse {
  readonly type: 'all-pairs'
  readonly comparison: AllPairsComparison
}

export type ComparisonResponse = RouteComparisonResponse | AllPairsComparisonResponse

// Prepare every goal table once when the worker loads, before any timed search can begin.
precomputeNtbEstimates(romaniaGraph)

// Shorter than the CLI's defaults so the presentation comparison finishes quickly.
const UI_TIMING = { warmupMs: 20, minTrialMs: 5, trials: 15 } as const

let cachedAllPairsComparison: AllPairsComparison | undefined

// Timing runs here so repeated searches never stall the map animation.
self.onmessage = (event: MessageEvent<ComparisonRequest>) => {
  const { requestId, start, goal } = event.data
  const comparison = compareVariants(COMPARISON_VARIANTS, start, goal, UI_TIMING)
  const response: RouteComparisonResponse = { type: 'route', requestId, comparison }
  self.postMessage(response)

  // Fill the reusable aggregate result after the selected route has been returned.
  if (cachedAllPairsComparison === undefined) {
    cachedAllPairsComparison = compareAllPairs(
      COMPARISON_FOCUS,
      COMPARISON_BASELINE,
      UI_TIMING,
      COMPARISON_EXTRAS,
    )
    const allPairsResponse: AllPairsComparisonResponse = {
      type: 'all-pairs',
      comparison: cachedAllPairsComparison,
    }
    self.postMessage(allPairsResponse)
  }
}
