// Romanian cities with 3D positions and metadata.
// Positions are laid out to approximate Romania's geography on the XZ plane.
// Y is always 0 (ground level); landmarks sit on top.

export type Position3D = [number, number, number]

export interface City {
  id: string
  name: string
  landmark: string
  position: Position3D
  model: string
  color: string
}

export type CityMap = Record<string, City>

export const cities: CityMap = {
  arad: {
    id: 'arad',
    name: 'Arad',
    landmark: 'Arad Fortress',
    position: [-6.5, 0, -2.5],
    model: '/models/arad/arad.glb',
    color: '#A8D5BA',
  },
  zerind: {
    id: 'zerind',
    name: 'Zerind',
    landmark: 'Zerind Church',
    position: [-6.0, 0, -4.5],
    model: '/models/zerind/zerind.glb',
    color: '#A8D5BA',
  },
  oradea: {
    id: 'oradea',
    name: 'Oradea',
    landmark: 'Oradea Fortress',
    position: [-5.5, 0, -6.0],
    model: '/models/oradea/oradea.glb',
    color: '#A8D5BA',
  },
  timisoara: {
    id: 'timisoara',
    name: 'Timișoara',
    landmark: 'Metropolitan Cathedral',
    position: [-6.0, 0, 0.5],
    model: '/models/timisoara/timisoara.glb',
    color: '#A8D5BA',
  },
  lugoj: {
    id: 'lugoj',
    name: 'Lugoj',
    landmark: 'Lugoj Cathedral',
    position: [-4.5, 0, 0.5],
    model: '/models/lugoj/lugoj.glb',
    color: '#A8D5BA',
  },
  mehadia: {
    id: 'mehadia',
    name: 'Mehadia',
    landmark: 'Mehadia Fort',
    position: [-4.0, 0, 2.0],
    model: '/models/mehadia/mehadia.glb',
    color: '#A8D5BA',
  },
  drobeta: {
    id: 'drobeta',
    name: 'Drobeta',
    landmark: "Trajan's Bridge",
    position: [-3.5, 0, 3.5],
    model: '/models/drobeta/drobeta.glb',
    color: '#A8D5BA',
  },
  craiova: {
    id: 'craiova',
    name: 'Craiova',
    landmark: 'Craiova Palace',
    position: [-1.0, 0, 4.0],
    model: '/models/craiova/craiova.glb',
    color: '#A8D5BA',
  },
  sibiu: {
    id: 'sibiu',
    name: 'Sibiu',
    landmark: 'Bridge of Lies',
    position: [-1.5, 0, -1.0],
    model: '/models/sibiu/sibiu.glb',
    color: '#A8D5BA',
  },
  rimnicu: {
    id: 'rimnicu',
    name: 'Rimnicu Vilcea',
    landmark: 'Rimnicu Old Court',
    position: [0.5, 0, 0.5],
    model: '/models/rimnicu/rimnicu.glb',
    color: '#A8D5BA',
  },
  pitesti: {
    id: 'pitesti',
    name: 'Pitesti',
    landmark: 'Pitesti Citadel',
    position: [2.0, 0, 1.5],
    model: '/models/pitesti/pitesti.glb',
    color: '#A8D5BA',
  },
  fagaras: {
    id: 'fagaras',
    name: 'Fagaras',
    landmark: 'Fagaras Fortress',
    position: [0.5, 0, -1.5],
    model: '/models/fagaras/fagaras.glb',
    color: '#A8D5BA',
  },
  bucharest: {
    id: 'bucharest',
    name: 'Bucharest',
    landmark: 'Palace of Parliament',
    position: [4.0, 0, 2.5],
    model: '/models/bucharest/bucharest.glb',
    color: '#A8D5BA',
  },
  giurgiu: {
    id: 'giurgiu',
    name: 'Giurgiu',
    landmark: 'Giurgiu Fortress',
    position: [3.5, 0, 4.5],
    model: '/models/giurgiu/giurgiu.glb',
    color: '#A8D5BA',
  },
  urziceni: {
    id: 'urziceni',
    name: 'Urziceni',
    landmark: 'Urziceni Church',
    position: [5.5, 0, 2.0],
    model: '/models/urziceni/urziceni.glb',
    color: '#A8D5BA',
  },
  hirsova: {
    id: 'hirsova',
    name: 'Hirsova',
    landmark: 'Hirsova Fortress',
    position: [7.5, 0, 2.5],
    model: '/models/hirsova/hirsova.glb',
    color: '#A8D5BA',
  },
  eforie: {
    id: 'eforie',
    name: 'Eforie',
    landmark: 'Eforie Resort',
    position: [8.5, 0, 3.5],
    model: '/models/eforie/eforie.glb',
    color: '#A8D5BA',
  },
  vaslui: {
    id: 'vaslui',
    name: 'Vaslui',
    landmark: 'Vaslui Citadel',
    position: [6.0, 0, -3.0],
    model: '/models/vaslui/vaslui.glb',
    color: '#A8D5BA',
  },
  iasi: {
    id: 'iasi',
    name: 'Iași',
    landmark: 'Palace of Culture',
    position: [6.5, 0, -5.5],
    model: '/models/iasi/iasi.glb',
    color: '#A8D5BA',
  },
  neamt: {
    id: 'neamt',
    name: 'Neamt',
    landmark: 'Neamt Fortress',
    position: [4.5, 0, -5.0],
    model: '/models/neamt/neamt.glb',
    color: '#A8D5BA',
  },
}

export const cityList: City[] = Object.values(cities)

/**
 * Look up a city's position, tolerating ids that aren't in the map.
 * Keeps callers free of repeated undefined checks under `noUncheckedIndexedAccess`.
 */
export function positionOf(map: CityMap, id: string | undefined): Position3D | undefined {
  return id === undefined ? undefined : map[id]?.position
}
