import assert from 'node:assert/strict'
import test from 'node:test'

import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchProblem } from '@/search/contracts'
import { createSearchProbe } from '@/search/evaluation/probe'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { validateSearchResult } from '@/search/validation'
import { bfsVariant } from '@/search/variants/bfs'

function run(problem: SearchProblem) {
  return bfsVariant.algorithm(problem, { probe: createSearchProbe() })
}

test('finds the fewest-roads route from Arad to Bucharest, not the cheapest', () => {
  assert.deepEqual(run({ graph: romaniaGraph, start: 'arad', goal: 'bucharest' }), {
    status: 'success',
    path: ['arad', 'sibiu', 'fagaras', 'bucharest'],
    pathCost: 450,
  })
})

test('returns a zero-cost route when start equals goal', () => {
  assert.deepEqual(run({ graph: romaniaGraph, start: 'arad', goal: 'arad' }), {
    status: 'success',
    path: ['arad'],
    pathCost: 0,
  })
})

test('reports an unreachable goal', () => {
  const disconnected: WeightedGraph = {
    cityIds: ['arad', 'sibiu', 'bucharest'],
    edges: [{ from: 'arad', to: 'sibiu', distance: 140 }],
    adjacency: {
      arad: [{ city: 'sibiu', distance: 140 }],
      sibiu: [{ city: 'arad', distance: 140 }],
      bucharest: [],
    },
  }

  assert.deepEqual(run({ graph: disconnected, start: 'arad', goal: 'bucharest' }), {
    status: 'failure',
    reason: 'unreachable',
  })
})

test('returns a valid route no cheaper than the optimum for every city pair', () => {
  for (const start of romaniaGraph.cityIds) {
    for (const goal of romaniaGraph.cityIds) {
      const problem: SearchProblem = { graph: romaniaGraph, start, goal }
      const result = run(problem)
      const reference = referenceDijkstra(problem, {})
      if (result.status !== 'success' || reference.status !== 'success') {
        assert.fail(`Expected a route from ${start} to ${goal}`)
      }

      assert.equal(validateSearchResult(problem, result).status, 'valid')
      assert.ok(result.pathCost >= reference.pathCost, `${start} -> ${goal}`)
    }
  }
})
