import { CITY_IDS, type CityId } from '@/data/cityIds'
import { cityPixelCoordinates, manhattanPixelDistance } from '@/data/cityPixelCoordinates'
import { romaniaGraph, type WeightedGraph } from '@/data/graph'
import type { Heuristic, SearchProblem } from '@/search/contracts'

/** Strongest tested V2 influence with no structural regression. */
export const MAGNETIC_ALIGNMENT_V2_ALPHA = 0.0027

export type Vector2D = readonly [x: number, y: number]

/** Road information supplied privately by magnetic-field A*. */
export interface RoadChoice {
  readonly from: CityId
  readonly to: CityId
  readonly roadCost: number
}

export interface MagneticEstimate {
  readonly alignment: number
  readonly magneticFactor: number
  readonly baseHeuristic: number
  readonly adjustedHeuristic: number
}

// 1. Admissible Manhattan base -----------------------------------------------

/** Calculate k: the minimum road cost per Manhattan pixel, k for keeping the manhattan base admissible. */
export function calculateMinimumRoadCostPerPixel(graph: WeightedGraph): number {
  const rates = graph.edges
    .map((edge) => edge.distance / manhattanPixelDistance(edge.from, edge.to))
    .filter((rate) => Number.isFinite(rate) && rate > 0)
  const minimum = Math.min(...rates)

  if (!Number.isFinite(minimum)) {
    throw new RangeError('The graph needs a positive road with distinct coordinates')
  }
  return minimum
}

const ROMANIA_PIXEL_COST_SCALE = calculateMinimumRoadCostPerPixel(romaniaGraph)

/** Calculate the admissible Manhattan base before magnetic pull is applied. */
export const calculateManhattanEstimate: Heuristic = (city, problem) =>
  (problem.graph === romaniaGraph
    ? ROMANIA_PIXEL_COST_SCALE
    : calculateMinimumRoadCostPerPixel(problem.graph)) * manhattanPixelDistance(city, problem.goal)

// 2. Magnetic formula --------------------------------------------------------

function validateAlpha(alpha: number): void {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError('Magnetic alignment V2 alpha must be between 0 and 1')
  }
}

/** Map cosine alignment from [-1, 1] into magnetic strength [0, 1]. */
export function convertAlignmentToPullStrength(alignment: number): number {
  return (Math.max(-1, Math.min(1, alignment)) + 1) / 2
}

/** Return the pixel-space vector that points from one city to another. */
function getDirectionVector(from: CityId, to: CityId): Vector2D {
  const start = cityPixelCoordinates[from]
  const end = cityPixelCoordinates[to]
  return [end.x - start.x, end.y - start.y]
}

/** Cosine similarity measures whether a road points toward the goal. */
export function calculateDirectionAlignment(road: Vector2D, goal: Vector2D): number {
  const [roadX, roadY] = road
  const [goalX, goalY] = goal
  const denominator = Math.hypot(roadX, roadY) * Math.hypot(goalX, goalY)
  if (denominator === 0) return 0

  const cosine = (roadX * goalX + roadY * goalY) / denominator
  return Math.max(-1, Math.min(1, cosine))
}

/** Calculate V2: h = h_base * (1 - alpha * ((alignment + 1) / 2)). */
export function calculateMagneticHeuristic(
  neighbor: CityId,
  problem: SearchProblem,
  road: RoadChoice,
  alpha = MAGNETIC_ALIGNMENT_V2_ALPHA,
): MagneticEstimate {
  validateAlpha(alpha)
  if (road.to !== neighbor) {
    throw new RangeError('Heuristic transition destination must match the evaluated city')
  }

  const baseHeuristic = calculateManhattanEstimate(neighbor, problem)
  const alignment = calculateDirectionAlignment(
    getDirectionVector(road.from, neighbor),
    getDirectionVector(road.from, problem.goal),
  )
  const magneticFactor = convertAlignmentToPullStrength(alignment)

  return {
    alignment,
    magneticFactor,
    baseHeuristic,
    adjustedHeuristic: baseHeuristic * (1 - alpha * magneticFactor),
  }
}

// 3. Precomputed lookup ------------------------------------------------------

/** Precompute V2 so timed searches use only direct numeric-array lookups. */
export function precomputeMagneticHeuristic(alpha: number, graph: WeightedGraph = romaniaGraph) {
  validateAlpha(alpha)
  const cityCount = CITY_IDS.length
  const cityIndex = Object.fromEntries(CITY_IDS.map((city, index) => [city, index])) as Record<
    CityId,
    number
  >
  const roadEstimates = new Float64Array(cityCount * cityCount * cityCount)

  for (const goal of graph.cityIds) {
    const problem: SearchProblem = { graph, start: goal, goal }
    const goalIndex = cityIndex[goal]

    for (const city of graph.cityIds) {
      const fromIndex = cityIndex[city]
      for (const neighbor of graph.adjacency[city] ?? []) {
        const roadIndex =
          fromIndex * cityCount * cityCount + cityIndex[neighbor.city] * cityCount + goalIndex
        roadEstimates[roadIndex] = calculateMagneticHeuristic(
          neighbor.city,
          problem,
          { from: city, to: neighbor.city, roadCost: neighbor.distance },
          alpha,
        ).adjustedHeuristic
      }
    }
  }

  return (city: CityId, problem: SearchProblem, road?: RoadChoice): number => {
    if (problem.graph !== graph || (road !== undefined && road.to !== city)) {
      throw new RangeError('Magnetic V2 lookup received a problem it was not prepared for')
    }

    // The start is the only frontier entry, so its priority cannot affect the
    // search order. No incoming road also means there is no alignment to use.
    if (road === undefined) return 0

    const currentIndex = cityIndex[city]
    const goalIndex = cityIndex[problem.goal]
    const roadIndex =
      cityIndex[road.from] * cityCount * cityCount + currentIndex * cityCount + goalIndex
    return roadEstimates[roadIndex] ?? 0
  }
}

export const cachedMagneticHeuristic = precomputeMagneticHeuristic(MAGNETIC_ALIGNMENT_V2_ALPHA)

/** Registry fallback; the magnetic A* uses cachedMagneticHeuristic above. */
export const magneticHeuristic: Heuristic = (city, problem) =>
  cachedMagneticHeuristic(city, problem)
