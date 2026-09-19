import assert from 'node:assert/strict'
import test from 'node:test'
import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchProblem, SearchResult } from '@/search/contracts'
import { executeSearch } from '@/search/evaluation/execution'
import { compareWithReference } from '@/search/evaluation/referenceComparison'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'

function executeResult(problem: SearchProblem, result: SearchResult) {
  return executeSearch({
    problem,
    algorithm: () => result,
  })
}

const ARAD_TO_BUCHAREST: SearchProblem = {
  graph: romaniaGraph,
  start: 'arad',
  goal: 'bucharest',
}

test('identifies an optimal candidate', () => {
  const referenceResult = referenceDijkstra(ARAD_TO_BUCHAREST, {})
  const execution = executeResult(ARAD_TO_BUCHAREST, referenceResult)

  assert.deepEqual(compareWithReference(execution, referenceResult), {
    referencePathCost: 418,
    isOptimal: true,
    costOvershoot: 0,
    costOvershootPercentage: 0,
  })
})

test('calculates cost overshoot for a valid suboptimal candidate', () => {
  const referenceResult = referenceDijkstra(ARAD_TO_BUCHAREST, {})
  const execution = executeResult(ARAD_TO_BUCHAREST, {
    status: 'success',
    path: ['arad', 'sibiu', 'fagaras', 'bucharest'],
    pathCost: 450,
  })

  const comparison = compareWithReference(execution, referenceResult)
  assert.equal(comparison.isOptimal, false)
  assert.equal(comparison.costOvershoot, 32)
  assert.ok(comparison.costOvershootPercentage !== null)
  assert.ok(Math.abs(comparison.costOvershootPercentage - (32 / 418) * 100) < 1e-12)
})

test('does not compare an invalid candidate with the reference', () => {
  const referenceResult = referenceDijkstra(ARAD_TO_BUCHAREST, {})
  const execution = executeResult(ARAD_TO_BUCHAREST, {
    status: 'success',
    path: ['arad', 'zerind'],
    pathCost: 75,
  })

  assert.deepEqual(compareWithReference(execution, referenceResult), {
    referencePathCost: 418,
    isOptimal: null,
    costOvershoot: null,
    costOvershootPercentage: null,
  })
})

test('does not assign path optimality when both results are unreachable', () => {
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
  const failure: SearchResult = { status: 'failure', reason: 'unreachable' }
  const execution = executeResult(problem, failure)

  assert.deepEqual(compareWithReference(execution, failure), {
    referencePathCost: null,
    isOptimal: null,
    costOvershoot: null,
    costOvershootPercentage: null,
  })
})

test('handles a zero-cost start-to-goal comparison', () => {
  const problem: SearchProblem = {
    graph: romaniaGraph,
    start: 'arad',
    goal: 'arad',
  }
  const result: SearchResult = {
    status: 'success',
    path: ['arad'],
    pathCost: 0,
  }
  const execution = executeResult(problem, result)

  assert.deepEqual(compareWithReference(execution, result), {
    referencePathCost: 0,
    isOptimal: true,
    costOvershoot: 0,
    costOvershootPercentage: 0,
  })
})
