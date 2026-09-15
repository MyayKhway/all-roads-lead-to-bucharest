import type { CityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import type { SearchProblem, SearchResult } from '@/search/contracts'

export type ValidationIssueCode =
  | 'empty-path'
  | 'incorrect-start'
  | 'incorrect-goal'
  | 'invalid-city'
  | 'missing-road'
  | 'invalid-path-cost'
  | 'path-cost-mismatch'
  | 'false-unreachable'

export interface ValidationIssue {
  readonly code: ValidationIssueCode
  readonly message: string
}

export type SearchResultValidation =
  | {
      readonly status: 'valid'
      /** Null when a truthful unreachable result has no path. */
      readonly calculatedPathCost: number | null
    }
  | {
      readonly status: 'invalid'
      /** Null when the complete path cost cannot be calculated. */
      readonly calculatedPathCost: number | null
      readonly issues: readonly ValidationIssue[]
    }

/** Returns the road cost, or undefined when the cities are not neighbors. */
function findRoadCost(graph: WeightedGraph, from: CityId, to: CityId): number | undefined {
  const neighbors = graph.adjacency[from]
  if (neighbors === undefined) {
    return undefined
  }

  return neighbors.find((entry) => entry.city === to)?.distance
}

/** Checks connectivity only; road costs do not affect reachability. */
function isReachable(graph: WeightedGraph, start: CityId, goal: CityId): boolean {
  const visited = new Set<CityId>()
  const pending: CityId[] = [start]

  while (pending.length > 0) {
    const current = pending.pop()

    if (current === undefined) {
      continue
    }

    if (current === goal) {
      return true
    }

    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    for (const neighbor of graph.adjacency[current] ?? []) {
      if (!visited.has(neighbor.city)) {
        pending.push(neighbor.city)
      }
    }
  }

  return false
}

/**
 * Checks whether a result is a valid answer to the search problem.
 * Optimality is checked separately against the reference algorithm.
 */
export function validateSearchResult(
  problem: SearchProblem,
  result: SearchResult,
): SearchResultValidation {
  // A failure is correct only when no route exists between the requested cities.
  if (result.status === 'failure') {
    if (isReachable(problem.graph, problem.start, problem.goal)) {
      return {
        status: 'invalid',
        calculatedPathCost: null,
        issues: [
          {
            code: 'false-unreachable',
            message: `The goal city ${problem.goal} is reachable from the start city ${problem.start}, but the result indicates it is unreachable.`,
          },
        ],
      }
    }

    return {
      status: 'valid',
      calculatedPathCost: null,
    }
  }

  const issues: ValidationIssue[] = []
  const { path } = result

  // Check that a successful search returned at least one city.
  if (path.length === 0) {
    return {
      status: 'invalid',
      calculatedPathCost: null,
      issues: [
        {
          code: 'empty-path',
          message: 'The path is empty.',
        },
      ],
    }
  }

  // Check that the path begins at the requested start city.
  if (path[0] !== problem.start) {
    issues.push({
      code: 'incorrect-start',
      message: `The path does not start at the expected city ${problem.start}.`,
    })
  }

  // Check that the path ends at the requested goal city.
  if (path[path.length - 1] !== problem.goal) {
    issues.push({
      code: 'incorrect-goal',
      message: `The path does not end at the expected city ${problem.goal}.`,
    })
  }

  // Every returned city must belong to the graph used for this search.
  const graphCities = new Set(problem.graph.cityIds)
  for (const city of path) {
    if (!graphCities.has(city)) {
      issues.push({
        code: 'invalid-city',
        message: `The city ${city} in the path is not a valid city in the graph.`,
      })
    }
  }

  // Every consecutive city pair must share a road before the full cost can be verified.
  let calculatedPathCost = 0
  let allRoadCostsFound = true

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]
    const to = path[index]

    if (from === undefined || to === undefined) {
      allRoadCostsFound = false
      continue
    }

    // An unknown endpoint is an invalid-city issue, not an additional missing-road issue.
    if (!graphCities.has(from) || !graphCities.has(to)) {
      allRoadCostsFound = false
      continue
    }

    const roadCost = findRoadCost(problem.graph, from, to)
    // Check that this consecutive city pair is connected by a road.
    if (roadCost === undefined) {
      allRoadCostsFound = false
      issues.push({
        code: 'missing-road',
        message: `There is no road between ${from} and ${to}.`,
      })
      continue
    }

    calculatedPathCost += roadCost
  }

  const reportedCostIsValid = Number.isFinite(result.pathCost) && result.pathCost >= 0
  // Check that the reported cost is a usable path-cost value.
  if (!reportedCostIsValid) {
    issues.push({
      code: 'invalid-path-cost',
      message: `Path cost must be finite and non-negative, but received ${result.pathCost}.`,
    })
  }

  // Check that the algorithm's reported cost equals the cost of its returned roads.
  if (allRoadCostsFound && reportedCostIsValid && calculatedPathCost !== result.pathCost) {
    issues.push({
      code: 'path-cost-mismatch',
      message: `The reported path cost ${result.pathCost} does not match the calculated path cost ${calculatedPathCost}.`,
    })
  }

  const trustedPathCost = allRoadCostsFound ? calculatedPathCost : null
  if (issues.length > 0) {
    return {
      status: 'invalid',
      calculatedPathCost: trustedPathCost,
      issues,
    }
  }

  return {
    status: 'valid',
    calculatedPathCost,
  }
}
