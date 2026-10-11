import assert from 'node:assert/strict'
import test from 'node:test'

import { runRoute } from '@/search/presentation'
import { bfsVariant } from '@/search/variants/bfs'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'

test('returns the route, its cost, and the expansion order', () => {
  const run = runRoute(ntbAstarVariant, 'arad', 'bucharest')

  assert.ok(run !== null)
  assert.deepEqual(run.path, ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'])
  assert.equal(run.pathCost, 418)
  assert.equal(run.expandedOrder[0], 'arad')
  assert.equal(run.expandedOrder.length, run.metrics.nodesExpanded)
})

test('reports the blind route when the variant ignores road costs', () => {
  assert.equal(runRoute(bfsVariant, 'arad', 'bucharest')?.pathCost, 450)
})
