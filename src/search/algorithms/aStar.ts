import type { CityId } from '@/data/cityIds'
import type {
  SearchAlgorithm,
  SearchClosedSet,
  SearchCostTable,
  SearchFrontier,
} from '@/search/contracts'

interface FrontierEntry {
  readonly city: CityId
  readonly pathCost: number
  readonly estimatedTotalCost: number
}

/** Small local fallback used when searches run without instrumentation. */
class LocalFrontier<T> implements SearchFrontier<T> {
  private readonly values: T[] = []
  private readonly compare: (left: T, right: T) => number

  constructor(compare: (left: T, right: T) => number) {
    this.compare = compare
  }

  get size(): number {
    return this.values.length
  }

  push(value: T): void {
    this.values.push(value)
    this.values.sort(this.compare)
  }

  pop(): T | undefined {
    return this.values.shift()
  }
}

class LocalClosedSet<T> implements SearchClosedSet<T> {
  private readonly values = new Set<T>()

  get size(): number {
    return this.values.size
  }

  add(value: T): boolean {
    const initialSize = this.values.size
    this.values.add(value)
    return this.values.size !== initialSize
  }

  has(value: T): boolean {
    return this.values.has(value)
  }
}

class LocalCostTable<K, V> implements SearchCostTable<K, V> {
  private readonly values = new Map<K, V>()

  get size(): number {
    return this.values.size
  }

  get(key: K): V | undefined {
    return this.values.get(key)
  }

  has(key: K): boolean {
    return this.values.has(key)
  }

  set(key: K, value: V): void {
    this.values.set(key, value)
  }
}

function reconstructPath(
  previousCity: ReadonlyMap<CityId, CityId>,
  start: CityId,
  goal: CityId,
): readonly CityId[] {
  const reversedPath: CityId[] = [goal]
  let current = goal

  while (current !== start) {
    const previous = previousCity.get(current)
    if (previous === undefined) {
      throw new Error('A* could not reconstruct a path to the start city')
    }
    reversedPath.push(previous)
    current = previous
  }

  return reversedPath.reverse()
}

/** A* search using the optional heuristic supplied through the search context. */
export const aStarSearch: SearchAlgorithm = (problem, context) => {
  const compare = (left: FrontierEntry, right: FrontierEntry): number =>
    left.estimatedTotalCost - right.estimatedTotalCost || left.pathCost - right.pathCost
  const frontier = context.probe?.frontier(compare) ?? new LocalFrontier(compare)
  const closed: SearchClosedSet<CityId> =
    context.probe?.closedSet<CityId>() ?? new LocalClosedSet<CityId>()
  const costs: SearchCostTable<CityId, number> =
    context.probe?.costTable<CityId, number>() ?? new LocalCostTable<CityId, number>()
  const previousCity = new Map<CityId, CityId>()

  const estimate = (city: CityId): number => {
    if (context.heuristic === undefined) {
      return 0
    }
    context.probe?.countHeuristicEvaluation()
    const value = context.heuristic(city, problem)
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError('A* heuristic must return a finite, non-negative estimate')
    }
    context.eventListener?.({
      type: 'heuristic-evaluated',
      city,
      goal: problem.goal,
      heuristicValue: value,
    })
    return value
  }

  costs.set(problem.start, 0)
  frontier.push({
    city: problem.start,
    pathCost: 0,
    estimatedTotalCost: estimate(problem.start),
  })
  context.eventListener?.({
    type: 'node-discovered',
    city: problem.start,
    parent: null,
    pathCost: 0,
  })
  context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

  while (frontier.size > 0) {
    const entry = frontier.pop()
    if (entry === undefined) {
      break
    }
    context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })

    // Improved routes leave old entries in the priority queue; ignore those stale entries.
    if (costs.get(entry.city) !== entry.pathCost || !closed.add(entry.city)) {
      continue
    }

    context.eventListener?.({
      type: 'node-expanded',
      city: entry.city,
      pathCost: entry.pathCost,
    })

    if (entry.city === problem.goal) {
      return {
        status: 'success',
        path: reconstructPath(previousCity, problem.start, problem.goal),
        pathCost: entry.pathCost,
      }
    }

    for (const neighbor of problem.graph.adjacency[entry.city] ?? []) {
      context.probe?.countEdgeExamined()
      const candidateCost = entry.pathCost + neighbor.distance
      const knownCost = costs.get(neighbor.city) ?? Number.POSITIVE_INFINITY
      if (candidateCost >= knownCost) {
        continue
      }

      costs.set(neighbor.city, candidateCost)
      previousCity.set(neighbor.city, entry.city)
      frontier.push({
        city: neighbor.city,
        pathCost: candidateCost,
        estimatedTotalCost: candidateCost + estimate(neighbor.city),
      })

      if (knownCost === Number.POSITIVE_INFINITY) {
        context.eventListener?.({
          type: 'node-discovered',
          city: neighbor.city,
          parent: entry.city,
          pathCost: candidateCost,
        })
      } else {
        context.eventListener?.({
          type: 'node-updated',
          city: neighbor.city,
          parent: entry.city,
          previousPathCost: knownCost,
          pathCost: candidateCost,
        })
      }
      context.eventListener?.({ type: 'frontier-size-changed', size: frontier.size })
    }
  }

  return {
    status: 'failure',
    reason: 'unreachable',
  }
}
