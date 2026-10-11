/**
 * geography — decorative terrain data in scene coordinates (x, z).
 *
 * None of this feeds the pathfinding graph; it only gives the map a sense of
 * place. Shapes are simplified to match the city layout in data/cities.ts
 * (north is −z, the Black Sea is to the east, the Danube to the south).
 */

export type XZ = readonly [number, number]

/** Simplified national border, clockwise from the north-west. */
export const ROMANIA_OUTLINE: readonly XZ[] = [
  [-8.2, -6.6],
  [-6.6, -7.9],
  [-3.6, -8.4],
  [-0.5, -8.6],
  [2.5, -8.3],
  [5.0, -7.9],
  [7.4, -7.3],
  [8.3, -5.9],
  [8.5, -3.8],
  [9.1, -1.6],
  [9.9, 0.2],
  [11.0, 0.7],
  [11.3, 1.9],
  [10.4, 3.0],
  [10.1, 4.3],
  [9.9, 5.6],
  [8.2, 5.7],
  [6.8, 5.3],
  [5.2, 5.8],
  [3.8, 5.9],
  [2.0, 6.0],
  [0.0, 5.9],
  [-1.5, 6.0],
  [-3.0, 5.2],
  [-4.2, 4.5],
  [-5.3, 3.4],
  [-6.6, 3.2],
  [-7.8, 2.1],
  [-8.4, 0.4],
  [-8.3, -1.5],
  [-8.4, -3.5],
  [-8.6, -5.5],
]

/** The Black Sea, east of the coast. */
export const BLACK_SEA: readonly XZ[] = [
  [9.9, 5.6],
  [10.1, 4.3],
  [10.4, 3.0],
  [11.3, 1.9],
  [11.0, 0.7],
  [12.6, -1.2],
  [16, -4.5],
  [34, -8],
  [34, 24],
  [9.4, 24],
]

export interface River {
  name: string
  width: number
  points: readonly XZ[]
}

export const RIVERS: readonly River[] = [
  {
    name: 'Danube',
    width: 0.26,
    points: [
      [-6.5, 3.05],
      [-5.9, 3.25],
      [-4.6, 3.95],
      [-3.4, 4.35],
      [-2.0, 5.0],
      [0.0, 5.3],
      [2.0, 5.3],
      [3.6, 5.15],
      [5.2, 5.15],
      [6.3, 4.6],
      [6.7, 3.4],
      [6.75, 2.3],
      [6.9, 1.1],
      [7.6, 0.1],
      [8.9, -0.3],
      [10.0, 0.3],
      [10.85, 0.9],
    ],
  },
  {
    name: 'Olt',
    width: 0.13,
    points: [
      [2.2, -3.2],
      [1.6, -2.3],
      [0.6, -2.35],
      [-0.4, -1.9],
      [-0.6, -0.8],
      [-0.1, 0.0],
      [0.05, 1.0],
      [0.0, 2.0],
      [-0.2, 3.2],
      [0.1, 4.3],
      [0.2, 5.3],
    ],
  },
  {
    name: 'Mureș',
    width: 0.12,
    points: [
      [-2.8, -2.0],
      [-4.2, -1.9],
      [-5.6, -1.8],
      [-6.8, -1.75],
      [-8.3, -1.6],
    ],
  },
  {
    name: 'Siret',
    width: 0.12,
    points: [
      [5.4, -7.8],
      [5.5, -6.0],
      [5.2, -4.2],
      [5.0, -2.5],
      [5.3, -1.0],
      [6.4, -0.3],
      [7.6, 0.1],
    ],
  },
]

export type TerrainModel = 'mountain_a' | 'mountain_b' | 'mountain_c' | 'hill'

export interface TerrainFeature {
  model: TerrainModel
  x: number
  z: number
  /** footprint radius in scene units */
  r: number
  /** peak height in scene units */
  h: number
  rot: number
  /** true when the feature stands outside the border, on the lower plain */
  background?: boolean
}

/**
 * Hand-placed relief. Ranges sit in the gaps between roads roughly where the
 * real Carpathians, Apuseni and Măcin mountains are; the tallest peaks stand
 * beyond the northern border so they add depth behind the map without ever
 * blocking the camera's view of a city. Placement is validated at load time
 * against roads and cities (see placement.ts).
 */
export const TERRAIN: readonly TerrainFeature[] = [
  // Eastern Carpathians
  { model: 'mountain_a', x: 2.3, z: -7.3, r: 1.0, h: 1.25, rot: 0.3 },
  { model: 'mountain_b', x: 3.1, z: -6.3, r: 0.9, h: 1.1, rot: 1.2 },
  { model: 'mountain_a', x: 2.4, z: -5.3, r: 0.95, h: 1.15, rot: 2.1 },
  { model: 'mountain_c', x: 3.0, z: -4.2, r: 0.85, h: 0.95, rot: 0.8 },
  { model: 'mountain_b', x: 2.3, z: -3.2, r: 0.8, h: 0.85, rot: 2.8 },
  { model: 'mountain_c', x: 1.3, z: -6.8, r: 0.7, h: 0.75, rot: 1.7 },
  { model: 'mountain_b', x: 3.6, z: -7.5, r: 0.7, h: 0.85, rot: 0.1 },
  // Curvature Carpathians
  { model: 'mountain_a', x: 3.3, z: -1.6, r: 0.8, h: 0.95, rot: 1.4 },
  { model: 'mountain_b', x: 4.3, z: -0.7, r: 0.7, h: 0.75, rot: 2.4 },
  { model: 'mountain_c', x: 2.9, z: -0.3, r: 0.55, h: 0.55, rot: 0.5 },
  // Southern Carpathians (Retezat, Parâng)
  { model: 'mountain_a', x: -2.6, z: 0.4, r: 0.75, h: 1.0, rot: 0.6 },
  { model: 'mountain_b', x: -1.8, z: 1.4, r: 0.7, h: 0.9, rot: 2.2 },
  { model: 'mountain_c', x: -2.7, z: 1.9, r: 0.6, h: 0.75, rot: 1.1 },
  { model: 'mountain_c', x: -2.2, z: 2.7, r: 0.5, h: 0.55, rot: 2.9 },
  // Apuseni
  { model: 'mountain_b', x: -3.2, z: -6.4, r: 0.8, h: 0.9, rot: 0.4 },
  { model: 'mountain_c', x: -2.2, z: -5.8, r: 0.75, h: 0.8, rot: 1.6 },
  { model: 'mountain_c', x: -2.6, z: -4.5, r: 0.7, h: 0.65, rot: 2.5 },
  { model: 'mountain_c', x: -4.0, z: -3.0, r: 0.55, h: 0.5, rot: 0.9 },
  // Măcin mountains in Dobrogea
  { model: 'mountain_c', x: 8.7, z: 0.95, r: 0.6, h: 0.5, rot: 1.3 },
  // Rolling hills — Transylvanian plateau, Subcarpathians, Moldavia, Dobrogea
  { model: 'hill', x: -0.2, z: -4.8, r: 0.9, h: 0.32, rot: 0.2 },
  { model: 'hill', x: 0.9, z: -3.6, r: 0.8, h: 0.28, rot: 1.1 },
  { model: 'hill', x: -0.8, z: -3.4, r: 0.7, h: 0.26, rot: 2.0 },
  { model: 'hill', x: 0.6, z: -5.9, r: 0.8, h: 0.3, rot: 2.7 },
  { model: 'hill', x: 4.2, z: -3.0, r: 0.8, h: 0.3, rot: 0.7 },
  { model: 'hill', x: 7.5, z: -3.8, r: 0.8, h: 0.3, rot: 1.9 },
  { model: 'hill', x: 7.4, z: -1.5, r: 0.9, h: 0.28, rot: 0.4 },
  { model: 'hill', x: 9.1, z: 2.3, r: 0.6, h: 0.24, rot: 2.3 },
  { model: 'hill', x: -7.3, z: -5.2, r: 0.7, h: 0.22, rot: 1.0 },
]
