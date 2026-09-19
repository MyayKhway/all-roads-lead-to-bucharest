import assert from 'node:assert/strict'
import test from 'node:test'

import { createSearchProbe } from '@/search/evaluation/probe'

test('returns frontier entries in minimum-first order', () => {
  const probe = createSearchProbe()
  const frontier = probe.frontier<number>((left, right) => left - right)

  frontier.push(5)
  frontier.push(1)
  frontier.push(3)

  assert.equal(frontier.pop(), 1)
  assert.equal(frontier.pop(), 3)
  assert.equal(frontier.pop(), 5)
  assert.equal(frontier.pop(), undefined)
  assert.deepEqual(probe.snapshot(), {
    nodesGenerated: 3,
    nodesExpanded: 0,
    frontierPushes: 3,
    frontierPops: 3,
    peakFrontierEntries: 3,
    closedSetEntries: 0,
    costTableEntries: 0,
    edgesExamined: 0,
    heuristicEvaluations: 0,
    customCounts: {},
  })
})

test('counts only unique closed-set insertions as expansions', () => {
  const probe = createSearchProbe()
  const closed = probe.closedSet<string>()

  assert.equal(closed.add('arad'), true)
  assert.equal(closed.add('arad'), false)
  assert.equal(closed.has('arad'), true)
  assert.equal(closed.size, 1)
  assert.equal(probe.snapshot().nodesExpanded, 1)
  assert.equal(probe.snapshot().closedSetEntries, 1)
})

test('does not count a cost-table replacement as another entry', () => {
  const probe = createSearchProbe()
  const costs = probe.costTable<string, number>()

  costs.set('sibiu', 140)
  costs.set('sibiu', 120)

  assert.equal(costs.has('sibiu'), true)
  assert.equal(costs.get('sibiu'), 120)
  assert.equal(costs.size, 1)
  assert.equal(probe.snapshot().costTableEntries, 1)
})

test('counts examined edges, heuristic evaluations, and custom work', () => {
  const probe = createSearchProbe()

  probe.countEdgeExamined()
  probe.countEdgeExamined()
  probe.countHeuristicEvaluation()
  probe.count('staleEntries')
  probe.count('staleEntries', 2)
  probe.count('reopenedCities')

  const snapshot = probe.snapshot()
  assert.equal(snapshot.edgesExamined, 2)
  assert.equal(snapshot.heuristicEvaluations, 1)
  assert.deepEqual(snapshot.customCounts, {
    staleEntries: 3,
    reopenedCities: 1,
  })
})

test('rejects invalid custom counter input', () => {
  const probe = createSearchProbe()

  assert.throws(() => probe.count(''), RangeError)
  assert.throws(() => probe.count('work', 0), RangeError)
  assert.throws(() => probe.count('work', 1.5), RangeError)
})

test('keeps separate probe instances isolated', () => {
  const first = createSearchProbe()
  const second = createSearchProbe()

  first.frontier<number>((left, right) => left - right).push(1)

  assert.equal(first.snapshot().nodesGenerated, 1)
  assert.equal(second.snapshot().nodesGenerated, 0)
})

test('returns snapshots that do not change with later probe activity', () => {
  const probe = createSearchProbe()
  const frontier = probe.frontier<number>((left, right) => left - right)
  const beforePush = probe.snapshot()

  frontier.push(1)

  assert.equal(beforePush.nodesGenerated, 0)
  assert.equal(probe.snapshot().nodesGenerated, 1)
  assert.equal(Object.isFrozen(beforePush), true)
  assert.equal(Object.isFrozen(beforePush.customCounts), true)
})
