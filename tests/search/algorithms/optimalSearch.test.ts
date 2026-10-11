import assert from 'node:assert/strict'
import test from 'node:test'

import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { SearchAlgorithmContext, SearchProblem } from '@/search/contracts'
import { createSearchProbe } from '@/search/evaluation/probe'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import { ntbHeuristic } from '@/search/heuristics/ntb'
import { validateSearchResult } from '@/search/validation'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'
import { ucsVariant } from '@/search/variants/ucs'

// Both variants promise optimal routes, so they share one set of expectations.
const optimalVariants = [ntbAstarVariant, ucsVariant]

function contextFor(variant: (typeof optimalVariants)[number]): SearchAlgorithmContext {
  const { heuristic } = variant
  return { ...(heuristic === undefined ? {} : { heuristic }), probe: createSearchProbe() }
}

for (const variant of optimalVariants) {
  test(`${variant.name} finds the textbook route from Arad to Bucharest`, () => {
    const problem: SearchProblem = { graph: romaniaGraph, start: 'arad', goal: 'bucharest' }

    assert.deepEqual(variant.algorithm(problem, contextFor(variant)), {
      status: 'success',
      path: ['arad', 'sibiu', 'rimnicu', 'pitesti', 'bucharest'],
      pathCost: 418,
    })
  })

  test(`${variant.name} returns a zero-cost route when start equals goal`, () => {
    const problem: SearchProblem = { graph: romaniaGraph, start: 'arad', goal: 'arad' }

    assert.deepEqual(variant.algorithm(problem, contextFor(variant)), {
      status: 'success',
      path: ['arad'],
      pathCost: 0,
    })
  })

  test(`${variant.name} reports an unreachable goal`, () => {
    const disconnected: WeightedGraph = {
      cityIds: ['arad', 'sibiu', 'bucharest'],
      edges: [{ from: 'arad', to: 'sibiu', distance: 140 }],
      adjacency: {
        arad: [{ city: 'sibiu', distance: 140 }],
        sibiu: [{ city: 'arad', distance: 140 }],
        bucharest: [],
      },
    }
    const problem: SearchProblem = { graph: disconnected, start: 'arad', goal: 'bucharest' }

    assert.deepEqual(variant.algorithm(problem, contextFor(variant)), {
      status: 'failure',
      reason: 'unreachable',
    })
  })

  test(`${variant.name} matches the reference cost for every city pair`, () => {
    for (const start of romaniaGraph.cityIds) {
      for (const goal of romaniaGraph.cityIds) {
        const problem: SearchProblem = { graph: romaniaGraph, start, goal }
        const result = variant.algorithm(problem, contextFor(variant))
        const reference = referenceDijkstra(problem, {})
        if (result.status !== 'success' || reference.status !== 'success') {
          assert.fail(`Expected a route from ${start} to ${goal}`)
        }

        assert.equal(validateSearchResult(problem, result).status, 'valid')
        assert.equal(result.pathCost, reference.pathCost, `${start} -> ${goal}`)
      }
    }
  })
}

test('A* + NTB expands fewer cities than uniform-cost search from Arad to Bucharest', () => {
  const problem: SearchProblem = { graph: romaniaGraph, start: 'arad', goal: 'bucharest' }
  const astarProbe = createSearchProbe()
  const ucsProbe = createSearchProbe()

  ntbAstarVariant.algorithm(problem, { heuristic: ntbHeuristic, probe: astarProbe })
  ucsVariant.algorithm(problem, { probe: ucsProbe })

  assert.ok(astarProbe.snapshot().nodesExpanded < ucsProbe.snapshot().nodesExpanded)
})
