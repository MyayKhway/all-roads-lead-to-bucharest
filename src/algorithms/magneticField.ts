/**
 * Magnetic Field Heuristic
 *
 * Treats the goal city as a magnetic source that attracts the current node.
 * The heuristic combines:
 *   1. Euclidean distance to goal (base attraction)
 *   2. Directional alignment penalty — penalises moving away from the goal
 *   3. Deviation penalty — penalises straying from the straight-line bearing
 *
 * h(n) = distanceToGoal
 *      + lambda * directionPenalty
 *      + mu    * deviationPenalty
 */

import type { Position3D } from '../data/cities'

const EPSILON = 0.0001 // prevents division by zero
const LAMBDA = 0.4 // directional penalty weight
const MU = 0.2 // deviation penalty weight

type Vec2D = [number, number]

/** Euclidean distance between two 3D positions. */
export function euclidean(posA: Position3D, posB: Position3D): number {
  const dx = posA[0] - posB[0]
  const dy = posA[1] - posB[1]
  const dz = posA[2] - posB[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/** Normalise a 2D [x, z] vector (we ignore Y for map-plane direction). */
function normalise2D([x, z]: Vec2D): Vec2D {
  const len = Math.sqrt(x * x + z * z)
  if (len < EPSILON) return [0, 0]
  return [x / len, z / len]
}

/** Dot product of two 2D vectors. */
function dot2D([ax, az]: Vec2D, [bx, bz]: Vec2D): number {
  return ax * bx + az * bz
}

/**
 * Compute the Magnetic Field heuristic value h(n).
 *
 * @param currentPos   [x, y, z] position of the current city
 * @param neighborPos  [x, y, z] position of the neighbour being evaluated
 * @param goalPos      [x, y, z] position of the goal city
 * @param startPos     [x, y, z] position of the start city (used for deviation)
 * @returns heuristic cost estimate
 */
export function magneticFieldHeuristic(
  currentPos: Position3D,
  neighborPos: Position3D,
  goalPos: Position3D,
  startPos: Position3D,
): number {
  // 1. Distance component
  const distToGoal = euclidean(neighborPos, goalPos)

  // 2. Directional alignment penalty
  const toGoal = normalise2D([goalPos[0] - neighborPos[0], goalPos[2] - neighborPos[2]])
  const movement = normalise2D([neighborPos[0] - currentPos[0], neighborPos[2] - currentPos[2]])
  const alignment = dot2D(movement, toGoal) // [-1, 1]; 1 = toward goal
  const directionPenalty = 1 - alignment // 0 when aligned, 2 when opposite

  // 3. Deviation penalty — how far neighbour strays from start→goal bearing
  const straightLine = normalise2D([goalPos[0] - startPos[0], goalPos[2] - startPos[2]])
  const fromStart = normalise2D([neighborPos[0] - startPos[0], neighborPos[2] - startPos[2]])
  const deviationAlignment = dot2D(fromStart, straightLine)
  const deviationPenalty = 1 - deviationAlignment

  return distToGoal + LAMBDA * directionPenalty + MU * deviationPenalty
}

/** Simple straight-line (Euclidean) heuristic — standard A* baseline. */
export function straightLineHeuristic(neighborPos: Position3D, goalPos: Position3D): number {
  return euclidean(neighborPos, goalPos)
}
