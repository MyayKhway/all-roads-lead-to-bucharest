import assert from 'node:assert/strict'
import test from 'node:test'

import type { CityId } from '@/data/cityIds'
import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchProblem, SearchResult } from '@/search/contracts'
import {
  type SearchResultValidation,
  type ValidationIssueCode,
  validateSearchResult,
} from '@/search/validation'

const aradToBucharest: SearchProblem = {
  graph: romaniaGraph,
  start: 'arad',
  goal: 'bucharest',
}

function issueCodes(validation: SearchResultValidation): readonly ValidationIssueCode[] {
  if (validation.status !== 'invalid') {
    assert.fail('Expected an invalid search result')
  }

  return validation.issues.map((issue) => issue.code)
}

test('accepts a valid path and calculates its cost from the graph', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
    pathCost: 418,
  }

  assert.deepEqual(validateSearchResult(aradToBucharest, result), {
    status: 'valid',
    calculatedPathCost: 418,
  })
})

test('accepts a valid but suboptimal path', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'zerind', 'arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
    pathCost: 568,
  }

  assert.deepEqual(validateSearchResult(aradToBucharest, result), {
    status: 'valid',
    calculatedPathCost: 568,
  })
})

test('rejects an empty successful path', () => {
  const result: SearchResult = {
    status: 'success',
    path: [],
    pathCost: 0,
  }

  const validation = validateSearchResult(aradToBucharest, result)

  assert.deepEqual(issueCodes(validation), ['empty-path'])
  assert.equal(validation.calculatedPathCost, null)
})

test('reports incorrect path endpoints while preserving a calculable cost', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['sibiu', 'fagaras'],
    pathCost: 99,
  }

  const validation = validateSearchResult(aradToBucharest, result)

  assert.deepEqual(issueCodes(validation), ['incorrect-start', 'incorrect-goal'])
  assert.equal(validation.calculatedPathCost, 99)
})

test('rejects a city outside the supplied graph without reporting a missing road', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'not-a-city', 'bucharest'] as unknown as readonly CityId[],
    pathCost: 0,
  }

  const validation = validateSearchResult(aradToBucharest, result)

  assert.deepEqual(issueCodes(validation), ['invalid-city'])
  assert.equal(validation.calculatedPathCost, null)
})

test('rejects consecutive cities that do not share a road', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'bucharest'],
    pathCost: 0,
  }

  const validation = validateSearchResult(aradToBucharest, result)

  assert.deepEqual(issueCodes(validation), ['missing-road'])
  assert.equal(validation.calculatedPathCost, null)
})

test('rejects non-finite and negative reported path costs', () => {
  for (const pathCost of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    const result: SearchResult = {
      status: 'success',
      path: ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
      pathCost,
    }

    const validation = validateSearchResult(aradToBucharest, result)

    assert.deepEqual(issueCodes(validation), ['invalid-path-cost'])
    assert.equal(validation.calculatedPathCost, 418)
  }
})

test('rejects a reported cost that differs from the graph-derived cost', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
    pathCost: 400,
  }

  const validation = validateSearchResult(aradToBucharest, result)

  assert.deepEqual(issueCodes(validation), ['path-cost-mismatch'])
  assert.equal(validation.calculatedPathCost, 418)
})

test('rejects an unreachable claim when a route exists', () => {
  const result: SearchResult = {
    status: 'failure',
    reason: 'unreachable',
  }

  assert.deepEqual(issueCodes(validateSearchResult(aradToBucharest, result)), ['false-unreachable'])
})

test('accepts an unreachable claim for a disconnected graph', () => {
  const disconnectedGraph: WeightedGraph = {
    cityIds: ['arad', 'bucharest'],
    edges: [],
    adjacency: {
      arad: [],
      bucharest: [],
    },
  }
  const problem: SearchProblem = {
    graph: disconnectedGraph,
    start: 'arad',
    goal: 'bucharest',
  }
  const result: SearchResult = {
    status: 'failure',
    reason: 'unreachable',
  }

  assert.deepEqual(validateSearchResult(problem, result), {
    status: 'valid',
    calculatedPathCost: null,
  })
})

test('accepts a zero-cost path when start and goal are the same city', () => {
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

  assert.deepEqual(validateSearchResult(problem, result), {
    status: 'valid',
    calculatedPathCost: 0,
  })
})
