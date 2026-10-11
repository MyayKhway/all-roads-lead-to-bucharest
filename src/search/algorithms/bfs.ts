import type { CityId } from '@/data/cityIds'
import type { SearchAlgorithm, SearchCostTable } from '@/search/contracts'

/** A pending city ordered only by when it was first reached. */
interface FrontierEntry {
  readonly city: CityId
  readonly order: number
}

/** Follow predecessor links from the goal and reverse them into travel order. */
function reconstructPath(
  start: CityId,
  goal: CityId,
  parentOf: SearchCostTable<CityId, CityId>,
): readonly CityId[] {
  const reversedPath: CityId[] = [goal]
  let city = goal

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

/** Find the route with the fewest roads, ignoring road costs (AIMA early goal test). */
export const bfsSearch: SearchAlgorithm = (problem, context) => {
  const probe = context.probe
  if (probe === undefined) {
    throw new Error('Breadth-first search requires a search probe for its measured data structures')
  }

  // Ordering by insertion turns the counted priority frontier into a FIFO queue.
  const frontier = probe.frontier<FrontierEntry>((left, right) => left.order - right.order)
  const expanded = probe.closedSet<CityId>()
  const reachedCost = probe.costTable<CityId, number>()
  const parentOf = probe.costTable<CityId, CityId>()
  let nextOrder = 0

  reachedCost.set(problem.start, 0)
  context.eventListener?.({
    type: 'node-discovered',
    city: problem.start,
    parent: null,
    pathCost: 0,
  })
  if (problem.start === problem.goal) {
    return { status: 'success', path: [problem.start], pathCost: 0 }
  }

  frontier.push({ city: problem.start, order: nextOrder++ })
  context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

  while (frontier.size > 0) {
    const current = frontier.pop()
    if (current === undefined) break
    context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

    const currentCost = reachedCost.get(current.city) ?? 0
    expanded.add(current.city)
    context.eventListener?.({ type: 'node-expanded', city: current.city, pathCost: currentCost })

    for (const neighbor of problem.graph.adjacency[current.city] ?? []) {
      probe.countEdgeExamined()
      // BFS keeps the first route to each city, whatever it costs.
      if (reachedCost.has(neighbor.city)) continue

      const pathCost = currentCost + neighbor.distance
      reachedCost.set(neighbor.city, pathCost)
      parentOf.set(neighbor.city, current.city)
      context.eventListener?.({
        type: 'node-discovered',
        city: neighbor.city,
        parent: current.city,
        pathCost,
      })

      // Testing on generation saves a layer of expansions; the route is shallowest, not cheapest.
      if (neighbor.city === problem.goal) {
        return {
          status: 'success',
          path: reconstructPath(problem.start, problem.goal, parentOf),
          pathCost,
        }
      }

      frontier.push({ city: neighbor.city, order: nextOrder++ })
      context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
    }
  }

  return { status: 'failure', reason: 'unreachable' }
}
