import assert from 'node:assert/strict'
import test from 'node:test'

import { referenceDijkstra } from '@/benchmark/reference'
import { romaniaGraph } from '@/data/graph'
import { diagnoseSearch } from '@/diagnosis/diagnoseSearch'
import type { SearchAlgorithm } from '@/search/contracts'
import type { SearchVariant } from '@/search/variant'

const observableDijkstra: SearchAlgorithm = (problem, context) => {
  context.eventListener?.({
    type: 'node-expanded',
    city: problem.start,
    pathCost: 0,
  })
  return referenceDijkstra(problem, context)
}

const variant: SearchVariant = {
  id: 'diagnostic-dijkstra',
  name: 'Diagnostic Dijkstra',
  algorithmName: 'Dijkstra',
  heuristicName: null,
  author: 'Test',
  algorithm: observableDijkstra,
}

test('diagnoses one search without calibrated timing', () => {
  const diagnosis = diagnoseSearch({
    graph: romaniaGraph,
    variant,
    start: 'arad',
    goal: 'bucharest',
  })

  assert.equal(diagnosis.execution.validation.status, 'valid')
  assert.equal(diagnosis.comparison.referencePathCost, 418)
  assert.equal(diagnosis.comparison.isOptimal, true)
  assert.deepEqual(
    diagnosis.events.map((event) => event.type),
    ['search-started', 'node-expanded', 'search-ended'],
  )
})
