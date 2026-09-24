import type { CityId } from '@/data/cityIds'
import type { SearchAlgorithm, SearchAlgorithmContext, SearchProblem } from '@/search/contracts'

/** One pending route to a city, ordered by its estimated total road cost. */
interface FrontierEntry {
  readonly city: CityId
  readonly pathCost: number
  readonly estimatedTotalCost: number
}

/** Follow recorded predecessors back to the start and return the route in travel order. */
function reconstructPath(
  start: CityId,
  goal: CityId,
  parentOf: { get(city: CityId): CityId | undefined },
): readonly CityId[] {
  const reversedPath: CityId[] = [goal]
  let city = goal

  // Every improved route records its predecessor before entering the frontier.
  while (city !== start) {
    const parent = parentOf.get(city)
    if (parent === undefined) {
      throw new Error(`Missing predecessor while reconstructing a route to ${goal}`)
    }
    reversedPath.push(parent)
    city = parent
  }

  return reversedPath.reverse()
}

/** Evaluate the selected heuristic and record one evaluation for the benchmark. */
function estimateRemainingCost(
  city: CityId,
  problem: SearchProblem,
  context: SearchAlgorithmContext,
): number {
  const estimate = context.heuristic?.(city, problem) ?? 0
  if (!Number.isFinite(estimate) || estimate < 0) {
    throw new RangeError(`Heuristic returned an invalid estimate for ${city}: ${estimate}`)
  }

  if (context.heuristic !== undefined) {
    context.probe?.countHeuristicEvaluation()
    context.eventListener?.({
      type: 'heuristic-evaluated',
      city,
      goal: problem.goal,
      heuristicValue: estimate,
    })
  }
  return estimate
}

/** Search the supplied weighted graph with A* and the heuristic chosen by the variant. */
export const astarSearch: SearchAlgorithm = (problem, context) => {
  const probe = context.probe
  if (probe === undefined) {
    throw new Error('A* requires a search probe for its measured data structures')
  }

  const frontier = probe.frontier<FrontierEntry>(
    (left, right) =>
      left.estimatedTotalCost - right.estimatedTotalCost || left.pathCost - right.pathCost,
  )
  const expanded = probe.closedSet<CityId>()
  const bestCost = probe.costTable<CityId, number>()
  const parentOf = probe.costTable<CityId, CityId>()

  // Seed the search with a zero-cost route to the start city.
  bestCost.set(problem.start, 0)
  frontier.push({
    city: problem.start,
    pathCost: 0,
    estimatedTotalCost: estimateRemainingCost(problem.start, problem, context),
  })
  context.eventListener?.({
    type: 'node-discovered',
    city: problem.start,
    parent: null,
    pathCost: 0,
  })
  context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

  // Expand the cheapest estimated route until the goal is selected or the frontier empties.
  while (frontier.size > 0) {
    const current = frontier.pop()
    if (current === undefined) break
    context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

    // A cheaper route can supersede an older frontier entry before it is popped.
    if (current.pathCost !== bestCost.get(current.city)) continue

    // The closed set counts unique cities; a better route may still reopen one later.
    expanded.add(current.city)
    context.eventListener?.({
      type: 'node-expanded',
      city: current.city,
      pathCost: current.pathCost,
    })

    if (current.city === problem.goal) {
      return {
        status: 'success',
        path: reconstructPath(problem.start, problem.goal, parentOf),
        pathCost: current.pathCost,
      }
    }

    // Relax each outgoing road using its original weight as the accumulated cost.
    for (const neighbor of problem.graph.adjacency[current.city] ?? []) {
      probe.countEdgeExamined()
      const candidateCost = current.pathCost + neighbor.distance
      const previousCost = bestCost.get(neighbor.city)
      if (previousCost !== undefined && candidateCost >= previousCost) continue

      bestCost.set(neighbor.city, candidateCost)
      parentOf.set(neighbor.city, current.city)
      const remainingCost = estimateRemainingCost(neighbor.city, problem, context)
      frontier.push({
        city: neighbor.city,
        pathCost: candidateCost,
        estimatedTotalCost: candidateCost + remainingCost,
      })
      context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

      // Distinguish a city's first route from an improvement to an earlier route.
      if (previousCost === undefined) {
        context.eventListener?.({
          type: 'node-discovered',
          city: neighbor.city,
          parent: current.city,
          pathCost: candidateCost,
        })
      } else {
        context.eventListener?.({
          type: 'node-updated',
          city: neighbor.city,
          parent: current.city,
          previousPathCost: previousCost,
          pathCost: candidateCost,
        })
      }
    }
  }

  // An empty frontier means no route from the start reaches the goal.
  return { status: 'failure', reason: 'unreachable' }
}
