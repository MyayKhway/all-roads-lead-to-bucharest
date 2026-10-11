import assert from 'node:assert/strict'
import test from 'node:test'

import { compareAllPairs, compareVariants } from '@/search/comparison'
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
  assert.equal(
    astar.memoryEntries,
    astar.peakFrontierEntries + astar.closedSetEntries + astar.costTableEntries,
  )
  for (const row of comparison.rows) {
    assert.ok(row.timeUs !== null && row.timeUs > 0)
  }
})

test('compares NTB and blind search across every ordered city pair', () => {
  const comparison = compareAllPairs(ntbAstarVariant, bfsVariant, FAST_TIMING)
  const [ntb, bfs] = comparison.rows
  assert.ok(ntb && bfs)

  assert.equal(comparison.pairCount, 380)
  assert.equal(ntb.validRoutes, 380)
  assert.equal(bfs.validRoutes, 380)
  assert.equal(ntb.optimalRoutes, 380)
  assert.ok(bfs.optimalRoutes < comparison.pairCount)
  assert.ok(ntb.averagePathCost > 0)
  assert.ok(bfs.averagePathCost >= ntb.averagePathCost)
  assert.equal(ntb.averageCostOverrunPercent, 0)
  assert.equal(ntb.worstCostOverrunPercent, 0)
  assert.ok(bfs.averageCostOverrunPercent > 0)
  assert.ok(bfs.worstCostOverrunPercent >= bfs.averageCostOverrunPercent)
  assert.ok(ntb.averagePeakFrontierEntries > 0)
  assert.ok(bfs.averagePeakFrontierEntries > 0)
  assert.ok(ntb.averageClosedSetEntries > 0)
  assert.ok(bfs.averageClosedSetEntries > 0)
  assert.ok(ntb.averageCostTableEntries > 0)
  assert.ok(bfs.averageCostTableEntries > 0)
  assert.ok(ntb.medianSuiteTimeUs > 0)
  assert.ok(bfs.medianSuiteTimeUs > 0)
})
