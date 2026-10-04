/**
 * A* over the harness's shared contracts (see docs/search-evaluation/README.md).
 *
 * f(n) = g(n) + h(n), where g(n) is the accumulated road cost and h(n) comes
 * from `context.heuristic`. When no heuristic is supplied, h(n) is always 0
 * and this degrades to uniform-cost search — so the same implementation can
 * back a blind variant and any number of heuristic variants.
 */

import type { CityId } from '@/data/cityIds'
import type { SearchAlgorithm, SearchResult } from '@/search/contracts'

interface FrontierEntry {
  readonly city: CityId
  readonly pathCost: number
  readonly priority: number
}

function reconstructPath(
  parents: ReadonlyMap<CityId, CityId | null>,
  start: CityId,
  goal: CityId,
): readonly CityId[] | null {
  const reversedPath: CityId[] = [goal]
  let current = goal

  while (current !== start) {
    const parent = parents.get(current)
    if (parent === undefined || parent === null) {
      return null
    }
    reversedPath.push(parent)
    current = parent
  }

  return reversedPath.reverse()
}

export const astar: SearchAlgorithm = (problem, context): SearchResult => {
  const { probe, heuristic, eventListener } = context
  if (probe === undefined) {
    throw new Error('astar requires an evaluation probe')
  }

  const { graph, start, goal } = problem

  function estimate(city: CityId): number {
    if (heuristic === undefined) return 0
    const value = heuristic(city, problem)
    probe?.countHeuristicEvaluation()
    eventListener?.({ type: 'heuristic-evaluated', city, goal, heuristicValue: value })
    return value
  }

  const frontier = probe.frontier<FrontierEntry>((left, right) => left.priority - right.priority)
  const closed = probe.closedSet<CityId>()
  const bestCost = probe.costTable<CityId, number>()
  const parents = new Map<CityId, CityId | null>()

  bestCost.set(start, 0)
  parents.set(start, null)
  frontier.push({ city: start, pathCost: 0, priority: estimate(start) })
  eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
  eventListener?.({ type: 'node-discovered', city: start, parent: null, pathCost: 0 })

  while (frontier.size > 0) {
    const current = frontier.pop()
    eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
    if (current === undefined) break

    if (closed.has(current.city)) continue
    closed.add(current.city)
    eventListener?.({ type: 'node-expanded', city: current.city, pathCost: current.pathCost })

    if (current.city === goal) {
      const path = reconstructPath(parents, start, goal)
      if (path === null) {
        return { status: 'failure', reason: 'unreachable' }
      }
      return { status: 'success', path, pathCost: current.pathCost }
    }

    for (const neighbor of graph.adjacency[current.city] ?? []) {
      probe.countEdgeExamined()
      if (closed.has(neighbor.city)) continue

      const candidateCost = current.pathCost + neighbor.distance
      const knownCost = bestCost.get(neighbor.city) ?? Number.POSITIVE_INFINITY

      if (candidateCost < knownCost) {
        const hadKnownCost = bestCost.has(neighbor.city)
        bestCost.set(neighbor.city, candidateCost)
        parents.set(neighbor.city, current.city)

        eventListener?.(
          hadKnownCost
            ? {
                type: 'node-updated',
                city: neighbor.city,
                parent: current.city,
                previousPathCost: knownCost,
                pathCost: candidateCost,
              }
            : {
                type: 'node-discovered',
                city: neighbor.city,
                parent: current.city,
                pathCost: candidateCost,
              },
        )

        frontier.push({
          city: neighbor.city,
          pathCost: candidateCost,
          priority: candidateCost + estimate(neighbor.city),
        })
        eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
      }
    }
  }

  return { status: 'failure', reason: 'unreachable' }
}
