/**
 * A* Search Algorithm
 *
 * f(n) = g(n) + h(n)
 *   g(n) = actual cost from start to current node (road km)
 *   h(n) = heuristic estimate from current node to goal
 */

import type { Position3D } from '../data/cities'
import { cities } from '../data/cities'
import { buildAdjacency } from '../data/graph'
import { magneticFieldHeuristic, straightLineHeuristic } from './magneticField'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AstarResult {
  path: string[]
  totalDistance: number
  exploredOrder: string[]
  exploredCosts: Record<string, number>
}

export const HEURISTICS = {
  MAGNETIC_FIELD: 'magnetic_field',
  STRAIGHT_LINE: 'straight_line',
} as const

export type HeuristicName = (typeof HEURISTICS)[keyof typeof HEURISTICS]

// ─── Min-Heap ─────────────────────────────────────────────────────────────────

interface HeapNode {
  id: string
  f: number
}

class MinHeap {
  private _data: HeapNode[] = []

  push(item: HeapNode): void {
    this._data.push(item)
    this._bubbleUp(this._data.length - 1)
  }

  pop(): HeapNode | undefined {
    const top = this._data[0]
    const last = this._data.pop()
    if (last !== undefined && this._data.length > 0) {
      this._data[0] = last
      this._siftDown(0)
    }
    return top
  }

  get size(): number {
    return this._data.length
  }

  private _bubbleUp(i: number): void {
    const data = this._data
    while (i > 0) {
      const parent = (i - 1) >> 1
      const parentNode = data[parent]
      const node = data[i]
      if (parentNode === undefined || node === undefined) break
      if (parentNode.f <= node.f) break
      data[parent] = node
      data[i] = parentNode
      i = parent
    }
  }

  private _siftDown(i: number): void {
    const data = this._data
    const n = data.length
    while (true) {
      const node = data[i]
      if (node === undefined) break

      let smallest = i
      let smallestF = node.f
      const l = 2 * i + 1
      const r = 2 * i + 2

      const left = l < n ? data[l] : undefined
      if (left !== undefined && left.f < smallestF) {
        smallest = l
        smallestF = left.f
      }
      const right = r < n ? data[r] : undefined
      if (right !== undefined && right.f < smallestF) {
        smallest = r
        smallestF = right.f
      }

      if (smallest === i) break
      const swap = data[smallest]
      if (swap === undefined) break
      data[smallest] = node
      data[i] = swap
      i = smallest
    }
  }
}

// ─── Heuristic selector ───────────────────────────────────────────────────────

function getHeuristic(
  name: HeuristicName,
  currentPos: Position3D,
  neighborPos: Position3D,
  goalPos: Position3D,
  startPos: Position3D,
): number {
  if (name === HEURISTICS.MAGNETIC_FIELD) {
    return magneticFieldHeuristic(currentPos, neighborPos, goalPos, startPos)
  }
  return straightLineHeuristic(neighborPos, goalPos)
}

// ─── A* ───────────────────────────────────────────────────────────────────────

/**
 * Run A* from startId to goalId.
 * @returns AstarResult, or null if no path exists.
 */
export function astar(
  startId: string,
  goalId: string,
  heuristicName: HeuristicName = HEURISTICS.MAGNETIC_FIELD,
): AstarResult | null {
  if (startId === goalId) {
    return {
      path: [startId],
      totalDistance: 0,
      exploredOrder: [startId],
      exploredCosts: { [startId]: 0 },
    }
  }

  const startCity = cities[startId]
  const goalCity = cities[goalId]
  if (startCity === undefined || goalCity === undefined) return null

  const adj = buildAdjacency()
  const startPos = startCity.position
  const goalPos = goalCity.position

  const gCost: Record<string, number> = { [startId]: 0 }
  const cameFrom: Record<string, string> = {}
  const closed = new Set<string>()
  const exploredOrder: string[] = []

  const openSet = new MinHeap()
  const h0 = getHeuristic(heuristicName, startPos, startPos, goalPos, startPos)
  openSet.push({ id: startId, f: h0 })

  while (openSet.size > 0) {
    const popped = openSet.pop()
    if (popped === undefined) break
    const current = popped.id

    if (closed.has(current)) continue
    closed.add(current)
    exploredOrder.push(current)

    if (current === goalId) {
      // Reconstruct path
      const path: string[] = []
      let node: string | undefined = goalId
      while (node !== undefined) {
        path.unshift(node)
        node = cameFrom[node]
      }
      return {
        path,
        totalDistance: gCost[goalId] ?? 0,
        exploredOrder,
        exploredCosts: { ...gCost },
      }
    }

    const currentCity = cities[current]
    if (currentCity === undefined) continue
    const currentPos = currentCity.position
    const neighbors = adj[current] ?? []

    for (const { city: neighborId, distance } of neighbors) {
      if (closed.has(neighborId)) continue

      const tentativeG = (gCost[current] ?? Number.POSITIVE_INFINITY) + distance

      if (tentativeG < (gCost[neighborId] ?? Infinity)) {
        gCost[neighborId] = tentativeG
        cameFrom[neighborId] = current

        const neighborCity = cities[neighborId]
        if (neighborCity === undefined) continue
        const neighborPos = neighborCity.position
        const h = getHeuristic(heuristicName, currentPos, neighborPos, goalPos, startPos)
        openSet.push({ id: neighborId, f: tentativeG + h })
      }
    }
  }

  return null
}
