import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import {
  type AllPairsComparison,
  compareAllPairs,
  compareVariants,
  type RouteComparison,
} from '@/search/comparison'
import { precomputeNtbEstimates } from '@/search/heuristics/ntb'
import type { SearchVariant } from '@/search/variant'
import { bfsVariant } from '@/search/variants/bfs'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'

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

// The presentation compares the project's NTB heuristic with a blind-search baseline.
const PRESENTATION_VARIANTS: readonly SearchVariant[] = [ntbAstarVariant, bfsVariant]

// Prepare every goal table once when the worker loads, before any timed search can begin.
precomputeNtbEstimates(romaniaGraph)

// Shorter than the CLI's defaults so the presentation comparison finishes quickly.
const UI_TIMING = { warmupMs: 20, minTrialMs: 5, trials: 15 } as const

let cachedAllPairsComparison: AllPairsComparison | undefined

// Timing runs here so repeated searches never stall the map animation.
self.onmessage = (event: MessageEvent<ComparisonRequest>) => {
  const { requestId, start, goal } = event.data
  const comparison = compareVariants(PRESENTATION_VARIANTS, start, goal, UI_TIMING)
  const response: RouteComparisonResponse = { type: 'route', requestId, comparison }
  self.postMessage(response)

  // Fill the reusable aggregate result after the selected route has been returned.
  if (cachedAllPairsComparison === undefined) {
    cachedAllPairsComparison = compareAllPairs(ntbAstarVariant, bfsVariant, UI_TIMING)
    const allPairsResponse: AllPairsComparisonResponse = {
      type: 'all-pairs',
      comparison: cachedAllPairsComparison,
    }
    self.postMessage(allPairsResponse)
  }
}
