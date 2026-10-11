import type { CityId } from '@/data/cityIds'
import { compareVariants, type RouteComparison } from '@/search/comparison'
import { searchVariantRegistry } from '@/search/registry'

export interface ComparisonRequest {
  readonly requestId: number
  readonly start: CityId
  readonly goal: CityId
}

export interface ComparisonResponse {
  readonly requestId: number
  readonly comparison: RouteComparison
}

// Shorter than the CLI's defaults so four variants finish in well under a second.
const UI_TIMING = { warmupMs: 20, minTrialMs: 5, trials: 15 } as const

// Timing runs here so repeated searches never stall the map animation.
self.onmessage = (event: MessageEvent<ComparisonRequest>) => {
  const { requestId, start, goal } = event.data
  const comparison = compareVariants(searchVariantRegistry, start, goal, UI_TIMING)
  const response: ComparisonResponse = { requestId, comparison }
  self.postMessage(response)
}
