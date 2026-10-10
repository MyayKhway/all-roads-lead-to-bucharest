import assert from 'node:assert/strict'
import test from 'node:test'
import { createMagneticFieldAStar } from '@/algorithms/magneticFieldAStar'
import { CITY_IDS } from '@/data/cityIds'
import { cityPixelCoordinates, manhattanPixelDistance } from '@/data/cityPixelCoordinates'
import { romaniaGraph } from '@/data/graph'
import {
  cachedMagneticHeuristic,
  calculateMagneticHeuristic,
  calculateManhattanEstimate,
  calculateMinimumRoadCostPerPixel,
  convertAlignmentToPullStrength,
  MAGNETIC_ALIGNMENT_V2_ALPHA,
  magneticHeuristic,
  precomputeMagneticHeuristic,
} from '@/heuristics/magneticAlignmentV2'
import { executeSearch } from '@/search/evaluation/execution'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'

test('has integer pixel coordinates for every city', () => {
  assert.deepEqual(Object.keys(cityPixelCoordinates).sort(), [...CITY_IDS].sort())
  for (const city of CITY_IDS) {
    assert.ok(Number.isInteger(cityPixelCoordinates[city].x))
    assert.ok(Number.isInteger(cityPixelCoordinates[city].y))
  }
})

test('calculates Manhattan distance from the measured map coordinates', () => {
  assert.equal(manhattanPixelDistance('sibiu', 'bucharest'), 818)
})

test('calibrates pixels with the minimum supplied road ratio', () => {
  assert.equal(calculateMinimumRoadCostPerPixel(romaniaGraph), 97 / 333)
})

test('returns zero at the goal and a positive Manhattan estimate elsewhere', () => {
  const problem = { graph: romaniaGraph, start: 'sibiu' as const, goal: 'bucharest' as const }
  assert.equal(calculateManhattanEstimate('bucharest', problem), 0)
  assert.equal(calculateManhattanEstimate('sibiu', problem), (97 / 333) * 818)
})

test('maps the complete cosine range into magnetic strength', () => {
  assert.equal(convertAlignmentToPullStrength(-1), 0)
  assert.equal(convertAlignmentToPullStrength(0), 0.5)
  assert.equal(convertAlignmentToPullStrength(1), 1)
})

test('distinguishes toward, sideways, and away-facing roads', () => {
  const problem = { graph: romaniaGraph, start: 'sibiu' as const, goal: 'bucharest' as const }

  for (const neighbor of romaniaGraph.adjacency.sibiu ?? []) {
    const transition = { from: 'sibiu' as const, to: neighbor.city, roadCost: neighbor.distance }
    const v2 = calculateMagneticHeuristic(neighbor.city, problem, transition)

    assert.equal(v2.magneticFactor, (v2.alignment + 1) / 2)
    assert.equal(
      v2.adjustedHeuristic,
      v2.baseHeuristic * (1 - MAGNETIC_ALIGNMENT_V2_ALPHA * v2.magneticFactor),
    )
    assert.ok(v2.adjustedHeuristic <= v2.baseHeuristic)
  }
})

test('uses zero for the starting city because it has no incoming road', () => {
  const problem = { graph: romaniaGraph, start: 'arad' as const, goal: 'bucharest' as const }
  assert.equal(cachedMagneticHeuristic('arad', problem), 0)
})

test('precomputed V2 values match the formula for every road and goal', () => {
  for (const goal of CITY_IDS) {
    const problem = { graph: romaniaGraph, start: 'arad' as const, goal }
    for (const from of CITY_IDS) {
      for (const neighbor of romaniaGraph.adjacency[from] ?? []) {
        const transition = { from, to: neighbor.city, roadCost: neighbor.distance }
        const expected = calculateMagneticHeuristic(
          neighbor.city,
          problem,
          transition,
        ).adjustedHeuristic
        assert.equal(cachedMagneticHeuristic(neighbor.city, problem, transition), expected)
      }
    }
  }
})

test('rejects alpha outside zero through one', () => {
  assert.throws(() => precomputeMagneticHeuristic(-0.01), /between 0 and 1/)
  assert.throws(() => precomputeMagneticHeuristic(1.01), /between 0 and 1/)
})

test('returns an optimal route for every ordered city pair', () => {
  const algorithm = createMagneticFieldAStar(cachedMagneticHeuristic)

  for (const start of CITY_IDS) {
    for (const goal of CITY_IDS) {
      const problem = { graph: romaniaGraph, start, goal }
      const expected = referenceDijkstra(problem, {})
      const execution = executeSearch({
        problem,
        algorithm,
        heuristic: magneticHeuristic,
      })

      assert.equal(expected.status, 'success')
      assert.equal(execution.validation.status, 'valid', `${start} -> ${goal}`)
      assert.equal(execution.result.status, 'success', `${start} -> ${goal}`)
      if (expected.status === 'success' && execution.result.status === 'success') {
        assert.equal(execution.result.pathCost, expected.pathCost, `${start} -> ${goal}`)
      }
    }
  }
})
