/**
 * kit — building blocks for the low-poly GLB models.
 *
 * Every model is assembled from a handful of simple primitives (boxes, prisms,
 * domes, arched walls) that each carry one named material from PALETTE. The
 * bake step later merges everything that shares a material, so a landmark ends
 * up as a few meshes no matter how many parts it was built from.
 *
 * Conventions:
 *   - Units are "model units". Landmarks fit a footprint of about 2 × 2 and are
 *     scaled down per city in src/data/cities.ts.
 *   - y is up and every primitive is placed by its *base*, so `box(..., y)` puts
 *     the bottom face at height y.
 *   - The main façade faces +z, which is where the map camera looks from.
 */

import * as THREE from 'three'

// ─── Palette ──────────────────────────────────────────────────────────────────

export const PALETTE = {
  // walls & masonry
  stone: '#e4d9c3',
  stoneLight: '#f1ebdf',
  stoneGray: '#cbc6ba',
  stoneDark: '#a8a193',
  plaster: '#f6f1e7',
  cream: '#f0e2c0',
  ochre: '#ecd49a',
  pink: '#eec3b1',
  brick: '#cf8f73',
  rock: '#b5ab9d',
  // roofs & domes
  roofRed: '#b9614f',
  roofBrown: '#8f5f4a',
  roofSlate: '#7e8997',
  roofDark: '#5e6672',
  domeGreen: '#86bea2',
  copper: '#7cb5a7',
  tileYellow: '#e8c36b',
  tileGreen: '#6fa889',
  // details
  window: '#4e5d74',
  metal: '#9ea6ae',
  iron: '#5f6a76',
  gold: '#e2c275',
  bronze: '#6e978a',
  wood: '#9c7757',
  woodDark: '#6f543f',
  canvas: '#f6e6c8',
  white: '#fbfaf6',
  red: '#e07a6a',
  blue: '#6f8fc9',
  // ground
  water: '#8fcadf',
  grass: '#a8cf8e',
  hedge: '#7fb27a',
  sand: '#efdcb0',
  // vegetation
  trunk: '#8a6a50',
  leafPine: '#6f9e7a',
  leafRound: '#8cbf7a',
  leafLight: '#a6d08a',
  leafDeep: '#79ad73',
  leafPoplar: '#8fbd6f',
  // terrain (vertex coloured)
  terrain: '#ffffff',
} as const

export type Swatch = keyof typeof PALETTE

const ROUGHNESS: Partial<Record<Swatch, number>> = {
  water: 0.2,
  metal: 0.45,
  iron: 0.5,
  gold: 0.35,
  bronze: 0.45,
  copper: 0.5,
  window: 0.35,
}

const METALNESS: Partial<Record<Swatch, number>> = {
  metal: 0.35,
  iron: 0.35,
  gold: 0.45,
  bronze: 0.4,
  copper: 0.15,
}

const materialCache = new Map<Swatch, THREE.MeshStandardMaterial>()

/** One shared physically based material per swatch — no textures. */
export function material(swatch: Swatch): THREE.MeshStandardMaterial {
  let m = materialCache.get(swatch)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      name: swatch,
      color: new THREE.Color(PALETTE[swatch]),
      roughness: ROUGHNESS[swatch] ?? 0.82,
      metalness: METALNESS[swatch] ?? 0,
    })
    materialCache.set(swatch, m)
  }
  return m
}

// ─── Deterministic randomness ─────────────────────────────────────────────────

/** mulberry32 — small seeded PRNG so every build produces identical models. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Shape helpers ────────────────────────────────────────────────────────────

export type P2 = readonly [number, number]

/** Regular polygon in the plan (x, z), first vertex at `startAngle`. */
export function polygon(sides: number, radius: number, startAngle = 0): P2[] {
  const pts: P2[] = []
  for (let i = 0; i < sides; i++) {
    const a = startAngle + (i / sides) * Math.PI * 2
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius])
  }
  return pts
}

/** Axis-aligned rectangle in the plan (x, z), centred on (cx, cz). */
export function rect(w: number, d: number, cx = 0, cz = 0): P2[] {
  return [
    [cx - w / 2, cz - d / 2],
    [cx + w / 2, cz - d / 2],
    [cx + w / 2, cz + d / 2],
    [cx - w / 2, cz + d / 2],
  ]
}

/** Plan points are (x, z); a Shape lives in (x, y) and is later rotated flat. */
function planShape(outer: readonly P2[], holes: readonly (readonly P2[])[] = []): THREE.Shape {
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)))
  for (const hole of holes) {
    shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))))
  }
  return shape
}

export interface Arch {
  /** centre of the opening along the wall */
  cx: number
  /** opening width */
  w: number
  /** height of the springing line — where the round top starts */
  spring: number
}

/**
 * Outline of a wall (in its own x/y plane) with round-headed openings cut into
 * the bottom edge. Used for arcades, gateways, ruins and bridges.
 */
export function archedWallOutline(
  width: number,
  height: number,
  arches: readonly Arch[],
): THREE.Shape {
  const sorted = [...arches].sort((a, b) => a.cx - b.cx)
  const pts: THREE.Vector2[] = [new THREE.Vector2(-width / 2, 0)]
  for (const arch of sorted) {
    const r = arch.w / 2
    pts.push(new THREE.Vector2(arch.cx - r, 0))
    pts.push(new THREE.Vector2(arch.cx - r, arch.spring))
    const steps = 10
    for (let i = 1; i < steps; i++) {
      const a = Math.PI - (i / steps) * Math.PI
      pts.push(new THREE.Vector2(arch.cx + Math.cos(a) * r, arch.spring + Math.sin(a) * r))
    }
    pts.push(new THREE.Vector2(arch.cx + r, arch.spring))
    pts.push(new THREE.Vector2(arch.cx + r, 0))
  }
  pts.push(new THREE.Vector2(width / 2, 0))
  pts.push(new THREE.Vector2(width / 2, height))
  pts.push(new THREE.Vector2(-width / 2, height))
  return new THREE.Shape(pts)
}

// ─── Model builder ────────────────────────────────────────────────────────────

/**
 * Model — accumulates primitives under a root group. `at()` opens a local
 * transform so a sub-assembly (a tower, a house) can be written once and placed
 * several times.
 */
export class Model {
  readonly root = new THREE.Group()
  private stack: THREE.Object3D[] = [this.root]

  constructor(name: string) {
    this.root.name = name
  }

  private get parent(): THREE.Object3D {
    return this.stack[this.stack.length - 1] ?? this.root
  }

  /** Run `build` inside a translated / rotated / scaled local frame. */
  at(x: number, y: number, z: number, ry: number, build: () => void, scale = 1): void {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    g.rotation.y = ry
    g.scale.setScalar(scale)
    this.parent.add(g)
    this.stack.push(g)
    build()
    this.stack.pop()
  }

  add(
    geometry: THREE.BufferGeometry,
    swatch: Swatch,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material(swatch))
    mesh.position.set(x, y, z)
    mesh.rotation.set(rx, ry, rz)
    this.parent.add(mesh)
    return mesh
  }

  box(w: number, h: number, d: number, s: Swatch, x = 0, y = 0, z = 0, ry = 0): THREE.Mesh {
    return this.add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), s, x, y, z, 0, ry)
  }

  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    seg: number,
    s: Swatch,
    x = 0,
    y = 0,
    z = 0,
    ry = 0,
  ): THREE.Mesh {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(0, h / 2, 0)
    return this.add(g, s, x, y, z, 0, ry)
  }

  cone(r: number, h: number, seg: number, s: Swatch, x = 0, y = 0, z = 0, ry = 0): THREE.Mesh {
    return this.add(new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0), s, x, y, z, 0, ry)
  }

  /** Four-sided roof over a w × d rectangle; `top` < 1 truncates it (mansard). */
  hip(
    w: number,
    d: number,
    h: number,
    s: Swatch,
    x = 0,
    y = 0,
    z = 0,
    ry = 0,
    top = 0,
  ): THREE.Mesh {
    const g = new THREE.CylinderGeometry(Math.SQRT1_2 * top, Math.SQRT1_2, 1, 4, 1)
      .rotateY(Math.PI / 4)
      .translate(0, 0.5, 0)
      .scale(w, h, d)
    return this.add(g, s, x, y, z, 0, ry)
  }

  /** Pitched roof: ridge runs along local x, `len` long, spanning `width` in z. */
  gable(len: number, width: number, h: number, s: Swatch, x = 0, y = 0, z = 0, ry = 0): THREE.Mesh {
    const tri = new THREE.Shape([
      new THREE.Vector2(-width / 2, 0),
      new THREE.Vector2(width / 2, 0),
      new THREE.Vector2(0, h),
    ])
    const g = new THREE.ExtrudeGeometry(tri, { depth: len, bevelEnabled: false })
      .translate(0, 0, -len / 2)
      .rotateY(Math.PI / 2)
    return this.add(g, s, x, y, z, 0, ry)
  }

  /** Hemisphere (optionally squashed/stretched vertically). */
  dome(r: number, s: Swatch, x = 0, y = 0, z = 0, sy = 1, seg = 18): THREE.Mesh {
    const g = new THREE.SphereGeometry(r, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2)
    g.scale(1, sy, 1)
    return this.add(g, s, x, y, z)
  }

  sphere(r: number, s: Swatch, x = 0, y = 0, z = 0, seg = 12): THREE.Mesh {
    return this.add(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.75)), s, x, y, z)
  }

  /** Surface of revolution from a (radius, height) profile, bottom to top. */
  lathe(profile: readonly P2[], seg: number, s: Swatch, x = 0, y = 0, z = 0): THREE.Mesh {
    const pts = profile.map(([r, h]) => new THREE.Vector2(Math.max(r, 0.0001), h))
    return this.add(new THREE.LatheGeometry(pts, seg), s, x, y, z)
  }

  /** Bulbous onion cupola typical of Romanian Orthodox churches. */
  onion(r: number, h: number, s: Swatch, x = 0, y = 0, z = 0, seg = 14): THREE.Mesh {
    return this.lathe(
      [
        [r * 0.85, 0],
        [r * 1.12, h * 0.16],
        [r * 1.2, h * 0.3],
        [r * 1.02, h * 0.46],
        [r * 0.62, h * 0.62],
        [r * 0.28, h * 0.8],
        [r * 0.12, h * 0.92],
        [0, h],
      ],
      seg,
      s,
      x,
      y,
      z,
    )
  }

  /** Plan outline (x, z) — optionally with courtyard holes — extruded upward. */
  slab(
    outer: readonly P2[],
    h: number,
    s: Swatch,
    y = 0,
    holes: readonly (readonly P2[])[] = [],
    bevel = 0,
  ): THREE.Mesh {
    const g = new THREE.ExtrudeGeometry(planShape(outer, holes), {
      depth: h,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 1,
    }).rotateX(-Math.PI / 2)
    return this.add(g, s, 0, y, 0)
  }

  /** A wall with arched openings, `thick` deep, standing on y and facing +z. */
  archedWall(
    width: number,
    height: number,
    thick: number,
    arches: readonly Arch[],
    s: Swatch,
    x = 0,
    y = 0,
    z = 0,
    ry = 0,
  ): THREE.Mesh {
    const g = new THREE.ExtrudeGeometry(archedWallOutline(width, height, arches), {
      depth: thick,
      bevelEnabled: false,
    }).translate(0, 0, -thick / 2)
    return this.add(g, s, x, y, z, 0, ry)
  }

  /** Round tube through a list of points (arches, trusses, rails). */
  tube(points: readonly THREE.Vector3[], r: number, s: Swatch, radial = 6): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3([...points])
    const g = new THREE.TubeGeometry(curve, Math.max(6, points.length * 2), r, radial, false)
    return this.add(g, s)
  }

  /** Straight cylinder between two points. */
  strut(a: THREE.Vector3, b: THREE.Vector3, r: number, s: Swatch, seg = 5): THREE.Mesh {
    const len = a.distanceTo(b)
    const g = new THREE.CylinderGeometry(r, r, len, seg).translate(0, len / 2, 0)
    const mesh = this.add(g, s, a.x, a.y, a.z)
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().subVectors(b, a).normalize(),
    )
    return mesh
  }

  /**
   * A row of `count` window panes on a façade. The row is centred on x, runs
   * along local x over `span`, and sits proud of the wall plane at z.
   */
  windows(
    count: number,
    span: number,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    ry = 0,
    s: Swatch = 'window',
  ): void {
    this.at(x, y, z, ry, () => {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1)
        this.box(w, h, 0.02, s, -span / 2 + t * span, 0, 0)
      }
    })
  }

  /** Crenellations (merlons) along a straight wall top from a to b. */
  merlons(a: P2, b: P2, y: number, size: number, s: Swatch, gap = 1.6): void {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = Math.hypot(dx, dz)
    const n = Math.max(1, Math.floor(len / (size * gap)))
    const ry = -Math.atan2(dz, dx)
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      this.box(size, size * 0.9, size * 0.9, s, a[0] + dx * t, y, a[1] + dz * t, ry)
    }
  }

  /** Straight wall segment from a to b in the plan. */
  wall(a: P2, b: P2, h: number, thick: number, s: Swatch, y = 0): THREE.Mesh {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = Math.hypot(dx, dz)
    return this.box(len, h, thick, s, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, -Math.atan2(dz, dx))
  }

  /** Orthodox / Catholic cross on top of a spire. */
  cross(x: number, y: number, z: number, size = 0.12, s: Swatch = 'gold'): void {
    this.box(size * 0.16, size, size * 0.16, s, x, y, z)
    this.box(size * 0.6, size * 0.14, size * 0.14, s, x, y + size * 0.62, z)
  }
}
