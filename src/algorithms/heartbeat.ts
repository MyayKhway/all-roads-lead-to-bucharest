/**
 * Heartbeat Heuristic
 *
 * Reframes the road network as a simplified cardiovascular system: the goal
 * city is the target organ and the search frontier is blood flow reaching
 * toward it. The heuristic itself stays a conservative, bounded fraction of
 * Manhattan (grid) distance so it remains a lower bound under the existing
 * road-distance cost model (see astar.ts — g(n) is unchanged).
 *
 * h(n) = manhattanDistance(n, goal) * MIN_HEARTBEAT_FACTOR
 *
 * All values here are simulated for presentation purposes and are not a
 * model of real cardiovascular physiology.
 */

import type { Position3D } from '../data/cities.js'

const MIN_HEARTBEAT_FACTOR = 0.75

const RESTING_BPM = 70
const MAX_BPM_INCREASE = 40
const KM_PER_BPM = 20

/** Manhattan (L1 / taxicab) distance between two 3D positions. */
export function manhattanDistance(posA: Position3D, posB: Position3D): number {
  return Math.abs(posA[0] - posB[0]) + Math.abs(posA[1] - posB[1]) + Math.abs(posA[2] - posB[2])
}

export function heartbeatHeuristic(neighborPos: Position3D, goalPos: Position3D): number {
  return manhattanDistance(neighborPos, goalPos) * MIN_HEARTBEAT_FACTOR
}

/**
 * Simulated heart rate for a given accumulated travel distance (km).
 * Rises with distance traveled, capped at RESTING_BPM + MAX_BPM_INCREASE.
 */
export function calculateSimulatedHeartRate(distanceKm: number): number {
  const increase = Math.min(distanceKm / KM_PER_BPM, MAX_BPM_INCREASE)
  return Math.round(RESTING_BPM + increase)
}
