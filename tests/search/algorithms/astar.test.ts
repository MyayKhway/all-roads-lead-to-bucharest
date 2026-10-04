import assert from 'node:assert/strict'
import test from 'node:test'
import { romaniaGraph } from '@/data/graph'
import { astar } from '@/search/algorithms/astar'
import type { SearchProblem } from '@/search/contracts'
import { executeSearch } from '@/search/evaluation/execution'
import { compareWithReference } from '@/search/evaluation/referenceComparison'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { heartbeatHeuristic } from '@/search/heuristics/heartbeat'

const PAIRS = [
  { start: 'arad', goal: 'bucharest' },
  { start: 'sibiu', goal: 'bucharest' },
  { start: 'timisoara', goal: 'bucharest' },
  { start: 'oradea', goal: 'bucharest' },
  { start: 'neamt', goal: 'eforie' },
  { start: 'lugoj', goal: 'iasi' },
] as const

test('blind A* (no heuristic) matches the reference shortest path', () => {
  for (const { start, goal } of PAIRS) {
    const problem: SearchProblem = { graph: romaniaGraph, start, goal }
    const execution = executeSearch({ problem, algorithm: astar })
    const reference = referenceDijkstra(problem, {})

    assert.equal(execution.validation.status, 'valid')
    assert.deepEqual(compareWithReference(execution, reference).isOptimal, true)
  }
})

test('A* with the Heartbeat heuristic matches the reference shortest path', () => {
  for (const { start, goal } of PAIRS) {
    const problem: SearchProblem = { graph: romaniaGraph, start, goal }
    const execution = executeSearch({ problem, algorithm: astar, heuristic: heartbeatHeuristic })
    const reference = referenceDijkstra(problem, {})

    assert.equal(execution.validation.status, 'valid')
    assert.deepEqual(compareWithReference(execution, reference).isOptimal, true)
  }
})

test('finds the textbook shortest path from Arad to Bucharest', () => {
  const problem: SearchProblem = { graph: romaniaGraph, start: 'arad', goal: 'bucharest' }
  const execution = executeSearch({ problem, algorithm: astar, heuristic: heartbeatHeuristic })

  assert.deepEqual(execution.result, {
    status: 'success',
    path: ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
    pathCost: 418,
  })
})

test('returns a zero-cost path when start and goal are the same city', () => {
  const problem: SearchProblem = { graph: romaniaGraph, start: 'arad', goal: 'arad' }
  const execution = executeSearch({ problem, algorithm: astar, heuristic: heartbeatHeuristic })

  assert.deepEqual(execution.result, {
    status: 'success',
    path: ['arad'],
    pathCost: 0,
  })
})

test('returns unreachable when the goal is in a disconnected component', () => {
  const disconnectedGraph = {
    cityIds: ['arad', 'sibiu', 'bucharest'],
    edges: [{ from: 'arad', to: 'sibiu', distance: 140 }],
    adjacency: {
      arad: [{ city: 'sibiu', distance: 140 }],
      sibiu: [{ city: 'arad', distance: 140 }],
      bucharest: [],
    },
  } as const
  const problem: SearchProblem = { graph: disconnectedGraph, start: 'arad', goal: 'bucharest' }

  const execution = executeSearch({ problem, algorithm: astar, heuristic: heartbeatHeuristic })

  assert.deepEqual(execution.result, { status: 'failure', reason: 'unreachable' })
})

test('returns the same result across repeated runs', () => {
  const problem: SearchProblem = { graph: romaniaGraph, start: 'lugoj', goal: 'iasi' }
  const run = () =>
    executeSearch({ problem, algorithm: astar, heuristic: heartbeatHeuristic }).result
  const expected = run()

  for (let i = 0; i < 5; i += 1) {
    assert.deepEqual(run(), expected)
  }
})

test('requires an evaluation probe', () => {
  const problem: SearchProblem = { graph: romaniaGraph, start: 'arad', goal: 'bucharest' }
  assert.throws(() => astar(problem, {}), /requires an evaluation probe/)
})
