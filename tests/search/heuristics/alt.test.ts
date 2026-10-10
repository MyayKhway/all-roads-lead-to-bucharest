import assert from 'node:assert/strict'
import test from 'node:test'

import { romaniaGraph } from '@/data/graph'
import type { SearchProblem } from '@/search/contracts'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { createAltHeuristic } from '@/search/heuristics/alt'

test('ALT is admissible and consistent for every city pair', () => {
  const heuristic = createAltHeuristic(romaniaGraph, { landmarkCount: 3 })

  for (const goal of romaniaGraph.cityIds) {
    const goalProblem: SearchProblem = { graph: romaniaGraph, start: goal, goal }
    assert.equal(heuristic(goal, goalProblem), 0)

    for (const current of romaniaGraph.cityIds) {
      const problem: SearchProblem = { graph: romaniaGraph, start: current, goal }
      const result = referenceDijkstra(problem, {})
      assert.equal(result.status, 'success')
      if (result.status !== 'success') {
        continue
      }

      assert.ok(heuristic(current, problem) <= result.pathCost)

      for (const edge of romaniaGraph.adjacency[current] ?? []) {
        assert.ok(
          heuristic(current, problem) <= edge.distance + heuristic(edge.city, problem),
          `ALT consistency failed for ${current} -> ${edge.city} toward ${goal}`,
        )
      }
    }
  }
})

test('ALT validates landmark count options', () => {
  assert.throws(() => createAltHeuristic(romaniaGraph, { landmarkCount: 0 }), /positive integer/)
  assert.throws(
    () => createAltHeuristic(romaniaGraph, { landmarkCount: romaniaGraph.cityIds.length + 1 }),
    /must not exceed/,
  )
})
