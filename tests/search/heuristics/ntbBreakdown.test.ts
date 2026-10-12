import assert from 'node:assert/strict'
import test from 'node:test'

import { romaniaGraph } from '@/data/graph'
import { ntbHeuristic } from '@/search/heuristics/ntb'
import { explainNtb } from '@/search/heuristics/ntbBreakdown'

test('breaks h(Arad → Bucharest) into one toll per ring boundary', () => {
  const breakdown = explainNtb(romaniaGraph, 'arad', 'bucharest')

  assert.deepEqual(
    breakdown.tolls.map((t) => [t.threshold, t.road.from, t.road.to, t.road.distance]),
    [
      [1, 'pitesti', 'bucharest', 101],
      [2, 'rimnicu', 'pitesti', 97],
      [3, 'drobeta', 'craiova', 120],
    ],
  )
  assert.equal(breakdown.total, 318)
})

test('matches the NTB heuristic for every city and goal', () => {
  for (const goal of romaniaGraph.cityIds) {
    for (const city of romaniaGraph.cityIds) {
      const expected = ntbHeuristic(city, { graph: romaniaGraph, start: city, goal })
      assert.equal(explainNtb(romaniaGraph, city, goal).total, expected, `${city} -> ${goal}`)
    }
  }
})
