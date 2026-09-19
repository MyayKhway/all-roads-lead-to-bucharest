import assert from 'node:assert/strict'
import test from 'node:test'
import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchProblem } from '@/search/contracts'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { validateSearchResult } from '@/search/validation'

test('finds the textbook shortest path from Arad to Bucharest', () => {
  const problem: SearchProblem = {
    graph: romaniaGraph,
    start: 'arad',
    goal: 'bucharest',
  }

  const result = referenceDijkstra(problem, {})

  assert.deepEqual(result, {
    status: 'success',
    path: ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
    pathCost: 418,
  })
  assert.deepEqual(validateSearchResult(problem, result), {
    status: 'valid',
    calculatedPathCost: 418,
  })
})

test('returns a zero-cost path when start and goal are the same city', () => {
  const problem: SearchProblem = {
    graph: romaniaGraph,
    start: 'arad',
    goal: 'arad',
  }

  assert.deepEqual(referenceDijkstra(problem, {}), {
    status: 'success',
    path: ['arad'],
    pathCost: 0,
  })
})

test('returns unreachable when the goal is in a disconnected component', () => {
  const disconnectedGraph: WeightedGraph = {
    cityIds: ['arad', 'sibiu', 'bucharest'],
    edges: [{ from: 'arad', to: 'sibiu', distance: 140 }],
    adjacency: {
      arad: [{ city: 'sibiu', distance: 140 }],
      sibiu: [{ city: 'arad', distance: 140 }],
      bucharest: [],
    },
  }
  const problem: SearchProblem = {
    graph: disconnectedGraph,
    start: 'arad',
    goal: 'bucharest',
  }

  const result = referenceDijkstra(problem, {})

  assert.deepEqual(result, {
    status: 'failure',
    reason: 'unreachable',
  })
  assert.deepEqual(validateSearchResult(problem, result), {
    status: 'valid',
    calculatedPathCost: null,
  })
})

test('finds expected shortest costs for additional city pairs', () => {
  const cases = [
    { start: 'sibiu', goal: 'bucharest', expectedCost: 278 },
    { start: 'timisoara', goal: 'bucharest', expectedCost: 536 },
    { start: 'neamt', goal: 'eforie', expectedCost: 505 },
  ] as const

  for (const { start, goal, expectedCost } of cases) {
    const result = referenceDijkstra({ graph: romaniaGraph, start, goal }, {})

    assert.equal(result.status, 'success')
    if (result.status === 'success') {
      assert.equal(result.pathCost, expectedCost)
    }
  }
})

test('returns the same result across repeated runs', () => {
  const problem: SearchProblem = {
    graph: romaniaGraph,
    start: 'lugoj',
    goal: 'iasi',
  }
  const expected = referenceDijkstra(problem, {})

  for (let run = 0; run < 5; run += 1) {
    assert.deepEqual(referenceDijkstra(problem, {}), expected)
  }
})
