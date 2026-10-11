/**
 * environment — reusable scenery models: trees, bushes, grass, rocks, hills
 * and mountains. Each is exported once and rendered many times through
 * instancing, so the whole forest costs one draw call per material.
 *
 * Trees are about 1 unit tall; terrain pieces have a footprint of radius 1 and
 * are stretched per instance at placement time.
 */

import * as THREE from 'three'
import { Model, rng } from './kit'

// ─── Trees & vegetation ───────────────────────────────────────────────────────

function blob(r: number, detail = 1): THREE.BufferGeometry {
  return new THREE.IcosahedronGeometry(r, detail)
}

export function pine(): Model {
  const m = new Model('pine')
  m.cyl(0.035, 0.05, 0.24, 6, 'trunk')
  m.cone(0.3, 0.44, 9, 'leafPine', 0, 0.14, 0)
  m.cone(0.24, 0.38, 9, 'leafPine', 0, 0.38, 0, 0.3)
  m.cone(0.16, 0.32, 9, 'leafPine', 0, 0.62, 0, 0.6)
  return m
}

export function roundTree(): Model {
  const m = new Model('round')
  m.cyl(0.04, 0.06, 0.4, 6, 'trunk')
  m.add(blob(0.3), 'leafRound', 0, 0.62, 0)
  m.add(blob(0.2), 'leafRound', 0.17, 0.5, 0.06)
  m.add(blob(0.19), 'leafRound', -0.14, 0.54, -0.1)
  return m
}

export function smallTree(): Model {
  const m = new Model('small')
  m.cyl(0.025, 0.04, 0.22, 6, 'trunk')
  m.add(blob(0.18), 'leafLight', 0, 0.36, 0)
  return m
}

export function largeTree(): Model {
  const m = new Model('large')
  m.cyl(0.06, 0.09, 0.42, 7, 'trunk')
  m.strut(new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(0.18, 0.55, 0.04), 0.03, 'trunk')
  m.strut(new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(-0.16, 0.56, -0.06), 0.03, 'trunk')
  m.add(blob(0.34), 'leafDeep', 0, 0.78, 0)
  m.add(blob(0.27), 'leafDeep', 0.26, 0.64, 0.04)
  m.add(blob(0.26), 'leafDeep', -0.24, 0.66, -0.06)
  m.add(blob(0.24), 'leafDeep', 0.02, 0.64, -0.26)
  m.add(blob(0.22), 'leafDeep', 0, 0.62, 0.24)
  return m
}

export function poplar(): Model {
  const m = new Model('poplar')
  m.cyl(0.03, 0.045, 0.2, 6, 'trunk')
  m.add(new THREE.SphereGeometry(0.15, 10, 10).scale(1, 3.2, 1), 'leafPoplar', 0, 0.62, 0)
  return m
}

export function bush(): Model {
  const m = new Model('bush')
  m.add(blob(0.16), 'leafRound', 0, 0.1, 0)
  m.add(blob(0.12), 'leafRound', 0.14, 0.07, 0.03)
  m.add(blob(0.11), 'leafRound', -0.12, 0.07, -0.04)
  return m
}

export function grassTuft(): Model {
  const m = new Model('grass')
  const blades: [number, number, number][] = [
    [0, 0, 0],
    [0.03, 0.02, 0.35],
    [-0.03, 0.01, -0.3],
    [0.01, -0.03, 0.15],
  ]
  for (const [x, z, lean] of blades) {
    const g = new THREE.ConeGeometry(0.018, 0.14, 4).translate(0, 0.07, 0)
    m.add(g, 'leafLight', x, 0, z, lean * 0.5, 0, lean)
  }
  return m
}

export function rock(): Model {
  const m = new Model('rock')
  const g = new THREE.DodecahedronGeometry(0.16, 0).scale(1, 0.6, 0.8)
  m.add(g, 'rock', 0, 0.05, 0)
  m.add(new THREE.DodecahedronGeometry(0.08, 0).scale(1, 0.7, 1), 'rock', 0.15, 0.02, 0.06)
  return m
}

// ─── Mountains & hills ────────────────────────────────────────────────────────

interface Peak {
  x: number
  z: number
  h: number
  r: number
}

const GRASS = new THREE.Color('#a9c98f')
const SLOPE = new THREE.Color('#c6bca9')
const ROCK = new THREE.Color('#b3adbd')
const SNOW = new THREE.Color('#f7f7f4')
const HILL_LOW = new THREE.Color('#a4cc8a')
const HILL_HIGH = new THREE.Color('#bddba0')

/**
 * Smooth low-poly mountain on a polar grid of radius 1. Height is the max of a
 * few rounded peaks plus gentle seeded noise; the rim is pinned to y = 0 so it
 * sits flush on the terrain. Colours are baked per vertex by height.
 */
function terrainPiece(
  name: string,
  peaks: Peak[],
  seed: number,
  snowLine: number,
  hill = false,
): Model {
  const rand = rng(seed)
  const rings = 9
  const segments = 30
  const noise = Array.from({ length: (rings + 1) * segments }, () => rand())

  const positions: number[] = []
  const heights: number[] = []
  const index: number[] = []
  const maxH = Math.max(...peaks.map((p) => p.h))

  positions.push(0, 0, 0)
  heights.push(0)
  for (let ring = 1; ring <= rings; ring++) {
    const r = ring / rings
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2
      const wobble = ring === rings ? 1 : 1 + ((noise[ring * segments + s] ?? 0.5) - 0.5) * 0.12
      const x = Math.cos(a) * r * wobble
      const z = Math.sin(a) * r * wobble
      let h = 0
      for (const p of peaks) {
        const d = Math.hypot(x - p.x, z - p.z) / p.r
        if (d < 1) h = Math.max(h, p.h * (hill ? (Math.cos(d * Math.PI) + 1) / 2 : (1 - d) ** 1.35))
      }
      const edgeFade = Math.min(1, (1 - r) * 4)
      h = (h + ((noise[ring * segments + s] ?? 0.5) - 0.5) * 0.06 * maxH) * edgeFade
      positions.push(x, Math.max(0, h), z)
      heights.push(Math.max(0, h))
    }
  }
  // Recompute the centre height from the peak field
  let hc = 0
  for (const p of peaks) {
    const d = Math.hypot(p.x, p.z) / p.r
    if (d < 1) hc = Math.max(hc, p.h * (hill ? (Math.cos(d * Math.PI) + 1) / 2 : (1 - d) ** 1.35))
  }
  positions[1] = hc
  heights[0] = hc

  const vid = (ring: number, s: number) =>
    ring === 0 ? 0 : 1 + (ring - 1) * segments + (s % segments)
  for (let s = 0; s < segments; s++) index.push(0, vid(1, s + 1), vid(1, s))
  for (let ring = 1; ring < rings; ring++) {
    for (let s = 0; s < segments; s++) {
      const a = vid(ring, s)
      const b = vid(ring, s + 1)
      const c = vid(ring + 1, s)
      const d = vid(ring + 1, s + 1)
      index.push(a, b, c, b, d, c)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(index)
  g.computeVertexNormals()

  const nor = g.getAttribute('normal')
  const colors: number[] = []
  const c = new THREE.Color()
  for (let i = 0; i < heights.length; i++) {
    const t = (heights[i] ?? 0) / maxH
    const steep = 1 - nor.getY(i)
    if (hill) {
      c.copy(HILL_LOW).lerp(HILL_HIGH, t)
    } else if (t < 0.3) {
      c.copy(GRASS).lerp(SLOPE, t / 0.3)
    } else if (t < snowLine) {
      c.copy(SLOPE).lerp(ROCK, Math.min(1, (t - 0.3) / (snowLine - 0.3) + steep * 0.3))
    } else {
      c.copy(ROCK).lerp(SNOW, Math.min(1, (t - snowLine) / 0.08))
    }
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const m = new Model(name)
  m.add(g, 'terrain')
  return m
}

export function mountainA(): Model {
  return terrainPiece(
    'mountain_a',
    [
      { x: 0, z: 0, h: 1.0, r: 0.95 },
      { x: 0.42, z: 0.12, h: 0.72, r: 0.6 },
      { x: -0.45, z: -0.1, h: 0.62, r: 0.55 },
    ],
    11,
    0.78,
  )
}

export function mountainB(): Model {
  return terrainPiece(
    'mountain_b',
    [
      { x: -0.2, z: 0.05, h: 1.0, r: 0.85 },
      { x: 0.35, z: -0.15, h: 0.86, r: 0.7 },
    ],
    23,
    0.8,
  )
}

export function mountainC(): Model {
  return terrainPiece('mountain_c', [{ x: 0, z: 0, h: 1.0, r: 1.0 }], 37, 0.9)
}

export function hill(): Model {
  return terrainPiece(
    'hill',
    [
      { x: 0, z: 0, h: 1.0, r: 1.0 },
      { x: 0.35, z: 0.2, h: 0.7, r: 0.6 },
    ],
    41,
    1,
    true,
  )
}

export const ENVIRONMENT: Record<string, { build: () => Model; ao: boolean }> = {
  pine: { build: pine, ao: true },
  round: { build: roundTree, ao: true },
  small: { build: smallTree, ao: true },
  large: { build: largeTree, ao: true },
  poplar: { build: poplar, ao: true },
  bush: { build: bush, ao: true },
  grass: { build: grassTuft, ao: false },
  rock: { build: rock, ao: true },
  mountain_a: { build: mountainA, ao: false },
  mountain_b: { build: mountainB, ao: false },
  mountain_c: { build: mountainC, ao: false },
  hill: { build: hill, ao: false },
}
