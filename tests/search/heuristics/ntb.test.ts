import assert from 'node:assert/strict'
import test from 'node:test'

import type { CityId } from '@/data/cityIds'
import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchProblem } from '@/search/contracts'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { ntbHeuristic } from '@/search/heuristics/ntb'

function problemFor(graph: WeightedGraph, current: CityId, goal: CityId): SearchProblem {
  return { graph, start: current, goal }
}

function shortestCost(current: CityId, goal: CityId): number {
  const result = referenceDijkstra(problemFor(romaniaGraph, current, goal), {})
  if (result.status !== 'success') {
    assert.fail(`Expected ${current} to reach ${goal}`)
  }
  return result.pathCost
}

test('returns zero at the goal', () => {
  for (const goal of romaniaGraph.cityIds) {
    assert.equal(ntbHeuristic(goal, problemFor(romaniaGraph, goal, goal)), 0)
  }
})

test('sums one minimum boundary toll per hop layer on a chain', () => {
  // arad -5- sibiu -7- bucharest: every route from arad must cross both layer boundaries.
  const chain: WeightedGraph = {
    cityIds: ['arad', 'sibiu', 'bucharest'],
    edges: [
      { from: 'arad', to: 'sibiu', distance: 5 },
      { from: 'sibiu', to: 'bucharest', distance: 7 },
    ],
    adjacency: {
      arad: [{ city: 'sibiu', distance: 5 }],
      sibiu: [
        { city: 'arad', distance: 5 },
        { city: 'bucharest', distance: 7 },
      ],
      bucharest: [{ city: 'sibiu', distance: 7 }],
    },
  }

  assert.equal(ntbHeuristic('sibiu', problemFor(chain, 'sibiu', 'bucharest')), 7)
  assert.equal(ntbHeuristic('arad', problemFor(chain, 'arad', 'bucharest')), 12)
})

test('returns zero for a city that cannot reach the goal', () => {
  const disconnected: WeightedGraph = {
    cityIds: ['arad', 'sibiu', 'bucharest'],
    edges: [{ from: 'arad', to: 'sibiu', distance: 140 }],
    adjacency: {
      arad: [{ city: 'sibiu', distance: 140 }],
      sibiu: [{ city: 'arad', distance: 140 }],
      bucharest: [],
    },
  }

  assert.equal(ntbHeuristic('arad', problemFor(disconnected, 'arad', 'bucharest')), 0)
})

test('never overestimates the true road distance for any city pair', () => {
  for (const goal of romaniaGraph.cityIds) {
    for (const city of romaniaGraph.cityIds) {
      const estimate = ntbHeuristic(city, problemFor(romaniaGraph, city, goal))
      const actual = shortestCost(city, goal)
      assert.ok(estimate <= actual, `h(${city} -> ${goal}) = ${estimate} exceeds ${actual}`)
    }
  }
})

test('is consistent across every road for every goal', () => {
  for (const goal of romaniaGraph.cityIds) {
    for (const edge of romaniaGraph.edges) {
      for (const [from, to] of [
        [edge.from, edge.to],
        [edge.to, edge.from],
      ] as const) {
        const hFrom = ntbHeuristic(from, problemFor(romaniaGraph, from, goal))
        const hTo = ntbHeuristic(to, problemFor(romaniaGraph, to, goal))
        assert.ok(
          hFrom <= edge.distance + hTo,
          `h(${from}) = ${hFrom} > ${edge.distance} + h(${to}) = ${hTo} for goal ${goal}`,
        )
      }
    }
  }
})
