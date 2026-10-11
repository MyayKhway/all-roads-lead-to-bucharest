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

test('records each A* expansion with its scored neighbours', () => {
  const run = runRoute(ntbAstarVariant, 'arad', 'bucharest')
  assert.ok(run !== null)

  const [first] = run.steps
  assert.ok(first)
  assert.equal(first.city, 'arad')
  assert.equal(first.g, 0)
  assert.deepEqual(
    first.candidates.map((c) => [c.city, c.g, c.improved]),
    [
      ['zerind', 75, true],
      ['sibiu', 140, true],
      ['timisoara', 118, true],
    ],
  )
  for (const c of first.candidates) {
    assert.ok(c.h !== null && c.f === c.g + c.h)
  }
  const goalStep = run.steps.at(-1)
  assert.equal(goalStep?.city, 'bucharest')
  // A* returns on selecting the goal, so it examines none of the goal's roads.
  assert.deepEqual(goalStep?.candidates, [])
})

test('marks roads that offered no better route', () => {
  const run = runRoute(ntbAstarVariant, 'arad', 'bucharest')
  assert.ok(run !== null)
  const sibiu = run.steps.find((step) => step.city === 'sibiu')
  const backToArad = sibiu?.candidates.find((c) => c.city === 'arad')

  assert.deepEqual(backToArad, { city: 'arad', g: 280, h: null, f: null, improved: false })
})

test('stops a BFS trace at the road that reached the goal', () => {
  const run = runRoute(bfsVariant, 'arad', 'bucharest')
  assert.ok(run !== null)
  const last = run.steps.at(-1)

  assert.equal(last?.city, 'fagaras')
  assert.equal(last?.candidates.at(-1)?.city, 'bucharest')
  assert.ok(last?.candidates.every((c) => c.h === null))
})
