/**
 * A* Search Algorithm
 *
 * f(n) = g(n) + h(n)
 *   g(n) = actual cost from start to current node (road km)
 *   h(n) = heuristic estimate from current node to goal
 *
 * Returns:
 *   {
 *     path:          string[]   — ordered city ids from start to goal
 *     totalDistance: number     — total km of chosen route
 *     exploredOrder: string[]   — order in which cities were popped from open set
 *     exploredCosts: object     — { cityId: gCost } for every explored city
 *   }
 *
 * Returns null if no path exists.
 */

import { buildAdjacency } from '../data/graph.js';
import { cities } from '../data/cities.js';
import {
  magneticFieldHeuristic,
  straightLineHeuristic,
} from './magneticField.js';

// ---------- tiny priority queue (min-heap) ----------

class MinHeap {
  constructor() { this._data = []; }

  push(item) {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  get size() { return this._data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].f <= this._data[i].f) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }

  _siftDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this._data[l].f < this._data[smallest].f) smallest = l;
      if (r < n && this._data[r].f < this._data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
    }
  }
}

// ---------- heuristic selector ----------

export const HEURISTICS = {
  MAGNETIC_FIELD: 'magnetic_field',
  STRAIGHT_LINE:  'straight_line',
};

function getHeuristic(heuristicName, currentPos, neighborPos, goalPos, startPos) {
  if (heuristicName === HEURISTICS.MAGNETIC_FIELD) {
    return magneticFieldHeuristic(currentPos, neighborPos, goalPos, startPos);
  }
  return straightLineHeuristic(neighborPos, goalPos);
}

// ---------- main A* ----------

/**
 * @param {string} startId       - city id of start
 * @param {string} goalId        - city id of goal
 * @param {string} heuristicName - one of HEURISTICS values
 * @returns {{ path, totalDistance, exploredOrder, exploredCosts } | null}
 */
export function astar(startId, goalId, heuristicName = HEURISTICS.MAGNETIC_FIELD) {
  if (startId === goalId) {
    return { path: [startId], totalDistance: 0, exploredOrder: [startId], exploredCosts: { [startId]: 0 } };
  }

  const adj       = buildAdjacency();
  const startPos  = cities[startId].position;
  const goalPos   = cities[goalId].position;

  // g cost map
  const gCost     = { [startId]: 0 };
  // came-from map for path reconstruction
  const cameFrom  = {};
  // closed set
  const closed    = new Set();
  // exploration order log
  const exploredOrder = [];

  const openSet = new MinHeap();
  const h0 = getHeuristic(heuristicName, startPos, startPos, goalPos, startPos);
  openSet.push({ id: startId, f: h0 });

  while (openSet.size > 0) {
    const { id: current } = openSet.pop();

    if (closed.has(current)) continue;
    closed.add(current);
    exploredOrder.push(current);

    if (current === goalId) {
      // reconstruct path
      const path = [];
      let node = goalId;
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

    const currentPos = cities[current].position;
    const neighbors  = adj[current] || [];

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

  // No path found
  return null;
}
