import assert from 'node:assert/strict'
import test from 'node:test'

import { compareVariants } from '@/search/comparison'
import { bfsVariant } from '@/search/variants/bfs'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'
import { ucsVariant } from '@/search/variants/ucs'

const FAST_TIMING = { warmupMs: 0, minTrialMs: 0.1, trials: 1 }

test('compares blind and heuristic search on one pair', () => {
  const comparison = compareVariants(
    [ntbAstarVariant, ucsVariant, bfsVariant],
    'arad',
    'bucharest',
    FAST_TIMING,
  )
  const [astar, ucs, bfs] = comparison.rows
  assert.ok(astar && ucs && bfs)

  assert.equal(comparison.optimalCost, 418)
  assert.deepEqual(
    comparison.rows.map((row) => [row.variantId, row.pathCost, row.optimal]),
    [
      ['astar-ntb', 418, true],
      ['ucs', 418, true],
      ['bfs', 450, false],
    ],
  )
  assert.ok(astar.nodesExpanded < ucs.nodesExpanded)
  assert.equal(astar.memoryEntries, astar.peakFrontierEntries + astar.closedSetEntries)
  for (const row of comparison.rows) {
    assert.ok(row.timeUs !== null && row.timeUs > 0)
  }
})
