import assert from 'node:assert/strict'
import test from 'node:test'
import { romaniaGraph } from '@/data/graph'
import type { SearchAlgorithm, SearchEvent, SearchProblem } from '@/search/contracts'
import { executeSearch } from '@/search/evaluation/execution'

const ARAD_TO_SIBIU: SearchProblem = {
  graph: romaniaGraph,
  start: 'arad',
  goal: 'sibiu',
}

const measuredAlgorithm: SearchAlgorithm = (problem, context) => {
  const { probe } = context
  if (probe === undefined) {
    throw new Error('Expected the execution harness to provide a probe')
  }

  const frontier = probe.frontier<number>((left, right) => left - right)
  frontier.push(2)
  frontier.push(1)
  frontier.pop()
  probe.closedSet<string>().add(problem.start)
  probe.costTable<string, number>().set(problem.start, 0)
  probe.countEdgeExamined()

  if (context.heuristic !== undefined) {
    context.heuristic(problem.start, problem)
    probe.countHeuristicEvaluation()
  }

  return {
    status: 'success',
    path: ['arad', 'sibiu'],
    pathCost: 140,
  }
}

test('executes, validates, and measures one search case', () => {
  const execution = executeSearch({
    problem: ARAD_TO_SIBIU,
    algorithm: measuredAlgorithm,
    heuristic: () => 1,
  })

  assert.equal(execution.validation.status, 'valid')
  assert.equal(execution.metrics.resultValid, true)
  assert.equal(execution.metrics.goalReached, true)
  assert.equal(execution.metrics.calculatedPathCost, 140)
  assert.equal(execution.metrics.pathEdgeCount, 1)
  assert.equal(execution.metrics.nodesGenerated, 2)
  assert.equal(execution.metrics.nodesExpanded, 1)
  assert.equal(execution.metrics.edgesExamined, 1)
  assert.equal(execution.metrics.heuristicEvaluations, 1)
})

test('emits harness boundary events around the algorithm', () => {
  const events: SearchEvent[] = []

  executeSearch({
    problem: ARAD_TO_SIBIU,
    algorithm: measuredAlgorithm,
    eventListener: (event) => events.push(event),
  })

  assert.deepEqual(
    events.map((event) => event.type),
    ['search-started', 'search-ended'],
  )
})

test('uses a fresh probe for every execution', () => {
  const first = executeSearch({ problem: ARAD_TO_SIBIU, algorithm: measuredAlgorithm })
  const second = executeSearch({ problem: ARAD_TO_SIBIU, algorithm: measuredAlgorithm })

  assert.equal(first.metrics.nodesGenerated, 2)
  assert.equal(second.metrics.nodesGenerated, 2)
})

test('allows algorithm exceptions to remain visible', () => {
  const failingAlgorithm: SearchAlgorithm = () => {
    throw new Error('Algorithm failed')
  }

  assert.throws(
    () => executeSearch({ problem: ARAD_TO_SIBIU, algorithm: failingAlgorithm }),
    /Algorithm failed/,
  )
})
