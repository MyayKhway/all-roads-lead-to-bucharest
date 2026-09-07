/**
 * A* Search Algorithm
 *
 * f(n) = g(n) + h(n)
 *   g(n) = actual cost from start to current node (road km)
 *   h(n) = heuristic estimate from current node to goal
 */

import { buildAdjacency } from '../data/graph';
import { cities } from '../data/cities';
import type { Position3D } from '../data/cities';
import { magneticFieldHeuristic, straightLineHeuristic } from './magneticField';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AstarResult {
  path: string[];
  totalDistance: number;
  exploredOrder: string[];
  exploredCosts: Record<string, number>;
}

export const HEURISTICS = {
  MAGNETIC_FIELD: 'magnetic_field',
  STRAIGHT_LINE:  'straight_line',
} as const;

export type HeuristicName = typeof HEURISTICS[keyof typeof HEURISTICS];

// ─── Min-Heap ─────────────────────────────────────────────────────────────────

interface HeapNode {
  id: string;
  f: number;
}

class MinHeap {
  private _data: HeapNode[] = [];

  push(item: HeapNode): void {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }

  pop(): HeapNode {
    const top = this._data[0];
    const last = this._data.pop()!;
    if (this._data.length > 0) {
      this._data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  get size(): number {
    return this._data.length;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].f <= this._data[i].f) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l].f < this._data[smallest].f) smallest = l;
      if (r < n && this._data[r].f < this._data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
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
    return magneticFieldHeuristic(currentPos, neighborPos, goalPos, startPos);
  }
  return straightLineHeuristic(neighborPos, goalPos);
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
    };
  }

  const adj      = buildAdjacency();
  const startPos = cities[startId].position;
  const goalPos  = cities[goalId].position;

  const gCost: Record<string, number>  = { [startId]: 0 };
  const cameFrom: Record<string, string> = {};
  const closed   = new Set<string>();
  const exploredOrder: string[] = [];

  const openSet = new MinHeap();
  const h0 = getHeuristic(heuristicName, startPos, startPos, goalPos, startPos);
  openSet.push({ id: startId, f: h0 });

  while (openSet.size > 0) {
    const { id: current } = openSet.pop();

    if (closed.has(current)) continue;
    closed.add(current);
    exploredOrder.push(current);

    if (current === goalId) {
      // Reconstruct path
      const path: string[] = [];
      let node: string | undefined = goalId;
      while (node !== undefined) {
        path.unshift(node);
        node = cameFrom[node];
      }
      return {
        path,
        totalDistance: gCost[goalId],
        exploredOrder,
        exploredCosts: { ...gCost },
      };
    }

    const currentPos  = cities[current].position;
    const neighbors   = adj[current] ?? [];

    for (const { city: neighborId, distance } of neighbors) {
      if (closed.has(neighborId)) continue;

      const tentativeG = gCost[current] + distance;

      if (tentativeG < (gCost[neighborId] ?? Infinity)) {
        gCost[neighborId]    = tentativeG;
        cameFrom[neighborId] = current;

        const neighborPos = cities[neighborId].position;
        const h = getHeuristic(heuristicName, currentPos, neighborPos, goalPos, startPos);
        openSet.push({ id: neighborId, f: tentativeG + h });
      }
    }
  }

  return null;
}
