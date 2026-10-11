// Romanian cities with 3D positions and metadata.
// Positions are laid out to approximate Romania's geography on the XZ plane.
// Y is always 0 (ground level); landmarks sit on top.
//
// Every city is drawn as a GLB model of a real landmark (public/models/<id>/).
// The models are built at roughly 2 × 2 model units, so `scale` normalises each
// one for *visual consistency* rather than real-world size: a village church
// and the Palace of the Parliament both stay large enough to read and click.

import type { CityId } from './cityIds.js'

export type Position3D = [number, number, number]

export interface City {
  id: CityId
  name: string
  landmark: string
  /** One-line description of how the landmark is represented in 3D. */
  representation: string
  position: Position3D
  model: string
  /** Uniform scale applied to the GLB so landmarks read at a consistent size. */
  scale: number
  color: string
}

export type CityMap = Record<string, City> & Record<CityId, City>

export const cities: CityMap = {
  arad: {
    id: 'arad',
    name: 'Arad',
    landmark: 'Arad Fortress',
    representation: 'Six-pointed Vauban star fortress with barracks and gate',
    position: [-6.5, 0, -2.5],
    model: '/models/arad/arad.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  zerind: {
    id: 'zerind',
    name: 'Zerind',
    landmark: 'Village Church',
    representation: 'Rural church with a tall spire among village houses',
    position: [-6.0, 0, -4.5],
    model: '/models/zerind/zerind.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  oradea: {
    id: 'oradea',
    name: 'Oradea',
    landmark: 'Oradea Fortress',
    representation: 'Pentagonal bastion fortress around the Princely Palace',
    position: [-5.5, 0, -6.0],
    model: '/models/oradea/oradea.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  timisoara: {
    id: 'timisoara',
    name: 'Timișoara',
    landmark: 'Metropolitan Cathedral',
    representation: 'Cross-plan cathedral with green onion domes and patterned roofs',
    position: [-6.0, 0, 0.5],
    model: '/models/timisoara/timisoara.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  lugoj: {
    id: 'lugoj',
    name: 'Lugoj',
    landmark: 'Iron Bridge',
    representation: 'Bowstring iron bridge over the Timiș, twin-towered cathedral behind',
    position: [-4.5, 0, 0.5],
    model: '/models/lugoj/lugoj.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  mehadia: {
    id: 'mehadia',
    name: 'Mehadia',
    landmark: 'Roman Baths of Herculane',
    representation: 'Ruined colonnade, arched walls, thermal pool and Hercules statue',
    position: [-4.0, 0, 2.0],
    model: '/models/mehadia/mehadia.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  drobeta: {
    id: 'drobeta',
    name: 'Drobeta',
    landmark: "Trajan's Bridge",
    representation: 'Stone piers carrying timber arches, with monumental portals',
    position: [-3.5, 0, 3.5],
    model: '/models/drobeta/drobeta.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  craiova: {
    id: 'craiova',
    name: 'Craiova',
    landmark: 'Jean Mihail Palace',
    representation: 'French baroque palace with mansard roofs — today the Art Museum',
    position: [-1.0, 0, 4.0],
    model: '/models/craiova/craiova.glb',
    scale: 0.55,
    color: '#A8D5BA',
  },
  sibiu: {
    id: 'sibiu',
    name: 'Sibiu',
    landmark: 'Bridge of Lies',
    representation: 'Cast-iron footbridge, Council Tower and roofs with "eyes"',
    position: [-1.5, 0, -1.0],
    model: '/models/sibiu/sibiu.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  rimnicu: {
    id: 'rimnicu',
    name: 'Râmnicu Vâlcea',
    landmark: 'St. Nicholas Church',
    representation: 'Trefoil Orthodox church with porch arcade and Archbishopric bell tower',
    position: [0.5, 0, 0.5],
    model: '/models/rimnicu/rimnicu.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  pitesti: {
    id: 'pitesti',
    name: 'Pitești',
    landmark: 'Princely Church',
    representation: 'Striped brick-and-plaster church with a slender tower',
    position: [2.0, 0, 1.5],
    model: '/models/pitesti/pitesti.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  fagaras: {
    id: 'fagaras',
    name: 'Făgăraș',
    landmark: 'Făgăraș Fortress',
    representation: 'Moated castle with four corner towers and a gate tower',
    position: [0.5, 0, -1.5],
    model: '/models/fagaras/fagaras.glb',
    scale: 0.55,
    color: '#A8D5BA',
  },
  bucharest: {
    id: 'bucharest',
    name: 'Bucharest',
    landmark: 'Palace of the Parliament',
    representation: 'Stepped monumental palace with colonnades and a grand portico',
    position: [4.0, 0, 2.5],
    model: '/models/bucharest/bucharest.glb',
    scale: 0.6,
    color: '#A8D5BA',
  },
  giurgiu: {
    id: 'giurgiu',
    name: 'Giurgiu',
    landmark: 'Giurgiu Clock Tower',
    representation: 'Stone watch tower with clock faces, lookout gallery and cupola',
    position: [3.5, 0, 4.5],
    model: '/models/giurgiu/giurgiu.glb',
    scale: 0.52,
    color: '#A8D5BA',
  },
  urziceni: {
    id: 'urziceni',
    name: 'Urziceni',
    landmark: "Heroes' Monument",
    representation: 'Obelisk on a stepped plinth, soldier statue and town church',
    position: [5.5, 0, 2.0],
    model: '/models/urziceni/urziceni.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  hirsova: {
    id: 'hirsova',
    name: 'Hîrșova',
    landmark: 'Carsium Fortress Ruins',
    representation: 'Broken walls and towers on a rocky bluff above the Danube',
    position: [7.5, 0, 2.5],
    model: '/models/hirsova/hirsova.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  eforie: {
    id: 'eforie',
    name: 'Eforie',
    landmark: 'Seaside Casino',
    representation: 'Domed Art Nouveau casino with a beach and parasols',
    position: [8.5, 0, 3.5],
    model: '/models/eforie/eforie.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  vaslui: {
    id: 'vaslui',
    name: 'Vaslui',
    landmark: 'Stephen the Great Monument',
    representation: 'Equestrian statue on a stepped plinth',
    position: [6.0, 0, -3.0],
    model: '/models/vaslui/vaslui.glb',
    scale: 0.54,
    color: '#A8D5BA',
  },
  iasi: {
    id: 'iasi',
    name: 'Iași',
    landmark: 'Palace of Culture',
    representation: 'Neo-gothic palace with a central clock tower and turrets',
    position: [6.5, 0, -5.5],
    model: '/models/iasi/iasi.glb',
    scale: 0.56,
    color: '#A8D5BA',
  },
  neamt: {
    id: 'neamt',
    name: 'Neamț',
    landmark: 'Neamț Fortress',
    representation: 'Hilltop citadel reached by a long arched bridge',
    position: [4.5, 0, -5.0],
    model: '/models/neamt/neamt.glb',
    scale: 0.54,
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
