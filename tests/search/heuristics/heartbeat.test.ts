import assert from 'node:assert/strict'
import test from 'node:test'
import { CITY_IDS } from '@/data/cityIds'
import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchProblem } from '@/search/contracts'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { heartbeatHeuristic } from '@/search/heuristics/heartbeat'

const GOALS = ['bucharest', 'arad', 'iasi'] as const

test('heartbeatHeuristic is zero at the goal', () => {
  for (const goal of GOALS) {
    assert.equal(heartbeatHeuristic(goal, { graph: romaniaGraph, start: goal, goal }), 0)
  }
})

test('heartbeatHeuristic never overestimates the true remaining road distance (admissibility)', () => {
  for (const goal of GOALS) {
    for (const current of CITY_IDS) {
      const problem: SearchProblem = { graph: romaniaGraph, start: current, goal }
      const reference = referenceDijkstra(problem, {})
      if (reference.status !== 'success') continue // unreachable, not applicable

      const h = heartbeatHeuristic(current, problem)
      assert.ok(
        h <= reference.pathCost,
        `${current} -> ${goal}: heartbeat (${h}) exceeded the true shortest distance (${reference.pathCost})`,
      )
      assert.ok(h >= 0, `${current} -> ${goal}: heartbeat must be non-negative`)
    }
  }
})

test('heartbeatHeuristic is consistent: h(u) <= edgeCost(u, v) + h(v) for every road', () => {
  for (const goal of GOALS) {
    for (const edge of romaniaGraph.edges) {
      const problem: SearchProblem = { graph: romaniaGraph, start: edge.from, goal }
      const hFrom = heartbeatHeuristic(edge.from, problem)
      const hTo = heartbeatHeuristic(edge.to, { ...problem, start: edge.to })

      assert.ok(
        hFrom <= edge.distance + hTo,
        `${edge.from} -> ${edge.to} (goal ${goal}): consistency violated (${hFrom} > ${edge.distance} + ${hTo})`,
      )
      assert.ok(
        hTo <= edge.distance + hFrom,
        `${edge.to} -> ${edge.from} (goal ${goal}): consistency violated (${hTo} > ${edge.distance} + ${hFrom})`,
      )
    }
  }
})

test('heartbeatHeuristic is deterministic across repeated calls', () => {
  const problem: SearchProblem = { graph: romaniaGraph, start: 'lugoj', goal: 'iasi' }
  const expected = heartbeatHeuristic('lugoj', problem)

  for (let i = 0; i < 5; i += 1) {
    assert.equal(heartbeatHeuristic('lugoj', problem), expected)
  }
})

test('stays finite when a landmark cannot reach every city', () => {
  // A small graph with two components; the farthest-point landmark search can
  // still pick a landmark stranded in the other component from some queries.
  const splitGraph: WeightedGraph = {
    cityIds: ['arad', 'sibiu', 'bucharest', 'giurgiu'],
    edges: [
      { from: 'arad', to: 'sibiu', distance: 140 },
      { from: 'bucharest', to: 'giurgiu', distance: 90 },
    ],
    adjacency: {
      arad: [{ city: 'sibiu', distance: 140 }],
      sibiu: [{ city: 'arad', distance: 140 }],
      bucharest: [{ city: 'giurgiu', distance: 90 }],
      giurgiu: [{ city: 'bucharest', distance: 90 }],
    },
  }

  const problem: SearchProblem = { graph: splitGraph, start: 'arad', goal: 'bucharest' }
  const h = heartbeatHeuristic('arad', problem)

  assert.ok(Number.isFinite(h))
  assert.ok(h >= 0)
})
