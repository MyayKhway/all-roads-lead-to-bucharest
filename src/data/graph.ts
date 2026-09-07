// Romanian road network represented as a weighted undirected graph.
// Weights are approximate road distances in km (classic AI textbook values).

export interface Edge {
  from: string;
  to: string;
  distance: number;
}

export interface AdjacencyEntry {
  city: string;
  distance: number;
}

export type AdjacencyMap = Record<string, AdjacencyEntry[]>;

export const edges: Edge[] = [
  { from: 'arad',      to: 'zerind',    distance: 75  },
  { from: 'arad',      to: 'sibiu',     distance: 140 },
  { from: 'arad',      to: 'timisoara', distance: 118 },

  { from: 'zerind',    to: 'oradea',    distance: 71  },

  { from: 'oradea',    to: 'sibiu',     distance: 151 },

  { from: 'timisoara', to: 'lugoj',     distance: 111 },

  { from: 'lugoj',     to: 'mehadia',   distance: 70  },

  { from: 'mehadia',   to: 'drobeta',   distance: 75  },

  { from: 'drobeta',   to: 'craiova',   distance: 120 },

  { from: 'craiova',   to: 'rimnicu',   distance: 146 },
  { from: 'craiova',   to: 'pitesti',   distance: 138 },

  { from: 'sibiu',     to: 'fagaras',   distance: 99  },
  { from: 'sibiu',     to: 'rimnicu',   distance: 80  },

  { from: 'rimnicu',   to: 'pitesti',   distance: 97  },

  { from: 'fagaras',   to: 'bucharest', distance: 211 },

  { from: 'pitesti',   to: 'bucharest', distance: 101 },

  { from: 'bucharest', to: 'giurgiu',   distance: 90  },
  { from: 'bucharest', to: 'urziceni',  distance: 85  },

  { from: 'urziceni',  to: 'hirsova',   distance: 98  },
  { from: 'urziceni',  to: 'vaslui',    distance: 142 },

  { from: 'hirsova',   to: 'eforie',    distance: 86  },

  { from: 'vaslui',    to: 'iasi',      distance: 92  },

  { from: 'iasi',      to: 'neamt',     distance: 87  },
];

// Build adjacency map: city -> [{ city, distance }]
export function buildAdjacency(): AdjacencyMap {
  const adj: AdjacencyMap = {};
  for (const e of edges) {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to])   adj[e.to]   = [];
    adj[e.from].push({ city: e.to,   distance: e.distance });
    adj[e.to].push(  { city: e.from, distance: e.distance });
  }
  return adj;
}
