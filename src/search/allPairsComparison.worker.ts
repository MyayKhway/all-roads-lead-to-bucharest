import { romaniaGraph } from '@/data/graph'
import { type AllPairsComparison, compareAllPairs } from '@/search/comparison'
import {
  COMPARISON_BASELINE,
  COMPARISON_EXTRAS,
  COMPARISON_FOCUS,
} from '@/search/comparisonVariants'
import { precomputeNtbEstimates } from '@/search/heuristics/ntb'

export type AllPairsComparisonResponse =
  | { readonly type: 'all-pairs'; readonly comparison: AllPairsComparison }
  | { readonly type: 'error'; readonly message: string }

// Prepare every goal table once when the worker loads, before any timed search can begin.
precomputeNtbEstimates(romaniaGraph)

// One pass over every pair takes a few milliseconds, so each trial batches several passes.
const ALL_PAIRS_TIMING = { warmupMs: 100, minTrialMs: 20, trials: 21 } as const

// Runs on its own worker so the selected-route comparison never queues behind it.
self.onmessage = () => {
  let response: AllPairsComparisonResponse
  try {
    const comparison = compareAllPairs(
      COMPARISON_FOCUS,
      COMPARISON_BASELINE,
      ALL_PAIRS_TIMING,
      COMPARISON_EXTRAS,
    )
    response = { type: 'all-pairs', comparison }
  } catch (error) {
    response = { type: 'error', message: String(error) }
  }
  self.postMessage(response)
}
