/**
 * placement — controlled, deterministic placement of decorative scenery.
 *
 * Nothing is dropped at pure random: every candidate position is seeded (so the
 * map looks the same on every load) and must pass the same clearance rules,
 * which encode the visual hierarchy
 *
 *   route > landmarks > labels > roads > mountains & terrain > vegetation
 *
 * — trees keep off roads and away from landmarks, and relief never sits on a
 * road or crowds a city. Trees are only planted *behind* (north of) landmarks,
 * so they frame a city without hiding it from the camera, which looks from the
 * south.
 */

import { cities } from '../data/cities'
import { edges } from '../data/graph'
import {
  RIVERS,
  ROMANIA_OUTLINE,
  TERRAIN,
  type TerrainFeature,
  type TerrainModel,
  type XZ,
} from './geography'

export type VegetationModel =
  | 'pine'
  | 'round'
  | 'small'
  | 'large'
  | 'poplar'
  | 'bush'
  | 'grass'
  | 'rock'

export interface Instance {
  position: [number, number, number]
  rotationY: number
  scale: [number, number, number]
}

/** Top surface of the raised Romania landmass. */
export const LAND_Y = -0.012
/** The lower plain surrounding the country. */
export const PLAIN_Y = -0.34

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function insidePolygon(x: number, z: number, poly: readonly XZ[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (!a || !b) continue
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside
    }
  }
  return inside
}

function distToSegment(x: number, z: number, a: XZ, b: XZ): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2))
  return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz))
}

const ROAD_SEGMENTS: [XZ, XZ][] = edges.flatMap((e) => {
  const a = cities[e.from]?.position
  const b = cities[e.to]?.position
  return a && b ? [[[a[0], a[2]] as XZ, [b[0], b[2]] as XZ]] : []
})

const CITY_POINTS: XZ[] = Object.values(cities).map((c) => [c.position[0], c.position[2]])

export function roadDistance(x: number, z: number): number {
  let d = Number.POSITIVE_INFINITY
  for (const [a, b] of ROAD_SEGMENTS) d = Math.min(d, distToSegment(x, z, a, b))
  return d
}

export function cityDistance(x: number, z: number): number {
  let d = Number.POSITIVE_INFINITY
  for (const [cx, cz] of CITY_POINTS) d = Math.min(d, Math.hypot(x - cx, z - cz))
  return d
}

function riverDistance(x: number, z: number): number {
  let d = Number.POSITIVE_INFINITY
  for (const river of RIVERS) {
    for (let i = 0; i < river.points.length - 1; i++) {
      const a = river.points[i]
      const b = river.points[i + 1]
      if (a && b) d = Math.min(d, distToSegment(x, z, a, b) - river.width / 2)
    }
  }
  return d
}

// ─── Relief ───────────────────────────────────────────────────────────────────

/**
 * A relief feature must keep its footprint off every road and stay clear of
 * cities; anything that fails is dropped (and reported in development) rather
 * than allowed to cover part of the graph.
 */
function reliefIsClear(f: TerrainFeature): boolean {
  if (f.background) return true
  return roadDistance(f.x, f.z) >= f.r * 0.9 + 0.1 && cityDistance(f.x, f.z) >= f.r + 0.7
}

const rejectedRelief = TERRAIN.filter((f) => !reliefIsClear(f))
if (import.meta.env?.DEV && rejectedRelief.length > 0) {
  console.warn(
    'Scenery: relief dropped for crowding roads or cities:',
    rejectedRelief.map((f) => `${f.model}@(${f.x}, ${f.z})`),
  )
}

export const RELIEF: readonly TerrainFeature[] = TERRAIN.filter(reliefIsClear)

export function reliefInstances(): Record<TerrainModel, Instance[]> {
  const out: Record<TerrainModel, Instance[]> = {
    mountain_a: [],
    mountain_b: [],
    mountain_c: [],
    hill: [],
  }
  for (const f of RELIEF) {
    out[f.model].push({
      position: [f.x, f.background ? PLAIN_Y : LAND_Y, f.z],
      rotationY: f.rot,
      scale: [f.r, f.h, f.r * 0.92],
    })
  }
  return out
}

/** Keep vegetation off the slopes of mountains and hills (it would clip). */
function onRelief(x: number, z: number): boolean {
  return RELIEF.some((f) => Math.hypot(x - f.x, z - f.z) < f.r * (f.model === 'hill' ? 0.7 : 0.88))
}

// ─── Vegetation ───────────────────────────────────────────────────────────────

interface Rules {
  road: number
  city: number
  river: number
  spacing: number
}

const TREE_RULES: Rules = { road: 0.28, city: 0.8, river: 0.14, spacing: 0.18 }
const SMALL_RULES: Rules = { road: 0.16, city: 0.55, river: 0.08, spacing: 0.1 }

interface Forest {
  x: number
  z: number
  r: number
  count: number
  mix: Partial<Record<VegetationModel, number>>
}

/** Forest stands — mostly conifers in the mountains, broadleaf in the lowlands. */
const FORESTS: Forest[] = [
  { x: 1.5, z: -4.4, r: 1.0, count: 20, mix: { pine: 5, round: 1 } },
  { x: 1.6, z: -6.2, r: 0.8, count: 13, mix: { pine: 4, large: 1 } },
  { x: -1.2, z: -6.7, r: 1.0, count: 17, mix: { pine: 2, round: 2, large: 1 } },
  { x: -3.6, z: -5.1, r: 0.7, count: 10, mix: { pine: 3, round: 1 } },
  { x: -2.1, z: 0.5, r: 0.55, count: 7, mix: { pine: 4, round: 1 } },
  { x: -1.3, z: 2.3, r: 0.5, count: 6, mix: { pine: 2, round: 2 } },
  { x: 3.8, z: -2.5, r: 0.8, count: 12, mix: { pine: 2, large: 2, round: 1 } },
  { x: 2.0, z: -1.0, r: 0.45, count: 5, mix: { pine: 3, round: 1 } },
  { x: 3.0, z: 3.5, r: 0.6, count: 10, mix: { large: 3, round: 2 } },
  { x: 6.9, z: -2.4, r: 0.7, count: 11, mix: { round: 3, large: 2 } },
  { x: 5.5, z: -6.8, r: 0.7, count: 10, mix: { round: 2, pine: 2, large: 1 } },
  { x: -7.3, z: -0.8, r: 0.6, count: 8, mix: { round: 3, large: 1 } },
  { x: 1.1, z: 3.0, r: 0.6, count: 8, mix: { large: 2, round: 2 } },
  { x: -4.9, z: -4.3, r: 0.5, count: 6, mix: { round: 2, small: 1 } },
  { x: 7.9, z: -5.5, r: 0.5, count: 6, mix: { round: 2, large: 1 } },
]

/** Plain roads get rows of poplars — a familiar sight in the Romanian lowlands. */
const POPLAR_ROADS: [string, string][] = [
  ['craiova', 'pitesti'],
  ['bucharest', 'giurgiu'],
  ['bucharest', 'urziceni'],
  ['arad', 'timisoara'],
]

function pick(mix: Partial<Record<VegetationModel, number>>, r: number): VegetationModel {
  const entries = Object.entries(mix) as [VegetationModel, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let t = r * total
  for (const [model, w] of entries) {
    t -= w
    if (t <= 0) return model
  }
  return entries[0]?.[0] ?? 'round'
}

const SCALE_RANGE: Record<VegetationModel, [number, number]> = {
  pine: [0.32, 0.48],
  round: [0.29, 0.41],
  small: [0.26, 0.36],
  large: [0.31, 0.43],
  poplar: [0.34, 0.46],
  bush: [0.45, 0.75],
  grass: [0.6, 1.05],
  rock: [0.45, 1.1],
}

export function vegetationInstances(): Record<VegetationModel, Instance[]> {
  const out: Record<VegetationModel, Instance[]> = {
    pine: [],
    round: [],
    small: [],
    large: [],
    poplar: [],
    bush: [],
    grass: [],
    rock: [],
  }
  const taken: { x: number; z: number; r: number }[] = []
  const rand = rng(20240924)

  const fits = (x: number, z: number, rules: Rules) =>
    insidePolygon(x, z, ROMANIA_OUTLINE) &&
    roadDistance(x, z) >= rules.road &&
    cityDistance(x, z) >= rules.city &&
    riverDistance(x, z) >= rules.river &&
    !onRelief(x, z) &&
    !taken.some((t) => Math.hypot(t.x - x, t.z - z) < Math.max(t.r, rules.spacing))

  const place = (model: VegetationModel, x: number, z: number, rules: Rules, scale?: number) => {
    if (!fits(x, z, rules)) return false
    const [lo, hi] = SCALE_RANGE[model]
    const s = scale ?? lo + rand() * (hi - lo)
    const squash = model === 'rock' ? 0.7 + rand() * 0.4 : 0.9 + rand() * 0.2
    out[model].push({
      position: [x, LAND_Y, z],
      rotationY: rand() * Math.PI * 2,
      scale: [s, s * squash, s],
    })
    taken.push({ x, z, r: rules.spacing })
    return true
  }

  // 1. Forest stands
  for (const f of FORESTS) {
    let placed = 0
    for (let attempt = 0; attempt < f.count * 6 && placed < f.count; attempt++) {
      const a = rand() * Math.PI * 2
      const d = Math.sqrt(rand()) * f.r
      if (place(pick(f.mix, rand()), f.x + Math.cos(a) * d, f.z + Math.sin(a) * d, TREE_RULES))
        placed++
    }
  }

  // 2. A couple of trees framing each landmark — always on its far (north) side
  for (const [cx, cz] of CITY_POINTS) {
    for (let i = 0; i < 2; i++) {
      const a = Math.PI * (1.12 + i * 0.76) + (rand() - 0.5) * 0.25
      const d = 0.74 + rand() * 0.24
      place(i % 2 ? 'round' : 'small', cx + Math.cos(a) * d, cz + Math.sin(a) * d, {
        ...TREE_RULES,
        city: 0.7,
        spacing: 0.16,
      })
    }
  }

  // 3. Poplar rows along lowland roads
  for (const [from, to] of POPLAR_ROADS) {
    const a = cities[from]?.position
    const b = cities[to]?.position
    if (!a || !b) continue
    const dx = b[0] - a[0]
    const dz = b[2] - a[2]
    const len = Math.hypot(dx, dz)
    const nx = -dz / len
    const nz = dx / len
    for (let t = 0.8; t < len - 0.8; t += 0.52) {
      const x = a[0] + (dx / len) * t
      const z = a[2] + (dz / len) * t
      place('poplar', x + nx * 0.3, z + nz * 0.3, { ...TREE_RULES, road: 0.22, spacing: 0.15 })
    }
  }

  // 4. Scattered trees over open country
  for (let i = 0; i < 900 && out.round.length + out.small.length + out.large.length < 90; i++) {
    const x = -8.6 + rand() * 20
    const z = -8.6 + rand() * 14.8
    place(pick({ round: 3, small: 3, large: 1, pine: 1 }, rand()), x, z, TREE_RULES)
  }

  // 5. Bushes and rocks
  for (let i = 0; i < 1200 && out.bush.length < 120; i++) {
    place('bush', -8.6 + rand() * 20, -8.6 + rand() * 14.8, SMALL_RULES)
  }
  for (const f of RELIEF) {
    if (f.background || f.model === 'hill') continue
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2
      const d = f.r * (0.92 + rand() * 0.35)
      place('rock', f.x + Math.cos(a) * d, f.z + Math.sin(a) * d, SMALL_RULES)
    }
  }

  // 6. Grass tufts — ground detail, allowed closer to everything, but still
  // spaced from one another so they read as scattered rather than a clump.
  const grassRules: Rules = { road: 0.12, city: 0.6, river: 0.05, spacing: 0.22 }
  for (let i = 0; i < 4000 && out.grass.length < 220; i++) {
    place('grass', -8.6 + rand() * 20, -8.6 + rand() * 14.8, grassRules)
  }

  return out
}
