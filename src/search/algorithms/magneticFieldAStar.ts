import type { CityId } from '@/data/cityIds'
import type { SearchAlgorithm, SearchProblem } from '@/search/contracts'

/** One road being considered from the expanded city to a neighbor. */
interface RoadStep {
  readonly from: CityId
  readonly to: CityId
  readonly roadCost: number
}

interface FrontierEntry {
  readonly city: CityId
  readonly pathCost: number
  readonly estimatedTotalCost: number
  readonly insertionOrder: number
}

/** Order the frontier by f(n), then g(n), then deterministic insertion order. */
function compareFrontierEntries(left: FrontierEntry, right: FrontierEntry): number {
  const estimateDifference = left.estimatedTotalCost - right.estimatedTotalCost
  if (estimateDifference !== 0) return estimateDifference

  const pathDifference = left.pathCost - right.pathCost
  if (pathDifference !== 0) return pathDifference
  return left.insertionOrder - right.insertionOrder
}

/** Follow the recorded parents backward, then return the path start-first. */
function reconstructPath(
  cameFrom: ReadonlyMap<CityId, CityId>,
  start: CityId,
  goal: CityId,
): readonly CityId[] | null {
  const reversedPath: CityId[] = [goal]
  let current = goal

  while (current !== start) {
    const previous = cameFrom.get(current)
    if (previous === undefined) {
      return null
    }
    reversedPath.push(previous)
    current = previous
  }

  return reversedPath.reverse()
}

/**
 * Build magnetic-field A*. The callback calculates h for a neighbor using the
 * road being examined; ordinary contributor heuristics use the shared context.
 */
export function createMagneticFieldAStar(
  customHeuristic?: (city: CityId, problem: SearchProblem, road?: RoadStep) => number,
): SearchAlgorithm {
  return (problem, context) => {
    const probe = context.probe
    if (probe === undefined) {
      throw new Error('Magnetic-field A* requires a search probe')
    }

    // Search state. The probe-backed collections produce comparable metrics.
    const frontier = probe.frontier<FrontierEntry>(compareFrontierEntries)
    const expandedCities = probe.closedSet<CityId>()
    const lowestCostToCity = probe.costTable<CityId, number>()
    const cameFrom = new Map<CityId, CityId>()
    let insertionOrder = 0

    // The magnetic field uses the road callback. Ordinary A* falls back to the
    // shared city-only heuristic, or zero when no heuristic is supplied.
    const getHeuristicValue = (city: CityId, road?: RoadStep): number => {
      if (context.heuristic === undefined && customHeuristic === undefined) return 0

      probe.countHeuristicEvaluation()
      const value =
        customHeuristic?.(city, problem, road) ?? context.heuristic?.(city, problem) ?? 0
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`Heuristic returned an invalid value for ${city}: ${value}`)
      }
      context.eventListener?.({
        type: 'heuristic-evaluated',
        city,
        goal: problem.goal,
        heuristicValue: value,
      })
      return value
    }

    const addToFrontier = (city: CityId, pathCost: number, road?: RoadStep): void => {
      frontier.push({
        city,
        pathCost,
        estimatedTotalCost: pathCost + getHeuristicValue(city, road),
        insertionOrder,
      })
      insertionOrder += 1
      context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
    }

    // The start has g = 0 and no incoming road.
    lowestCostToCity.set(problem.start, 0)
    addToFrontier(problem.start, 0)
    context.eventListener?.({
      type: 'node-discovered',
      city: problem.start,
      parent: null,
      pathCost: 0,
    })

    while (frontier.size > 0) {
      const current = frontier.pop()
      context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
      if (current === undefined) break

      // A cheaper route can leave an older entry in the frontier. Ignore it.
      const lowestKnownCost = lowestCostToCity.get(current.city)
      if (lowestKnownCost === undefined || current.pathCost !== lowestKnownCost) {
        probe.count('staleFrontierPops')
        continue
      }

      // Do not block re-expansion after a later cost improvement. This makes A*
      // correct for admissible heuristics even when they are not consistent.
      expandedCities.add(current.city)
      context.eventListener?.({
        type: 'node-expanded',
        city: current.city,
        pathCost: current.pathCost,
      })

      if (current.city === problem.goal) {
        const path = reconstructPath(cameFrom, problem.start, problem.goal)
        if (path !== null) {
          return { status: 'success', path, pathCost: current.pathCost }
        }
        break
      }

      for (const neighbor of problem.graph.adjacency[current.city] ?? []) {
        probe.countEdgeExamined()
        const newPathCost = current.pathCost + neighbor.distance
        const previousBestCost = lowestCostToCity.get(neighbor.city) ?? Number.POSITIVE_INFINITY
        if (newPathCost >= previousBestCost) continue

        // This road improves the best known route to the neighboring city.
        const isNewCity = !lowestCostToCity.has(neighbor.city)
        lowestCostToCity.set(neighbor.city, newPathCost)
        cameFrom.set(neighbor.city, current.city)
        addToFrontier(neighbor.city, newPathCost, {
          from: current.city,
          to: neighbor.city,
          roadCost: neighbor.distance,
        })

        context.eventListener?.(
          isNewCity
            ? {
                type: 'node-discovered',
                city: neighbor.city,
                parent: current.city,
                pathCost: newPathCost,
              }
            : {
                type: 'node-updated',
                city: neighbor.city,
                parent: current.city,
                previousPathCost: previousBestCost,
                pathCost: newPathCost,
              },
        )
      }
    }

    return { status: 'failure', reason: 'unreachable' }
  }
}
