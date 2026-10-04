import assert from 'node:assert/strict'
import test from 'node:test'
import { astar, HEURISTICS } from '../../src/algorithms/astar.js'
import {
  calculateSimulatedHeartRate,
  heartbeatHeuristic,
  manhattanDistance,
} from '../../src/algorithms/heartbeat.js'
import { cities } from '../../src/data/cities.js'
import { CITY_IDS, type CityId } from '../../src/data/cityIds.js'
import { buildAdjacency } from '../../src/data/graph.js'

/**
 * Exact shortest remaining road distance from every city to `goalId`,
 * computed with a plain Dijkstra over the real graph weights (km). This is
 * a *test-only* ground truth used to validate that the Heartbeat heuristic
 * never overestimates — it must never be used inside the production A*
 * search itself (that would defeat the purpose of a heuristic).
 */
function trueShortestDistances(goalId: CityId): Record<string, number> {
  const adjacency = buildAdjacency()
  const dist: Record<string, number> = { [goalId]: 0 }
  const visited = new Set<string>()

  for (;;) {
    let current: string | undefined
    let currentDist = Number.POSITIVE_INFINITY
    for (const id of CITY_IDS) {
      if (visited.has(id)) continue
      const d = dist[id]
      if (d !== undefined && d < currentDist) {
        current = id
        currentDist = d
      }
    }
    if (current === undefined) break
    visited.add(current)

    for (const neighbor of adjacency[current] ?? []) {
      const candidate = currentDist + neighbor.distance
      const known = dist[neighbor.city]
      if (known === undefined || candidate < known) {
        dist[neighbor.city] = candidate
      }
    }
  }

  return dist
}

test('heartbeatHeuristic is a bounded fraction of Manhattan distance', () => {
  const goal = cities.bucharest.position
  for (const id of CITY_IDS) {
    const pos = cities[id].position
    const manhattan = manhattanDistance(pos, goal)
    const heartbeat = heartbeatHeuristic(pos, goal)
    assert.ok(
      heartbeat <= manhattan,
      `${id}: heartbeat (${heartbeat}) exceeded Manhattan distance (${manhattan})`,
    )
    assert.ok(heartbeat >= 0, `${id}: heartbeat must be non-negative`)
  }
  assert.equal(heartbeatHeuristic(goal, goal), 0)
})

test('heartbeatHeuristic never overestimates the true remaining road distance (admissibility)', () => {
  const goalId: CityId = 'bucharest'
  const goalPos = cities[goalId].position
  const trueDist = trueShortestDistances(goalId)

  for (const id of CITY_IDS) {
    const trueRemaining = trueDist[id]
    if (trueRemaining === undefined) continue // unreachable, not applicable

    const h = heartbeatHeuristic(cities[id].position, goalPos)
    assert.ok(
      h <= trueRemaining,
      `${id}: heartbeat heuristic (${h}) exceeded true shortest remaining distance (${trueRemaining})`,
    )
  }
})

test('A* with the Heartbeat heuristic finds the same optimal cost as Straight Line', () => {
  const withHeartbeat = astar('arad', 'bucharest', HEURISTICS.HEARTBEAT)
  const withStraightLine = astar('arad', 'bucharest', HEURISTICS.STRAIGHT_LINE)

  assert.ok(withHeartbeat !== null)
  assert.ok(withStraightLine !== null)
  assert.equal(withHeartbeat?.path[0], 'arad')
  assert.equal(withHeartbeat?.path.at(-1), 'bucharest')
  assert.equal(withHeartbeat?.totalDistance, withStraightLine?.totalDistance)
})

test('calculateSimulatedHeartRate rises with distance and saturates at the cap', () => {
  assert.equal(calculateSimulatedHeartRate(0), 70)
  assert.equal(calculateSimulatedHeartRate(100), 75)
  assert.equal(calculateSimulatedHeartRate(200), 80)
  assert.equal(calculateSimulatedHeartRate(400), 90)
  assert.equal(calculateSimulatedHeartRate(100_000), 110) // capped at +40
})
