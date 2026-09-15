import type {
  SearchClosedSet,
  SearchCostTable,
  SearchFrontier,
  SearchProbe,
  SearchProbeSnapshot,
} from '@/search/contracts'

/** Live measurements shared by every instrumented structure created by one probe. */
interface SearchProbeState {
  nodesGenerated: number
  nodesExpanded: number
  frontierPushes: number
  frontierPops: number
  /** Current combined size of the probe's frontiers, used to calculate the peak. */
  currentFrontierEntries: number
  peakFrontierEntries: number
  closedSetEntries: number
  costTableEntries: number
  edgesExamined: number
  heuristicEvaluations: number
  /** Algorithm-defined counter names mapped to their accumulated values. */
  customCounts: Map<string, number>
}

/**
 * Array-backed frontier where `T` is the algorithm's frontier-entry type.
 * The comparator returns a negative number when its left entry has higher priority.
 */
class CountingPriorityFrontier<T> implements SearchFrontier<T> {
  private readonly values: T[] = []
  private readonly compare: (left: T, right: T) => number
  private readonly state: SearchProbeState

  constructor(compare: (left: T, right: T) => number, state: SearchProbeState) {
    this.compare = compare
    this.state = state
  }

  get size(): number {
    return this.values.length
  }

  /** Stores one candidate and records the resulting frontier growth. */
  push(value: T): void {
    this.values.push(value)
    // Keep the smallest value at the end so pop() can remove it directly.
    this.values.sort((left, right) => this.compare(right, left))

    this.state.nodesGenerated += 1
    this.state.frontierPushes += 1
    this.state.currentFrontierEntries += 1
    this.state.peakFrontierEntries = Math.max(
      this.state.peakFrontierEntries,
      this.state.currentFrontierEntries,
    )
  }

  /** Removes the next candidate; attempting to pop an empty frontier is not counted. */
  pop(): T | undefined {
    if (this.values.length === 0) {
      return undefined
    }

    const next = this.values.pop()
    this.state.frontierPops += 1
    this.state.currentFrontierEntries -= 1
    return next
  }
}

/** Set wrapper where `T` is a state identifier and each first insertion is an expansion. */
class CountingClosedSet<T> implements SearchClosedSet<T> {
  private readonly values = new Set<T>()
  private readonly state: SearchProbeState

  constructor(state: SearchProbeState) {
    this.state = state
  }

  get size(): number {
    return this.values.size
  }

  add(value: T): boolean {
    if (this.values.has(value)) {
      return false
    }

    this.values.add(value)
    this.state.nodesExpanded += 1
    this.state.closedSetEntries += 1
    return true
  }

  has(value: T): boolean {
    return this.values.has(value)
  }
}

/** Cost map from keys `K` (normally cities) to values `V` (normally path costs). */
class CountingCostTable<K, V> implements SearchCostTable<K, V> {
  private readonly values = new Map<K, V>()
  private readonly state: SearchProbeState

  constructor(state: SearchProbeState) {
    this.state = state
  }

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
    if (!this.values.has(key)) {
      this.state.costTableEntries += 1
    }
    this.values.set(key, value)
  }
}

/** Creates isolated counting structures and counters for one search execution. */
export function createSearchProbe(): SearchProbe {
  const state: SearchProbeState = {
    nodesGenerated: 0,
    nodesExpanded: 0,
    frontierPushes: 0,
    frontierPops: 0,
    currentFrontierEntries: 0,
    peakFrontierEntries: 0,
    closedSetEntries: 0,
    costTableEntries: 0,
    edgesExamined: 0,
    heuristicEvaluations: 0,
    customCounts: new Map(),
  }

  // Every structure created below reports its operations to this shared state.
  return {
    frontier<T>(compare: (left: T, right: T) => number): SearchFrontier<T> {
      return new CountingPriorityFrontier(compare, state)
    },

    closedSet<T>(): SearchClosedSet<T> {
      return new CountingClosedSet(state)
    },

    costTable<K, V>(): SearchCostTable<K, V> {
      return new CountingCostTable(state)
    },

    countEdgeExamined(): void {
      state.edgesExamined += 1
    },

    countHeuristicEvaluation(): void {
      state.heuristicEvaluations += 1
    },

    /** Adds work that is specific to an algorithm and not visible to a standard structure. */
    count(name: string, amount = 1): void {
      if (name.length === 0) {
        throw new RangeError('Custom counter name must not be empty')
      }
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new RangeError('Custom counter amount must be a positive safe integer')
      }

      state.customCounts.set(name, (state.customCounts.get(name) ?? 0) + amount)
    },

    /** Captures the probe's current public measurements as an immutable result. */
    snapshot(): SearchProbeSnapshot {
      // Copy custom counts so later probe activity cannot mutate an earlier snapshot.
      const customCounts = Object.freeze(Object.fromEntries(state.customCounts))
      return Object.freeze({
        nodesGenerated: state.nodesGenerated,
        nodesExpanded: state.nodesExpanded,
        frontierPushes: state.frontierPushes,
        frontierPops: state.frontierPops,
        peakFrontierEntries: state.peakFrontierEntries,
        closedSetEntries: state.closedSetEntries,
        costTableEntries: state.costTableEntries,
        edgesExamined: state.edgesExamined,
        heuristicEvaluations: state.heuristicEvaluations,
        customCounts,
      })
    },
  }
}
