import assert from 'node:assert/strict'
import test from 'node:test'

import { romaniaGraph } from '@/data/graph'
import { explainRun } from '@/search/explanation'
import { runRoute } from '@/search/presentation'
import { searchVariantRegistry } from '@/search/registry'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'

test('starts with only the start city in the queue', () => {
  const run = runRoute(ntbAstarVariant, 'arad', 'bucharest')
  assert.ok(run !== null)
  const [first] = explainRun(run)

  assert.deepEqual(
    first?.queue.map((e) => [e.city, e.g, e.picked]),
    [['arad', 0, true]],
  )
  assert.deepEqual(
    first?.candidates.map((c) => [c.city, c.outcome]),
    [
      ['zerind', 'added'],
      ['sibiu', 'added'],
      ['timisoara', 'added'],
    ],
  )
})

test('shows the second A* step choosing Sibiu by lowest f', () => {
  const run = runRoute(ntbAstarVariant, 'arad', 'bucharest')
  assert.ok(run !== null)
  const second = explainRun(run)[1]

  assert.equal(second?.queue[0]?.city, 'sibiu')
  assert.equal(second?.queue[0]?.picked, true)
  assert.deepEqual(second?.expandedBefore, ['arad'])
  assert.equal(second?.queue.length, 3)
})

test('every variant picks a city with the best queue priority, for every pair', () => {
  for (const variant of searchVariantRegistry) {
    for (const start of romaniaGraph.cityIds) {
      for (const goal of romaniaGraph.cityIds) {
        const run = runRoute(variant, start, goal)
        assert.ok(run !== null)

        for (const explained of explainRun(run)) {
          const best = explained.queue[0]
          const picked = explained.queue.find((e) => e.picked)
          assert.ok(best && picked, `${variant.id} ${start}->${goal} step ${explained.index}`)
          assert.ok(
            Math.abs(picked.priority - best.priority) < 1e-9,
            `${variant.id} ${start}->${goal} step ${explained.index}: picked ${picked.city}`,
          )
        }
      }
    }
  }
})
