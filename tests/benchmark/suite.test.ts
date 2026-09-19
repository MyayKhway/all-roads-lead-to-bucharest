import assert from 'node:assert/strict'
import test from 'node:test'

import { referenceDijkstra } from '@/benchmark/reference'
import { runBenchmarkSuite } from '@/benchmark/suite'
import { romaniaGraph } from '@/data/graph'
import type { SearchAlgorithm } from '@/search/contracts'
import type { SearchVariant } from '@/search/variant'

const instrumentedShortestPath: SearchAlgorithm = (problem, context) => {
  const frontier = context.probe?.frontier<number>((left, right) => left - right)
  frontier?.push(1)
  frontier?.pop()
  context.probe?.closedSet<string>().add(problem.start)

  if (context.heuristic !== undefined) {
    context.heuristic(problem.start, problem)
    context.probe?.countHeuristicEvaluation()
  }

  return referenceDijkstra(problem, {})
}

const BLIND_VARIANT: SearchVariant = {
  id: 'blind-search',
  name: 'Person 1 blind baseline',
  algorithmName: 'Blind search',
  heuristicName: null,
  author: 'Person 1',
  algorithm: instrumentedShortestPath,
}

const HEURISTIC_VARIANT: SearchVariant = {
  id: 'heuristic-search',
  name: 'Person 2 heuristic experiment',
  algorithmName: 'A*',
  heuristicName: 'Test heuristic',
  author: 'Person 2',
  algorithm: instrumentedShortestPath,
  heuristic: () => 0,
}

const VARIANTS: readonly SearchVariant[] = [BLIND_VARIANT, HEURISTIC_VARIANT]

test('runs every selected variant against every city pair', () => {
  const records = runBenchmarkSuite({
    graph: romaniaGraph,
    variants: VARIANTS,
    cityPairs: [
      { start: 'arad', goal: 'bucharest' },
      { start: 'sibiu', goal: 'bucharest' },
    ],
  })

  assert.equal(records.length, 4)
  assert.deepEqual(
    records.map(({ variantId, start, goal }) => ({ variantId, start, goal })),
    [
      { variantId: 'blind-search', start: 'arad', goal: 'bucharest' },
      { variantId: 'heuristic-search', start: 'arad', goal: 'bucharest' },
      { variantId: 'blind-search', start: 'sibiu', goal: 'bucharest' },
      { variantId: 'heuristic-search', start: 'sibiu', goal: 'bucharest' },
    ],
  )

  for (const record of records) {
    assert.equal(record.execution.metrics.resultValid, true)
    assert.equal(record.comparison.isOptimal, true)
    assert.equal(record.timing, null)
  }
})

test('retains variant metadata and passes its heuristic to the algorithm', () => {
  const records = runBenchmarkSuite({
    graph: romaniaGraph,
    variants: VARIANTS,
    cityPairs: [{ start: 'arad', goal: 'bucharest' }],
  })

  const blindRecord = records[0]
  const heuristicRecord = records[1]
  assert.ok(blindRecord !== undefined)
  assert.ok(heuristicRecord !== undefined)

  assert.equal(blindRecord.variantName, 'Person 1 blind baseline')
  assert.equal(blindRecord.algorithmName, 'Blind search')
  assert.equal(blindRecord.heuristicName, null)
  assert.equal(blindRecord.author, 'Person 1')
  assert.equal(blindRecord.execution.metrics.heuristicEvaluations, 0)
  assert.equal(heuristicRecord.variantName, 'Person 2 heuristic experiment')
  assert.equal(heuristicRecord.algorithmName, 'A*')
  assert.equal(heuristicRecord.heuristicName, 'Test heuristic')
  assert.equal(heuristicRecord.author, 'Person 2')
  assert.equal(heuristicRecord.execution.metrics.heuristicEvaluations, 1)
})

test('measures timing only for city pairs that opt in', () => {
  const records = runBenchmarkSuite({
    graph: romaniaGraph,
    variants: [BLIND_VARIANT],
    cityPairs: [
      { start: 'arad', goal: 'sibiu', measureTiming: true },
      { start: 'arad', goal: 'bucharest' },
    ],
    timingOptions: {
      warmupMs: 0,
      minTrialMs: 1,
      trials: 2,
    },
  })

  const timedRecord = records[0]
  const untimedRecord = records[1]
  assert.ok(timedRecord !== undefined)
  assert.ok(untimedRecord !== undefined)
  assert.notEqual(timedRecord.timing, null)
  assert.equal(untimedRecord.timing, null)
})

test('does not time an invalid result', () => {
  const invalidVariant: SearchVariant = {
    id: 'invalid-search',
    name: 'Invalid search',
    algorithmName: 'Broken algorithm',
    heuristicName: null,
    author: 'Person 3',
    algorithm: () => ({
      status: 'success',
      path: ['arad', 'zerind'],
      pathCost: 75,
    }),
  }
  const records = runBenchmarkSuite({
    graph: romaniaGraph,
    variants: [invalidVariant],
    cityPairs: [{ start: 'arad', goal: 'bucharest', measureTiming: true }],
    timingOptions: {
      warmupMs: 0,
      minTrialMs: 1,
      trials: 2,
    },
  })

  const record = records[0]
  assert.ok(record !== undefined)
  assert.equal(record.execution.metrics.resultValid, false)
  assert.equal(record.timing, null)
})

test('runs repeated city pairs while keeping references internal', () => {
  const records = runBenchmarkSuite({
    graph: romaniaGraph,
    variants: [BLIND_VARIANT],
    cityPairs: [
      { start: 'arad', goal: 'bucharest' },
      { start: 'arad', goal: 'bucharest' },
    ],
  })

  assert.equal(records.length, 2)
})

test('rejects duplicate or empty variant IDs', () => {
  const duplicateVariants: readonly SearchVariant[] = [
    BLIND_VARIANT,
    { ...HEURISTIC_VARIANT, id: 'blind-search' },
  ]
  const emptyIdVariant: SearchVariant = {
    ...BLIND_VARIANT,
    id: '  ',
  }

  assert.throws(
    () =>
      runBenchmarkSuite({
        graph: romaniaGraph,
        variants: duplicateVariants,
        cityPairs: [],
      }),
    /Duplicate search variant ID/,
  )
  assert.throws(
    () =>
      runBenchmarkSuite({
        graph: romaniaGraph,
        variants: [emptyIdVariant],
        cityPairs: [],
      }),
    /must not be empty/,
  )
})
