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
 *
 * The magnetic attraction itself (used as the base) is:
 *   M(n,g) = K / (d(n,g) + epsilon)
 * but here we return a cost (lower = better), so we use distance directly
 * and let the directional terms steer the search.
 */

const K       = 1;       // magnetic strength (unused in cost form but kept for reference)
const EPSILON = 0.0001;  // prevents division by zero
const LAMBDA  = 0.4;     // directional penalty weight
const MU      = 0.2;     // deviation penalty weight

/**
 * Euclidean distance between two [x, y, z] positions.
 */
export function euclidean(posA, posB) {
  const dx = posA[0] - posB[0];
  const dy = posA[1] - posB[1];
  const dz = posA[2] - posB[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalise a 2D vector [x, z] (we ignore Y for direction on the map plane).
 */
function normalise2D([x, z]) {
  const len = Math.sqrt(x * x + z * z);
  if (len < EPSILON) return [0, 0];
  return [x / len, z / len];
}

/**
 * Dot product of two 2D vectors.
 */
function dot2D([ax, az], [bx, bz]) {
  return ax * bx + az * bz;
}

/**
 * Compute the Magnetic Field heuristic value h(n).
 *
 * @param {number[]} currentPos   - [x, y, z] position of current city
 * @param {number[]} neighborPos  - [x, y, z] position of neighbour being evaluated
 * @param {number[]} goalPos      - [x, y, z] position of goal city
 * @param {number[]} startPos     - [x, y, z] position of start city (for deviation)
 * @returns {number} heuristic cost estimate
 */
export function magneticFieldHeuristic(currentPos, neighborPos, goalPos, startPos) {
  // --- 1. Distance component ---
  const distToGoal = euclidean(neighborPos, goalPos);

  // --- 2. Directional alignment penalty ---
  // Direction from neighbour toward goal (on XZ plane)
  const toGoal = normalise2D([
    goalPos[0] - neighborPos[0],
    goalPos[2] - neighborPos[2],
  ]);
  // Direction of movement: current -> neighbour
  const movement = normalise2D([
    neighborPos[0] - currentPos[0],
    neighborPos[2] - currentPos[2],
  ]);

  // alignment in [-1, 1]; 1 = moving directly toward goal
  const alignment = dot2D(movement, toGoal);
  // penalty is 0 when perfectly aligned, 2 when moving directly away
  const directionPenalty = 1 - alignment;

  // --- 3. Deviation penalty ---
  // How far the neighbour deviates from the straight line start -> goal
  const straightLine = normalise2D([
    goalPos[0] - startPos[0],
    goalPos[2] - startPos[2],
  ]);
  const fromStart = normalise2D([
    neighborPos[0] - startPos[0],
    neighborPos[2] - startPos[2],
  ]);
  const deviationAlignment = dot2D(fromStart, straightLine);
  const deviationPenalty = 1 - deviationAlignment;

  return distToGoal + LAMBDA * directionPenalty + MU * deviationPenalty;
}

/**
 * Simple straight-line (Euclidean) heuristic — standard A* baseline.
 */
export function straightLineHeuristic(neighborPos, goalPos) {
  return euclidean(neighborPos, goalPos);
}
