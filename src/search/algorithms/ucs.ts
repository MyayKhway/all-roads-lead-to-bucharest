import type { CityId } from '@/data/cityIds'
import type { SearchAlgorithm, SearchCostTable } from '@/search/contracts'

/** A pending route prioritized only by the road cost already travelled. */
interface FrontierEntry {
  readonly city: CityId
  readonly pathCost: number
}

/** Follow predecessor links from the goal and reverse them into travel order. */
function reconstructPath(
  start: CityId,
  goal: CityId,
  parentOf: SearchCostTable<CityId, CityId>,
): readonly CityId[] {
  const reversedPath: CityId[] = [goal]
  let city = goal

  // Each improved route records its parent before entering the frontier.
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

/** Find the cheapest route using original road costs and no heuristic. */
export const ucsSearch: SearchAlgorithm = (problem, context) => {
  const probe = context.probe
  if (probe === undefined) {
    throw new Error('Uniform-cost search requires a search probe for its measured data structures')
  }

  const frontier = probe.frontier<FrontierEntry>((left, right) => left.pathCost - right.pathCost)
  const closed = probe.closedSet<CityId>()
  const bestCost = probe.costTable<CityId, number>()
  const parentOf = probe.costTable<CityId, CityId>()

  // The start city is reachable at zero cost and is the first frontier entry.
  bestCost.set(problem.start, 0)
  frontier.push({ city: problem.start, pathCost: 0 })
  context.eventListener?.({
    type: 'node-discovered',
    city: problem.start,
    parent: null,
    pathCost: 0,
  })
  context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

  // Always expand the unsettled city with the smallest accumulated road cost.
  while (frontier.size > 0) {
    const current = frontier.pop()
    if (current === undefined) break
    context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

    // Improved routes can leave older entries behind; a settled city needs no second expansion.
    if (closed.has(current.city) || current.pathCost !== bestCost.get(current.city)) continue

    closed.add(current.city)
    context.eventListener?.({
      type: 'node-expanded',
      city: current.city,
      pathCost: current.pathCost,
    })

    // The first time UCS settles the goal, its known road cost is optimal.
    if (current.city === problem.goal) {
      return {
        status: 'success',
        path: reconstructPath(problem.start, problem.goal, parentOf),
        pathCost: current.pathCost,
      }
    }

    // Inspect original roads and remember only strictly cheaper routes to unsettled cities.
    for (const neighbor of problem.graph.adjacency[current.city] ?? []) {
      probe.countEdgeExamined()
      if (closed.has(neighbor.city)) continue

      const candidateCost = current.pathCost + neighbor.distance
      const previousCost = bestCost.get(neighbor.city)
      if (previousCost !== undefined && candidateCost >= previousCost) continue

      bestCost.set(neighbor.city, candidateCost)
      parentOf.set(neighbor.city, current.city)
      frontier.push({ city: neighbor.city, pathCost: candidateCost })
      context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

      // Diagnosis distinguishes a newly reached city from a cheaper replacement route.
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

  // No remaining frontier entry can connect the start to the goal.
  return { status: 'failure', reason: 'unreachable' }
}
