// Canonical Romanian road network used by search, diagnostics, and presentation.
// Weights are the road distances in km from the assignment map.

import { CITY_IDS, type CityId } from './cityIds.js'

export interface Edge {
  readonly from: CityId
  readonly to: CityId
  readonly distance: number
}

export interface AdjacencyEntry {
  readonly city: CityId
  readonly distance: number
}

export type AdjacencyMap = Readonly<Record<string, readonly AdjacencyEntry[]>>

export interface WeightedGraph {
  readonly cityIds: readonly CityId[]
  readonly edges: readonly Edge[]
  readonly adjacency: AdjacencyMap
}

export const edges: Edge[] = [
  { from: 'arad', to: 'zerind', distance: 75 },
  { from: 'arad', to: 'sibiu', distance: 140 },
  { from: 'arad', to: 'timisoara', distance: 118 },

  { from: 'zerind', to: 'oradea', distance: 71 },

  { from: 'oradea', to: 'sibiu', distance: 151 },

  { from: 'timisoara', to: 'lugoj', distance: 111 },

  { from: 'lugoj', to: 'mehadia', distance: 70 },

  { from: 'mehadia', to: 'drobeta', distance: 75 },

  { from: 'drobeta', to: 'craiova', distance: 120 },

  { from: 'craiova', to: 'rimnicu', distance: 146 },
  { from: 'craiova', to: 'pitesti', distance: 138 },

  { from: 'sibiu', to: 'fagaras', distance: 99 },
  { from: 'sibiu', to: 'rimnicu', distance: 80 },

  { from: 'rimnicu', to: 'pitesti', distance: 97 },

  { from: 'fagaras', to: 'bucharest', distance: 211 },

  { from: 'pitesti', to: 'bucharest', distance: 101 },

  { from: 'bucharest', to: 'giurgiu', distance: 90 },
  { from: 'bucharest', to: 'urziceni', distance: 85 },

  { from: 'urziceni', to: 'hirsova', distance: 98 },
  { from: 'urziceni', to: 'vaslui', distance: 142 },

  { from: 'hirsova', to: 'eforie', distance: 86 },

  { from: 'vaslui', to: 'iasi', distance: 92 },

  { from: 'iasi', to: 'neamt', distance: 87 },
]

// Build adjacency map: city -> [{ city, distance }]
export function buildAdjacency(): AdjacencyMap {
  const adj: Record<string, AdjacencyEntry[]> = Object.fromEntries(
    CITY_IDS.map((cityId) => [cityId, []]),
  )
  for (const e of edges) {
    const fromList = adj[e.from]
    const toList = adj[e.to]
    if (fromList === undefined || toList === undefined) {
      throw new Error(`Road references an unknown city: ${e.from} - ${e.to}`)
    }
    fromList.push({ city: e.to, distance: e.distance })
    toList.push({ city: e.from, distance: e.distance })
  }
  return adj
}

export const adjacency = buildAdjacency()

export const romaniaGraph: WeightedGraph = {
  cityIds: CITY_IDS,
  edges,
  adjacency,
}
