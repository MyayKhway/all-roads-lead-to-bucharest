/**
 * landmarks — realistic-inspired low-poly models of each city's landmark.
 *
 * Each builder keeps the features that make the real building recognisable
 * from a distance (silhouette, roof shape, towers, domes, arches, bastions)
 * and drops detail the map camera would never resolve. Façades face +z.
 */

import * as THREE from 'three'
import { type Arch, type Model, type P2, polygon, rect } from './kit'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Points along a circular arc in the x/y plane (for bridges and trusses). */
function arcPoints(x0: number, x1: number, yBase: number, rise: number, z: number, n = 12) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push(V(x0 + (x1 - x0) * t, yBase + Math.sin(t * Math.PI) * rise, z))
  }
  return pts
}

/** Star-shaped bastion fort outline — `points` bastions around a polygon. */
function bastionStar(points: number, rTip: number, rCurtain: number, startDeg: number): P2[] {
  const out: P2[] = []
  const step = (Math.PI * 2) / points
  const start = (startDeg * Math.PI) / 180
  for (let i = 0; i < points; i++) {
    const a = start + i * step
    const flank = step * 0.2
    const shoulder = step * 0.13
    const pt = (r: number, ang: number): P2 => [Math.cos(ang) * r, Math.sin(ang) * r]
    out.push(pt(rCurtain, a - flank))
    out.push(pt(rCurtain * 1.07, a - shoulder))
    out.push(pt(rTip, a))
    out.push(pt(rCurtain * 1.07, a + shoulder))
    out.push(pt(rCurtain, a + flank))
  }
  return out
}

/** Simple pitched-roof house used to populate towns around a landmark. */
function house(
  m: Model,
  x: number,
  z: number,
  ry: number,
  wall: 'plaster' | 'ochre' | 'pink' | 'cream',
  w = 0.3,
  d = 0.26,
  h = 0.22,
) {
  m.at(x, 0, z, ry, () => {
    m.box(w, h, d, wall)
    m.gable(w + 0.04, d + 0.06, h * 0.75, 'roofRed', 0, h, 0)
    m.windows(2, w * 0.5, 0.05, 0.07, 0, h * 0.4, d / 2 + 0.005)
  })
}

// ─── Oradea — pentagonal fortress with the Princely Palace inside ─────────────

function oradea(m: Model) {
  m.cyl(1.0, 1.0, 0.03, 40, 'water')
  // Pentagonal bastioned ramparts, stone faced, grass on top
  const star = bastionStar(5, 0.95, 0.66, 90 + 36)
  const court = polygon(5, 0.5, (90 + 36) * (Math.PI / 180))
  m.slab(star, 0.2, 'stone', 0.03, [court])
  m.slab(star, 0.025, 'grass', 0.23, [court])
  m.slab(court, 0.02, 'sand', 0.03)
  // Pentagonal palace ring (baroque, 1700s)
  const outer = polygon(5, 0.42, Math.PI / 2 + Math.PI / 5)
  const inner = polygon(5, 0.25, Math.PI / 2 + Math.PI / 5)
  m.slab(outer, 0.3, 'cream', 0.05, [inner])
  m.slab(
    polygon(5, 0.44, Math.PI / 2 + Math.PI / 5),
    0.07,
    'roofRed',
    0.35,
    [polygon(5, 0.24, Math.PI / 2 + Math.PI / 5)],
    0.02,
  )
  // Windows around each façade
  for (let i = 0; i < 5; i++) {
    const a0 = Math.PI / 2 + Math.PI / 5 + (i * Math.PI * 2) / 5
    const a1 = a0 + (Math.PI * 2) / 5
    const mid: P2 = [
      ((Math.cos(a0) + Math.cos(a1)) / 2) * 0.42,
      ((Math.sin(a0) + Math.sin(a1)) / 2) * 0.42,
    ]
    const faceAngle = Math.atan2(mid[1], mid[0])
    m.at(mid[0], 0, mid[1], Math.PI / 2 - faceAngle, () => {
      m.windows(4, 0.3, 0.035, 0.06, 0, 0.12, 0.005)
      m.windows(4, 0.3, 0.035, 0.06, 0, 0.24, 0.005)
    })
  }
  // Gate house on the front curtain, with a pitched roof and bridge
  m.at(0, 0, 0.6, 0, () => {
    m.archedWall(0.26, 0.3, 0.12, [{ cx: 0, w: 0.09, spring: 0.12 }], 'stoneLight', 0, 0.03, 0)
    m.gable(0.3, 0.16, 0.12, 'roofRed', 0, 0.33, 0)
    m.box(0.1, 0.03, 0.3, 'wood', 0, 0.03, 0.2)
  })
  // Chapel tower rising from the palace courtyard
  m.box(0.1, 0.5, 0.1, 'plaster', 0, 0.05, 0)
  m.onion(0.07, 0.2, 'domeGreen', 0, 0.55, 0)
  m.cross(0, 0.74, 0, 0.08)
}

// ─── Zerind — rural church with a tall spire ─────────────────────────────────

function zerind(m: Model) {
  m.cyl(0.95, 0.95, 0.03, 36, 'grass')
  m.at(0, 0.03, -0.05, 0, () => {
    // Nave with pitched roof
    m.box(0.46, 0.42, 0.85, 'plaster', 0, 0, -0.05)
    m.gable(0.92, 0.56, 0.3, 'roofRed', 0, 0.42, -0.05, Math.PI / 2)
    // Semi-circular apse
    m.cyl(0.22, 0.22, 0.38, 14, 'plaster', 0, 0, -0.5)
    m.cone(0.25, 0.2, 14, 'roofRed', 0, 0.38, -0.5)
    // Tall arched windows on both sides
    for (const side of [-1, 1]) {
      m.windows(3, 0.5, 0.06, 0.16, side * 0.232, 0.14, -0.05, Math.PI / 2)
    }
    // Entrance tower
    m.box(0.28, 0.82, 0.28, 'plaster', 0, 0, 0.42)
    m.box(0.32, 0.04, 0.32, 'stoneGray', 0, 0.8, 0.42)
    for (const [dx, dz, r] of [
      [0, 0.141, 0],
      [0, -0.141, Math.PI],
      [0.141, 0, Math.PI / 2],
      [-0.141, 0, -Math.PI / 2],
    ] as const) {
      m.archedWall(
        0.09,
        0.14,
        0.01,
        [{ cx: 0, w: 0.06, spring: 0.08 }],
        'window',
        dx,
        0.6,
        0.42 + dz,
        r,
      )
    }
    m.cone(0.2, 0.6, 8, 'roofSlate', 0, 0.84, 0.42)
    m.sphere(0.03, 'gold', 0, 1.45, 0.42)
    m.cross(0, 1.47, 0.42, 0.12)
    m.box(0.1, 0.18, 0.02, 'woodDark', 0, 0, 0.565)
  })
  // Village houses
  house(m, 0.62, 0.45, -0.3, 'ochre')
  house(m, -0.65, 0.35, 0.25, 'pink')
  house(m, 0.6, -0.45, 0.1, 'cream', 0.26, 0.24)
}

// ─── Arad — six-pointed Vauban star fortress ─────────────────────────────────

function arad(m: Model) {
  m.cyl(1.0, 1.0, 0.03, 40, 'water')
  const star = bastionStar(6, 0.97, 0.66, 60)
  const court = polygon(6, 0.5, 0)
  m.slab(star, 0.15, 'brick', 0.03, [court])
  m.slab(star, 0.04, 'grass', 0.18, [court], 0.01)
  m.slab(court, 0.02, 'sand', 0.03)
  // Barracks ring — long buildings with tiled roofs
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3
    if (Math.abs(a - Math.PI / 2) < 0.01) continue // keep the gate axis open
    const r = 0.36
    m.at(Math.cos(a) * r, 0.05, Math.sin(a) * r, Math.PI / 2 - a, () => {
      m.box(0.34, 0.14, 0.1, 'cream')
      m.gable(0.36, 0.13, 0.08, 'roofRed', 0, 0.14, 0)
      m.windows(5, 0.26, 0.025, 0.045, 0, 0.05, 0.052)
    })
  }
  // Central garrison church
  m.box(0.14, 0.18, 0.22, 'plaster', 0, 0.05, 0.02)
  m.gable(0.24, 0.16, 0.1, 'roofRed', 0, 0.23, 0.02, Math.PI / 2)
  m.box(0.08, 0.34, 0.08, 'plaster', 0, 0.05, 0.14)
  m.cone(0.065, 0.16, 8, 'roofSlate', 0, 0.39, 0.14)
  // Main gate on the front
  m.at(0, 0.03, 0.62, 0, () => {
    m.archedWall(0.24, 0.22, 0.12, [{ cx: 0, w: 0.09, spring: 0.09 }], 'stoneLight')
    m.box(0.26, 0.03, 0.14, 'stoneGray', 0, 0.22, 0)
    m.box(0.1, 0.02, 0.32, 'wood', 0, 0, 0.2)
  })
}

// ─── Timișoara — Metropolitan Cathedral, green domes & coloured tiles ─────────

function timisoara(m: Model) {
  m.box(1.5, 0.05, 1.9, 'stoneGray')
  m.at(0, 0.05, 0, 0, () => {
    // Cross plan
    m.box(0.56, 0.55, 1.35, 'pink', 0, 0, -0.05)
    m.box(1.2, 0.55, 0.46, 'pink', 0, 0, -0.1)
    // Patterned tiles: green nave, yellow transept, red bands
    m.gable(1.4, 0.64, 0.32, 'tileGreen', 0, 0.55, -0.05, Math.PI / 2)
    m.gable(1.26, 0.54, 0.3, 'tileYellow', 0, 0.55, -0.1)
    m.box(0.6, 0.03, 1.38, 'brick', 0, 0.3, -0.05)
    m.box(1.24, 0.03, 0.5, 'brick', 0, 0.3, -0.1)
    // Apse
    m.cyl(0.27, 0.27, 0.5, 16, 'pink', 0, 0, -0.72)
    m.cone(0.3, 0.26, 16, 'roofRed', 0, 0.5, -0.72)
    // Central tower over the crossing
    m.cyl(0.22, 0.24, 0.42, 12, 'pink', 0, 0.62, -0.1)
    m.windows(1, 0, 0.05, 0.14, 0, 0.75, 0.13)
    m.onion(0.24, 0.5, 'domeGreen', 0, 1.04, -0.1)
    m.cross(0, 1.54, -0.1, 0.12)
    // Four small corner towers
    for (const [dx, dz] of [
      [-0.36, -0.36],
      [0.36, -0.36],
      [-0.36, 0.16],
      [0.36, 0.16],
    ] as const) {
      m.cyl(0.07, 0.07, 0.35, 8, 'pink', dx, 0.55, dz)
      m.onion(0.07, 0.2, 'domeGreen', dx, 0.9, dz)
    }
    // Tall front bell tower — the tallest point of the cathedral
    m.box(0.4, 1.05, 0.34, 'pink', 0, 0, 0.72)
    m.box(0.44, 0.04, 0.38, 'brick', 0, 0.55, 0.72)
    m.cyl(0.18, 0.2, 0.38, 8, 'pink', 0, 1.05, 0.72)
    m.windows(1, 0, 0.06, 0.16, 0, 1.13, 0.905)
    m.onion(0.2, 0.62, 'domeGreen', 0, 1.43, 0.72)
    m.cross(0, 2.05, 0.72, 0.14)
    // Entrance portal and tall windows
    m.archedWall(0.2, 0.34, 0.02, [{ cx: 0, w: 0.14, spring: 0.18 }], 'stoneLight', 0, 0, 0.9)
    m.box(0.12, 0.2, 0.01, 'woodDark', 0, 0, 0.895)
    for (const x of [-0.45, 0.45]) m.windows(2, 0.16, 0.06, 0.2, x, 0.18, 0.135)
    for (const side of [-1, 1]) {
      m.windows(3, 0.7, 0.06, 0.2, side * 0.282, 0.18, -0.05, Math.PI / 2)
    }
  })
}

// ─── Lugoj — the Iron Bridge over the Timiș, twin-towered cathedral behind ────

function lugoj(m: Model) {
  // River along z, embankments on either side
  m.box(0.8, 0.02, 2.0, 'water')
  for (const side of [-1, 1]) {
    m.box(0.6, 0.14, 2.0, 'stoneGray', side * 0.7, 0, 0)
    m.box(0.6, 0.02, 2.0, 'grass', side * 0.7, 0.14, 0)
  }
  // Deck
  m.box(1.5, 0.035, 0.34, 'wood', 0, 0.2, 0.1)
  // Bowstring arch truss on both sides
  for (const z of [-0.07, 0.27]) {
    const top = arcPoints(-0.5, 0.5, 0.235, 0.34, z, 16)
    m.tube(top, 0.018, 'iron')
    m.strut(V(-0.55, 0.235, z), V(0.55, 0.235, z), 0.016, 'iron')
    for (let i = 1; i < 16; i++) {
      const p = top[i]
      if (!p) continue
      m.strut(V(p.x, 0.235, z), p, 0.008, 'iron')
      const next = top[i + 1]
      if (i % 2 === 1 && next) m.strut(V(p.x, 0.235, z), next, 0.006, 'iron')
    }
  }
  for (const x of [-0.25, 0, 0.25]) {
    const y = 0.235 + Math.sin(((x + 0.5) / 1) * Math.PI) * 0.34
    m.strut(V(x, y, -0.07), V(x, y, 0.27), 0.008, 'iron')
  }
  // Masonry abutments and lamp posts
  for (const side of [-1, 1]) {
    m.box(0.12, 0.24, 0.42, 'stone', side * 0.44, 0, 0.1)
    for (const z of [-0.08, 0.28]) {
      m.cyl(0.008, 0.012, 0.22, 6, 'iron', side * 0.62, 0.16, z)
      m.sphere(0.022, 'cream', side * 0.62, 0.39, z, 8)
    }
  }
  // Twin-towered Orthodox Cathedral of the Dormition on the far bank
  m.at(0.66, 0.16, -0.62, 0, () => {
    m.box(0.3, 0.26, 0.42, 'ochre', 0, 0, -0.05)
    m.gable(0.44, 0.34, 0.14, 'roofRed', 0, 0.26, -0.05, Math.PI / 2)
    for (const dx of [-0.1, 0.1]) {
      m.box(0.1, 0.5, 0.1, 'ochre', dx, 0, 0.14)
      m.onion(0.06, 0.2, 'domeGreen', dx, 0.5, 0.14)
      m.cross(dx, 0.7, 0.14, 0.06)
    }
  })
}

// ─── Mehadia — Roman baths of Herculane, ruins and Hercules statue ───────────

function mehadia(m: Model) {
  m.box(1.7, 0.06, 1.4, 'stoneGray')
  m.box(1.5, 0.05, 1.2, 'stoneLight', 0, 0.06, 0)
  const top = 0.11
  // Thermal pool
  m.box(0.74, 0.03, 0.44, 'stoneDark', -0.05, top, 0.25)
  m.box(0.66, 0.02, 0.36, 'water', -0.05, top + 0.02, 0.25)
  // Colonnade — some columns standing, some broken
  const heights = [0.7, 0.52, 0.7, 0.28, 0.7, 0.4]
  heights.forEach((h, i) => {
    const x = -0.6 + i * 0.24
    m.box(0.1, 0.04, 0.1, 'stone', x, top, -0.35)
    m.cyl(0.04, 0.045, h, 10, 'stoneLight', x, top + 0.04, -0.35)
    if (h > 0.6) m.box(0.11, 0.04, 0.11, 'stone', x, top + 0.04 + h, -0.35)
  })
  // Architrave still spanning the first three columns
  m.box(0.6, 0.06, 0.1, 'stone', -0.36, top + 0.78, -0.35)
  // Ruined arched walls of the bath hall
  m.archedWall(
    0.9,
    0.46,
    0.07,
    [
      { cx: -0.2, w: 0.2, spring: 0.2 },
      { cx: 0.2, w: 0.2, spring: 0.2 },
    ],
    'stone',
    -0.62,
    top,
    0.05,
    Math.PI / 2,
  )
  m.box(0.08, 0.1, 0.25, 'stone', -0.62, top + 0.46, 0.2)
  m.archedWall(
    0.6,
    0.34,
    0.07,
    [{ cx: 0, w: 0.22, spring: 0.14 }],
    'stone',
    0.55,
    top,
    0.12,
    Math.PI / 2,
  )
  // Fallen column drums
  m.add(
    new THREE.CylinderGeometry(0.04, 0.04, 0.26, 10),
    'stoneLight',
    0.35,
    top + 0.04,
    0.42,
    0,
    0.4,
    Math.PI / 2,
  )
  m.add(
    new THREE.CylinderGeometry(0.04, 0.04, 0.14, 10),
    'stoneLight',
    0.52,
    top + 0.04,
    0.5,
    0,
    -0.3,
    Math.PI / 2,
  )
  // Hercules on his plinth — the emblem of the spa
  m.at(0.5, top, -0.1, -0.4, () => {
    m.box(0.16, 0.16, 0.16, 'stoneGray')
    m.cyl(0.035, 0.045, 0.16, 8, 'bronze', 0, 0.16, 0)
    m.cyl(0.05, 0.04, 0.12, 8, 'bronze', 0, 0.32, 0)
    m.sphere(0.035, 'bronze', 0, 0.48, 0, 10)
    m.strut(V(0.04, 0.42, 0), V(0.1, 0.3, 0.02), 0.014, 'bronze')
    m.strut(V(-0.04, 0.42, 0), V(-0.09, 0.5, 0.02), 0.014, 'bronze')
  })
}

// ─── Drobeta — Trajan's Bridge over the Danube ───────────────────────────────

function drobeta(m: Model) {
  m.box(1.1, 0.02, 2.0, 'water')
  for (const side of [-1, 1]) m.box(0.45, 0.1, 2.0, 'grass', side * 0.78, 0, 0)
  // Stone piers
  const piers = [-0.54, -0.18, 0.18, 0.54]
  for (const x of piers) {
    m.box(0.11, 0.36, 0.3, 'stoneGray', x, 0, 0)
    m.box(0.13, 0.03, 0.32, 'stoneDark', x, 0.36, 0)
  }
  // Apollodorus' timber arches: three concentric ribs per span, two planes
  const spans: [number, number][] = [
    [-0.9, -0.54],
    [-0.54, -0.18],
    [-0.18, 0.18],
    [0.18, 0.54],
    [0.54, 0.9],
  ]
  for (const [a, b] of spans) {
    for (const z of [-0.1, 0.1]) {
      for (const [inset, rise] of [
        [0.0, 0.14],
        [0.012, 0.11],
        [0.024, 0.08],
      ] as const) {
        m.tube(arcPoints(a + 0.055, b - 0.055, 0.36 - inset * 3, rise, z, 8), 0.012, 'wood', 4)
      }
      for (let i = 1; i < 6; i++) {
        const x = a + ((b - a) * i) / 6
        const y = 0.36 + Math.sin((i / 6) * Math.PI) * 0.12
        m.strut(V(x, y, z), V(x, 0.52, z), 0.007, 'woodDark')
      }
    }
  }
  // Deck and railing
  m.box(1.9, 0.04, 0.28, 'wood', 0, 0.52, 0)
  for (const z of [-0.13, 0.13]) {
    m.box(1.9, 0.015, 0.015, 'woodDark', 0, 0.62, z)
    for (let i = 0; i <= 18; i++) m.box(0.012, 0.08, 0.012, 'woodDark', -0.9 + i * 0.1, 0.56, z)
  }
  // Monumental stone portals at both ends
  for (const side of [-1, 1]) {
    m.archedWall(
      0.36,
      0.5,
      0.14,
      [{ cx: 0, w: 0.2, spring: 0.12 }],
      'stone',
      side * 0.93,
      0.1,
      0,
      Math.PI / 2,
    )
    m.box(0.16, 0.05, 0.4, 'stoneGray', side * 0.93, 0.6, 0)
  }
}

// ─── Craiova — Jean Mihail Palace (Art Museum), French baroque ───────────────

function craiova(m: Model) {
  m.box(1.8, 0.05, 1.3, 'stoneGray')
  // Garden parterre and fountain in front
  m.box(1.7, 0.02, 0.35, 'grass', 0, 0.05, 0.45)
  m.cyl(0.1, 0.11, 0.05, 16, 'stone', 0, 0.07, 0.45)
  m.cyl(0.085, 0.085, 0.02, 16, 'water', 0, 0.1, 0.45)
  for (const x of [-0.55, 0.55]) m.box(0.4, 0.07, 0.08, 'hedge', x, 0.07, 0.45)
  m.at(0, 0.05, -0.15, 0, () => {
    // Rusticated ground floor, cream upper floors
    m.box(1.5, 0.2, 0.7, 'stoneLight')
    m.box(1.5, 0.34, 0.7, 'cream', 0, 0.2, 0)
    m.box(1.54, 0.03, 0.74, 'stoneLight', 0, 0.54, 0)
    // Mansard roof in blue-grey slate
    m.hip(1.5, 0.7, 0.24, 'roofSlate', 0, 0.57, 0, 0, 0.72)
    // Central avant-corps with a curved mansard dome and lantern
    m.box(0.46, 0.6, 0.12, 'cream', 0, 0, 0.39)
    m.box(0.5, 0.03, 0.16, 'stoneLight', 0, 0.6, 0.39)
    m.lathe(
      [
        [0.26, 0],
        [0.25, 0.1],
        [0.2, 0.2],
        [0.1, 0.28],
        [0.0, 0.3],
      ],
      4,
      'roofSlate',
      0,
      0.62,
      0.28,
    )
    m.cyl(0.035, 0.035, 0.1, 8, 'stoneLight', 0, 0.9, 0.28)
    m.cone(0.045, 0.08, 8, 'roofSlate', 0, 1.0, 0.28)
    // Entrance columns and balcony
    for (const x of [-0.15, -0.05, 0.05, 0.15]) m.cyl(0.018, 0.02, 0.2, 8, 'stoneLight', x, 0, 0.47)
    m.box(0.4, 0.025, 0.1, 'stoneLight', 0, 0.2, 0.47)
    // End pavilions with their own taller roofs
    for (const x of [-0.6, 0.6]) {
      m.box(0.3, 0.56, 0.08, 'cream', x, 0, 0.38)
      m.hip(0.34, 0.8, 0.3, 'roofSlate', x, 0.57, 0.02, 0, 0.35)
    }
    // Window grid and dormers
    for (const y of [0.06, 0.26, 0.4])
      m.windows(12, 1.36, 0.05, y === 0.06 ? 0.1 : 0.11, 0, y, 0.353)
    m.windows(3, 0.24, 0.05, 0.12, 0, 0.26, 0.453)
    m.windows(6, 1.1, 0.05, 0.06, 0, 0.64, 0.28)
    for (const side of [-1, 1]) m.windows(4, 0.5, 0.05, 0.11, side * 0.753, 0.26, 0, Math.PI / 2)
  })
}

// ─── Râmnicu Vâlcea — St. Nicholas / Archbishopric church ────────────────────

function rimnicu(m: Model) {
  m.cyl(0.95, 0.95, 0.03, 36, 'grass')
  m.box(1.1, 0.02, 1.4, 'stoneLight', 0, 0.03, 0)
  m.at(0, 0.05, -0.05, 0, () => {
    // Trefoil plan: nave + two side apses + altar apse
    m.box(0.46, 0.46, 0.78, 'plaster', 0, 0, 0)
    for (const side of [-1, 1]) {
      m.cyl(0.2, 0.2, 0.44, 14, 'plaster', side * 0.23, 0, -0.12)
      m.cone(0.23, 0.16, 14, 'roofDark', side * 0.23, 0.44, -0.12)
    }
    m.cyl(0.21, 0.21, 0.44, 14, 'plaster', 0, 0, -0.42)
    m.cone(0.24, 0.16, 14, 'roofDark', 0, 0.44, -0.42)
    // Brâncovenesc red cable belt around the walls
    m.box(0.48, 0.03, 0.8, 'brick', 0, 0.24, 0)
    m.gable(0.84, 0.56, 0.24, 'roofDark', 0, 0.46, 0, Math.PI / 2)
    // Tower over the naos and smaller one over the pronaos
    m.cyl(0.14, 0.15, 0.3, 8, 'plaster', 0, 0.6, -0.12)
    m.box(0.3, 0.02, 0.3, 'brick', 0, 0.74, -0.12, Math.PI / 8)
    m.windows(1, 0, 0.04, 0.1, 0, 0.66, 0.02)
    m.cone(0.18, 0.4, 8, 'roofDark', 0, 0.9, -0.12)
    m.cross(0, 1.3, -0.12, 0.1)
    m.cyl(0.1, 0.11, 0.2, 8, 'plaster', 0, 0.62, 0.2)
    m.cone(0.13, 0.26, 8, 'roofDark', 0, 0.82, 0.2)
    m.cross(0, 1.08, 0.2, 0.08)
    // Open porch (pridvor) with stone columns and arches
    m.box(0.5, 0.02, 0.2, 'stoneLight', 0, 0, 0.49)
    m.archedWall(
      0.5,
      0.34,
      0.03,
      [
        { cx: -0.15, w: 0.1, spring: 0.18 },
        { cx: 0, w: 0.1, spring: 0.18 },
        { cx: 0.15, w: 0.1, spring: 0.18 },
      ],
      'plaster',
      0,
      0,
      0.58,
    )
    m.gable(0.54, 0.24, 0.12, 'roofDark', 0, 0.34, 0.49)
    for (const side of [-1, 1]) m.windows(3, 0.4, 0.05, 0.12, side * 0.232, 0.08, 0.02, Math.PI / 2)
  })
  // Bell tower of the Archbishopric compound
  m.box(0.22, 0.72, 0.22, 'plaster', 0.62, 0.03, -0.45)
  m.windows(1, 0, 0.07, 0.12, 0.62, 0.55, -0.335)
  m.hip(0.28, 0.28, 0.26, 'roofDark', 0.62, 0.75, -0.45)
  m.cross(0.62, 1.0, -0.45, 0.08)
}

// ─── Sibiu — the Bridge of Lies, Council Tower, roofs with "eyes" ────────────

function sibiu(m: Model) {
  // Lower street (Ocnei) running along z between the two upper squares
  m.box(0.64, 0.02, 2.0, 'stoneGray')
  for (const side of [-1, 1]) {
    m.box(0.68, 0.3, 2.0, 'stone', side * 0.66, 0, 0)
    m.box(0.68, 0.02, 2.0, 'stoneLight', side * 0.66, 0.3, 0)
  }
  // Cast-iron bridge (1859): shallow arch girders, deck, ornate railing
  for (const z of [-0.15, 0.15]) {
    m.tube(arcPoints(-0.33, 0.33, 0.2, 0.09, z, 10), 0.02, 'iron')
    m.box(0.7, 0.022, 0.022, 'iron', 0, 0.47, z)
    for (let i = 0; i <= 14; i++)
      m.box(0.012, 0.15, 0.012, 'iron', -0.33 + i * (0.66 / 14), 0.32, z)
    for (let i = 0; i < 5; i++) {
      const torus = new THREE.TorusGeometry(0.04, 0.008, 5, 16)
      m.add(torus, 'iron', -0.24 + i * 0.12, 0.39, z)
    }
  }
  m.box(0.7, 0.03, 0.32, 'iron', 0, 0.29, 0)
  for (const x of [-0.36, 0.36]) {
    for (const z of [-0.15, 0.15]) {
      m.cyl(0.008, 0.012, 0.28, 6, 'iron', x, 0.32, z)
      m.sphere(0.025, 'cream', x, 0.62, z, 8)
    }
  }
  // Houses with the famous "eyes" — eyelid dormers on steep red roofs.
  // They stand on the north side only, so the bridge stays in view.
  const houses: [number, number, 'ochre' | 'pink' | 'cream' | 'plaster'][] = [
    [-0.68, -0.5, 'ochre'],
    [0.68, -0.5, 'cream'],
    [0.72, 0.62, 'pink'],
  ]
  for (const [x, z, wall] of houses) {
    m.at(x, 0.3, z, 0, () => {
      m.box(0.56, 0.26, 0.42, wall)
      m.windows(4, 0.4, 0.05, 0.07, 0, 0.1, 0.215)
      m.gable(0.6, 0.48, 0.34, 'roofRed', 0, 0.26, 0)
      for (const ex of [-0.14, 0.14]) {
        // Eyelid dormer: a squashed half-cylinder with a dark slit window
        const lid = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10, 1, false, 0, Math.PI).rotateZ(
          Math.PI / 2,
        )
        lid.scale(1, 0.55, 1)
        m.add(lid, 'roofRed', ex, 0.43, 0.12, 0.94, 0, 0)
        m.add(new THREE.BoxGeometry(0.07, 0.014, 0.012), 'window', ex, 0.42, 0.146, 0.94, 0, 0)
      }
    })
  }
  // Council Tower with its pyramid roof and four corner turrets
  m.at(-0.66, 0.3, 0.45, 0, () => {
    m.box(0.26, 0.9, 0.24, 'cream')
    m.windows(1, 0, 0.07, 0.1, 0, 0.72, 0.125)
    m.archedWall(0.14, 0.2, 0.01, [{ cx: 0, w: 0.08, spring: 0.1 }], 'window', 0, 0, 0.125)
    m.hip(0.3, 0.28, 0.36, 'roofRed', 0, 0.9, 0)
    for (const [dx, dz] of [
      [-0.13, -0.12],
      [0.13, -0.12],
      [-0.13, 0.12],
      [0.13, 0.12],
    ] as const) {
      m.cone(0.03, 0.14, 6, 'roofRed', dx, 0.9, dz)
    }
  })
}

// ─── Făgăraș — moated castle with corner towers ──────────────────────────────

function fagaras(m: Model) {
  m.box(1.95, 0.025, 1.8, 'water')
  m.box(1.5, 0.08, 1.35, 'stoneDark', 0, 0, 0)
  // Outer bastioned wall
  m.slab(rect(1.42, 1.26), 0.14, 'stoneGray', 0.08, [rect(1.26, 1.1)])
  for (const [x, z] of [
    [-0.71, -0.63],
    [0.71, -0.63],
    [-0.71, 0.63],
    [0.71, 0.63],
  ] as const) {
    m.box(0.18, 0.16, 0.18, 'stoneGray', x, 0.08, z, Math.PI / 4)
  }
  m.box(1.2, 0.02, 1.06, 'grass', 0, 0.08, 0)
  // Castle around an inner courtyard
  const top = 0.1
  m.slab(rect(0.94, 0.78), 0.44, 'plaster', top, [rect(0.54, 0.4)])
  m.slab(rect(0.98, 0.82), 0.1, 'roofRed', top + 0.44, [rect(0.5, 0.36)], 0.025)
  for (const [dx, dz, ry, count, span] of [
    [0, 0.395, 0, 6, 0.7],
    [0, -0.395, Math.PI, 6, 0.7],
    [0.475, 0, Math.PI / 2, 4, 0.5],
    [-0.475, 0, -Math.PI / 2, 4, 0.5],
  ] as const) {
    m.windows(count, span, 0.04, 0.07, dx, top + 0.12, dz, ry)
    m.windows(count, span, 0.04, 0.07, dx, top + 0.28, dz, ry)
  }
  // Four square corner towers with steep roofs
  for (const [x, z] of [
    [-0.47, -0.39],
    [0.47, -0.39],
    [-0.47, 0.39],
    [0.47, 0.39],
  ] as const) {
    m.box(0.22, 0.66, 0.22, 'plaster', x, top, z)
    m.hip(0.26, 0.26, 0.32, 'roofRed', x, top + 0.66, z)
  }
  // Gate tower and the timber bridge across the moat
  m.box(0.2, 0.78, 0.18, 'plaster', 0, top, 0.42)
  m.archedWall(0.12, 0.16, 0.01, [{ cx: 0, w: 0.08, spring: 0.08 }], 'woodDark', 0, top, 0.515)
  m.hip(0.24, 0.22, 0.3, 'roofRed', 0, top + 0.78, 0.42)
  m.box(0.14, 0.03, 0.44, 'wood', 0, 0.06, 0.78)
}

// ─── Pitești — Princely Church, striped brick & plaster walls ────────────────

function pitesti(m: Model) {
  m.cyl(0.95, 0.95, 0.03, 36, 'grass')
  m.box(1.1, 0.02, 1.5, 'stoneLight', 0, 0.03, 0)
  const base = 0.05
  const band = 0.075
  const layers = 6
  m.at(0, base, 0, 0, () => {
    // Alternating brick / plaster courses — the church's trademark
    for (let i = 0; i < layers; i++) {
      const s = i % 2 === 0 ? 'brick' : 'plaster'
      m.box(0.44, band, 0.9, s, 0, i * band, 0)
      m.cyl(0.21, 0.21, band, 14, s, 0, i * band, -0.45)
      for (const side of [-1, 1]) m.cyl(0.18, 0.18, band, 14, s, side * 0.22, i * band, -0.18)
    }
    const h = layers * band
    m.gable(0.96, 0.54, 0.24, 'roofDark', 0, h, 0, Math.PI / 2)
    m.cone(0.24, 0.14, 14, 'roofDark', 0, h, -0.45)
    for (const side of [-1, 1]) m.cone(0.21, 0.14, 14, 'roofDark', side * 0.22, h, -0.18)
    // Blind arcade on the façade
    for (const side of [-1, 1]) m.windows(4, 0.6, 0.06, 0.12, side * 0.222, 0.2, 0.05, Math.PI / 2)
    m.archedWall(0.4, 0.32, 0.02, [{ cx: 0, w: 0.14, spring: 0.16 }], 'plaster', 0, 0, 0.455)
    m.box(0.12, 0.2, 0.01, 'woodDark', 0, 0, 0.452)
    // Tall slender tower over the pronaos, striped as well
    for (let i = 0; i < 4; i++) {
      m.cyl(0.13, 0.13, band, 8, i % 2 === 0 ? 'plaster' : 'brick', 0, h + 0.12 + i * band, 0.2)
    }
    m.windows(1, 0, 0.04, 0.12, 0, h + 0.2, 0.33)
    m.cone(0.16, 0.55, 8, 'roofDark', 0, h + 0.12 + 4 * band, 0.2)
    m.cross(0, h + 0.97, 0.2, 0.1)
  })
  // Gate bell tower in the churchyard wall
  m.box(1.1, 0.12, 0.05, 'plaster', 0, 0.03, 0.72)
  m.archedWall(0.24, 0.4, 0.14, [{ cx: 0, w: 0.12, spring: 0.18 }], 'plaster', 0, 0.03, 0.72)
  m.hip(0.28, 0.18, 0.18, 'roofDark', 0, 0.43, 0.72)
}

// ─── Bucharest — Palace of the Parliament ────────────────────────────────────

function bucharest(m: Model) {
  m.box(2.2, 0.03, 1.9, 'stoneLight')
  for (const x of [-0.42, 0.42]) m.box(0.26, 0.02, 0.26, 'grass', x, 0.03, 0.82)

  const tier = (w: number, h: number, d: number, y: number, colSpacing: number) => {
    m.box(w, h, d, 'stoneLight', 0, y, 0)
    m.box(w + 0.03, 0.025, d + 0.03, 'stoneGray', 0, y + h, 0)
    // Colonnade across the front
    const n = Math.floor(w / colSpacing)
    for (let i = 0; i <= n; i++) {
      m.cyl(0.013, 0.015, h * 0.82, 6, 'plaster', -w / 2 + (i * w) / n, y + h * 0.06, d / 2 + 0.02)
    }
    m.windows(Math.max(3, n - 1), w * 0.9, 0.028, h * 0.4, 0, y + h * 0.3, d / 2 + 0.005)
    for (const side of [-1, 1]) {
      m.windows(
        Math.max(3, Math.floor(d / 0.08)),
        d * 0.85,
        0.028,
        h * 0.4,
        side * (w / 2 + 0.005),
        y + h * 0.3,
        0,
        Math.PI / 2,
      )
    }
  }
  m.at(0, 0.03, -0.1, 0, () => {
    // Stepped mass — the silhouette that makes the palace recognisable
    tier(2.0, 0.26, 1.3, 0, 0.08)
    tier(1.6, 0.22, 1.0, 0.285, 0.08)
    tier(1.12, 0.2, 0.72, 0.53, 0.07)
    tier(0.62, 0.2, 0.46, 0.755, 0.07)
    m.box(0.34, 0.14, 0.28, 'stoneLight', 0, 0.98, 0)
    m.box(0.37, 0.02, 0.31, 'stoneGray', 0, 1.12, 0)
    // Projecting front wings
    for (const x of [-0.78, 0.78]) {
      m.box(0.42, 0.26, 0.3, 'stoneLight', x, 0, 0.78)
      m.box(0.45, 0.025, 0.33, 'stoneGray', x, 0.26, 0.78)
      m.windows(4, 0.32, 0.028, 0.1, x, 0.08, 0.935)
    }
    // Grand central portico
    m.box(0.52, 0.46, 0.14, 'stoneLight', 0, 0, 0.72)
    m.box(0.56, 0.03, 0.18, 'stoneGray', 0, 0.46, 0.72)
    for (let i = 0; i < 6; i++)
      m.cyl(0.018, 0.02, 0.44, 8, 'plaster', -0.22 + i * 0.088, 0.02, 0.81)
    m.box(0.6, 0.02, 0.2, 'stoneGray', 0, 0, 0.84)
    // Flagpole with the tricolour
    m.cyl(0.006, 0.008, 0.36, 6, 'metal', 0, 1.14, 0)
    m.box(0.05, 0.07, 0.006, 'blue', 0.03, 1.4, 0)
    m.box(0.05, 0.07, 0.006, 'tileYellow', 0.08, 1.4, 0)
    m.box(0.05, 0.07, 0.006, 'red', 0.13, 1.4, 0)
  })
}

// ─── Giurgiu — the Clock Tower ───────────────────────────────────────────────

function giurgiu(m: Model) {
  m.cyl(0.85, 0.85, 0.03, 36, 'stoneLight')
  m.cyl(0.8, 0.8, 0.012, 36, 'stoneGray', 0, 0.03, 0)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4
    m.cyl(0.14, 0.14, 0.05, 12, 'grass', Math.cos(a) * 0.55, 0.03, Math.sin(a) * 0.55)
    m.box(0.16, 0.04, 0.05, 'wood', Math.cos(a) * 0.36, 0.06, Math.sin(a) * 0.36, -a + Math.PI / 2)
  }
  m.at(0, 0.04, 0, 0, () => {
    // Massive stone base with arched doorways
    m.box(0.5, 0.52, 0.5, 'plaster')
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      m.archedWall(
        0.16,
        0.24,
        0.01,
        [{ cx: 0, w: 0.1, spring: 0.14 }],
        'window',
        Math.sin(a) * 0.251,
        0,
        Math.cos(a) * 0.251,
        a,
      )
    }
    m.box(0.54, 0.04, 0.54, 'stoneGray', 0, 0.52, 0)
    // Upper shaft with the four clock faces
    m.box(0.42, 0.5, 0.42, 'plaster', 0, 0.56, 0)
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      m.at(Math.sin(a) * 0.212, 0.84, Math.cos(a) * 0.212, a, () => {
        m.add(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 20).rotateX(Math.PI / 2), 'white')
        m.add(
          new THREE.CylinderGeometry(0.12, 0.12, 0.008, 20).rotateX(Math.PI / 2),
          'iron',
          0,
          0,
          -0.004,
        )
        m.box(0.012, 0.08, 0.01, 'iron', 0, 0, 0.01)
        m.box(0.06, 0.012, 0.01, 'iron', 0.03, 0.0, 0.01)
      })
    }
    m.box(0.46, 0.04, 0.46, 'stoneGray', 0, 1.06, 0)
    // Octagonal watch stage with the lookout gallery
    m.cyl(0.22, 0.24, 0.32, 8, 'plaster', 0, 1.1, 0, Math.PI / 8)
    m.windows(1, 0, 0.06, 0.14, 0, 1.18, 0.225)
    m.cyl(0.32, 0.32, 0.025, 16, 'stoneGray', 0, 1.2, 0)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      m.box(0.012, 0.08, 0.012, 'iron', Math.cos(a) * 0.3, 1.225, Math.sin(a) * 0.3)
    }
    m.add(new THREE.TorusGeometry(0.3, 0.008, 4, 24).rotateX(Math.PI / 2), 'iron', 0, 1.305, 0)
    // Bulbous cupola with lantern and spire
    m.lathe(
      [
        [0.25, 0],
        [0.27, 0.06],
        [0.24, 0.16],
        [0.14, 0.26],
        [0.07, 0.32],
        [0.06, 0.34],
      ],
      16,
      'roofSlate',
      0,
      1.42,
      0,
    )
    m.cyl(0.05, 0.05, 0.08, 8, 'plaster', 0, 1.76, 0)
    m.onion(0.05, 0.14, 'roofSlate', 0, 1.84, 0)
    m.cyl(0.006, 0.006, 0.14, 6, 'gold', 0, 1.97, 0)
    m.sphere(0.02, 'gold', 0, 2.1, 0, 8)
  })
}

// ─── Urziceni — Heroes' monument and town church ─────────────────────────────

function urziceni(m: Model) {
  m.cyl(0.9, 0.9, 0.03, 36, 'grass')
  m.box(1.7, 0.012, 0.18, 'stoneLight', 0, 0.03, 0)
  m.box(0.18, 0.012, 1.7, 'stoneLight', 0, 0.03, 0)
  m.cyl(0.36, 0.36, 0.014, 24, 'stoneLight', 0, 0.03, 0)
  // Stepped plinth and obelisk
  m.box(0.46, 0.06, 0.46, 'stoneGray', 0, 0.04, 0)
  m.box(0.36, 0.06, 0.36, 'stoneGray', 0, 0.1, 0)
  m.box(0.26, 0.24, 0.26, 'stone', 0, 0.16, 0)
  m.box(0.14, 0.1, 0.01, 'bronze', 0, 0.22, 0.131)
  m.hip(0.18, 0.18, 0.95, 'stoneLight', 0, 0.4, 0, 0, 0.45)
  m.hip(0.085, 0.085, 0.09, 'gold', 0, 1.35, 0)
  // Soldier statue in front
  m.at(0, 0.04, 0.3, 0, () => {
    m.box(0.12, 0.12, 0.12, 'stoneGray')
    m.cyl(0.03, 0.04, 0.14, 8, 'bronze', 0, 0.12, 0)
    m.cyl(0.035, 0.03, 0.1, 8, 'bronze', 0, 0.26, 0)
    m.sphere(0.028, 'bronze', 0, 0.39, 0, 8)
    m.strut(V(0.04, 0.34, 0), V(0.07, 0.5, 0), 0.008, 'bronze')
  })
  // Lamp posts and benches
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2
    const x = Math.cos(a) * 0.3
    const z = Math.sin(a) * 0.3
    m.cyl(0.007, 0.01, 0.22, 6, 'iron', x, 0.03, z)
    m.sphere(0.02, 'cream', x, 0.26, z, 8)
    m.box(0.14, 0.03, 0.05, 'wood', Math.cos(a) * 0.46, 0.05, Math.sin(a) * 0.46, -a + Math.PI / 2)
  }
  // Small town church at the back of the square
  m.at(-0.5, 0.03, -0.55, 0.3, () => {
    m.box(0.24, 0.22, 0.4, 'plaster')
    m.gable(0.44, 0.3, 0.14, 'roofRed', 0, 0.22, 0, Math.PI / 2)
    m.box(0.12, 0.42, 0.12, 'plaster', 0, 0, 0.2)
    m.cone(0.1, 0.22, 8, 'roofSlate', 0, 0.42, 0.2)
    m.cross(0, 0.64, 0.2, 0.07)
  })
}

// ─── Hîrșova — ruins of the Carsium fortress on its rocky bluff ──────────────

function hirsova(m: Model) {
  m.box(2.0, 0.02, 0.6, 'water', 0, 0, -0.72)
  // Rocky promontory above the Danube
  const bluff = new THREE.CylinderGeometry(0.7, 0.92, 0.32, 11, 2)
  const pos = bluff.getAttribute('position')
  const r = (i: number) =>
    Math.sin(i * 12.9898) * 43758.5453 - Math.floor(Math.sin(i * 12.9898) * 43758.5453)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    if (y < 0.15) {
      const k = 1 + (r(Math.round(pos.getX(i) * 50) + Math.round(pos.getZ(i) * 70)) - 0.5) * 0.14
      pos.setX(i, pos.getX(i) * k)
      pos.setZ(i, pos.getZ(i) * k)
    }
  }
  bluff.computeVertexNormals()
  bluff.translate(0, 0.16, 0)
  m.add(bluff, 'rock')
  m.cyl(0.66, 0.68, 0.02, 11, 'grass', 0, 0.32, 0)
  const top = 0.34
  // Broken curtain walls — varied heights, with gaps where they collapsed
  const ring = polygon(7, 0.52, 0.2)
  const heights = [0.3, 0.18, 0, 0.26, 0.14, 0.34, 0]
  for (let i = 0; i < ring.length; i++) {
    const h = heights[i] ?? 0
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (!a || !b || h === 0) continue
    m.wall(a, b, h, 0.07, 'stone', top)
    const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    m.wall(a, mid, h * 0.35, 0.07, 'stone', top + h)
  }
  // Ruined round towers at some corners
  for (const [i, h] of [
    [0, 0.44],
    [3, 0.3],
    [5, 0.5],
  ] as const) {
    const p = ring[i]
    if (!p) continue
    m.cyl(0.1, 0.12, h, 10, 'stoneGray', p[0], top, p[1])
    m.cyl(0.1, 0.1, 0.06, 10, 'stoneGray', p[0] + 0.03, top + h, p[1])
  }
  // Remains of the gate with a surviving arch
  m.archedWall(0.3, 0.3, 0.09, [{ cx: 0, w: 0.14, spring: 0.12 }], 'stone', 0.08, top, 0.5)
  // Scattered masonry blocks
  const blocks: [number, number, number][] = [
    [-0.15, 0.1, 0.4],
    [0.2, -0.1, 1.2],
    [0.0, 0.25, 0.8],
    [-0.3, -0.2, 2.1],
  ]
  for (const [x, z, ry] of blocks) m.box(0.08, 0.05, 0.06, 'stoneGray', x, top, z, ry)
}

// ─── Eforie — Art Nouveau seaside casino, beach and parasols ─────────────────

function eforie(m: Model) {
  m.box(2.0, 0.02, 0.65, 'water', 0, 0, -0.68)
  m.box(2.0, 0.03, 0.55, 'sand', 0, 0, -0.1)
  m.box(2.0, 0.04, 0.9, 'stoneLight', 0, 0, 0.55)
  // Parasols and loungers on the beach
  for (let i = 0; i < 6; i++) {
    const x = -0.8 + i * 0.32
    const z = -0.15 + (i % 2) * 0.12
    m.cyl(0.006, 0.006, 0.18, 5, 'wood', x, 0.03, z)
    m.cone(0.09, 0.05, 8, i % 2 ? 'red' : 'canvas', x, 0.2, z)
    m.box(0.05, 0.015, 0.11, 'plaster', x + 0.08, 0.03, z)
  }
  m.at(0, 0.04, 0.45, 0, () => {
    // Central rotunda with copper dome and lantern
    m.cyl(0.3, 0.3, 0.46, 24, 'plaster')
    m.cyl(0.32, 0.32, 0.03, 24, 'stoneGray', 0, 0.46, 0)
    m.dome(0.3, 'copper', 0, 0.49, 0, 0.85, 24)
    m.cyl(0.05, 0.05, 0.08, 10, 'plaster', 0, 0.74, 0)
    m.dome(0.055, 'copper', 0, 0.82, 0, 1.2, 10)
    // Tall arched windows around the rotunda
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + (i - 3) * 0.33
      m.archedWall(
        0.08,
        0.2,
        0.01,
        [],
        'window',
        Math.cos(a) * 0.302,
        0.15,
        Math.sin(a) * 0.302,
        Math.PI / 2 - a,
      )
    }
    // Curved wings sweeping back to the sea
    for (const side of [-1, 1]) {
      m.at(side * 0.5, 0, -0.08, side * -0.3, () => {
        m.box(0.52, 0.32, 0.28, 'plaster')
        m.box(0.54, 0.03, 0.3, 'stoneGray', 0, 0.32, 0)
        m.windows(5, 0.4, 0.05, 0.13, 0, 0.1, 0.143)
        m.cyl(0.14, 0.14, 0.32, 14, 'plaster', side * 0.26, 0, 0)
        m.dome(0.14, 'copper', side * 0.26, 0.32, 0, 0.7, 14)
      })
    }
    // Terrace with balustrade in front
    m.box(0.9, 0.04, 0.2, 'stoneGray', 0, 0, 0.36)
    for (let i = 0; i <= 14; i++)
      m.box(0.012, 0.06, 0.012, 'plaster', -0.44 + i * (0.88 / 14), 0.04, 0.45)
    m.box(0.9, 0.012, 0.02, 'plaster', 0, 0.1, 0.45)
  })
}

// ─── Vaslui — equestrian statue of Stephen the Great ─────────────────────────

function vaslui(m: Model) {
  m.cyl(0.9, 0.9, 0.03, 36, 'stoneLight')
  m.cyl(0.9, 0.9, 0.02, 36, 'grass', 0, 0.03, 0)
  m.cyl(0.62, 0.62, 0.012, 32, 'stoneLight', 0, 0.05, 0)
  // Stepped plinth with bronze relief
  m.box(1.0, 0.08, 0.56, 'stoneGray', 0, 0.06, 0)
  m.box(0.86, 0.46, 0.42, 'stone', 0, 0.14, 0)
  m.box(0.92, 0.04, 0.48, 'stoneGray', 0, 0.6, 0)
  m.box(0.5, 0.16, 0.01, 'bronze', 0, 0.28, 0.212)
  // Horse — in profile toward the camera, stepping forward (+x)
  m.at(0, 0.64, 0, 0, () => {
    const body = new THREE.CapsuleGeometry(0.1, 0.26, 4, 10).rotateZ(Math.PI / 2)
    m.add(body, 'bronze', 0, 0.36, 0)
    for (const [x, z, lift] of [
      [0.14, 0.05, 0.35],
      [0.14, -0.05, 0],
      [-0.14, 0.05, 0],
      [-0.14, -0.05, -0.15],
    ] as const) {
      m.strut(V(x, 0.34, z), V(x + lift * 0.3, lift > 0.2 ? 0.14 : 0, z), 0.022, 'bronze')
    }
    m.strut(V(0.19, 0.4, 0), V(0.26, 0.54, 0), 0.05, 'bronze', 8)
    m.add(new THREE.CapsuleGeometry(0.034, 0.1, 3, 8).rotateZ(-1.15), 'bronze', 0.31, 0.53, 0)
    m.box(0.018, 0.04, 0.018, 'bronze', 0.25, 0.6, 0.02)
    m.strut(V(-0.22, 0.4, 0), V(-0.3, 0.18, 0), 0.02, 'bronze')
    // Rider with crown, cloak and raised cross
    m.cyl(0.05, 0.065, 0.2, 10, 'bronze', 0, 0.46, 0)
    m.sphere(0.042, 'bronze', 0, 0.7, 0, 10)
    m.cyl(0.035, 0.04, 0.035, 8, 'gold', 0, 0.735, 0)
    m.add(
      new THREE.BoxGeometry(0.02, 0.2, 0.14).translate(0, -0.1, 0),
      'bronze',
      -0.06,
      0.66,
      0,
      0,
      0,
      -0.35,
    )
    m.strut(V(0.04, 0.62, 0.04), V(0.1, 0.84, 0.05), 0.012, 'bronze')
    m.cross(0.1, 0.84, 0.05, 0.1, 'bronze')
    for (const z of [-0.08, 0.08]) m.strut(V(0, 0.44, z), V(0.03, 0.3, z), 0.018, 'bronze')
  })
  // Flag masts either side
  for (const x of [-0.7, 0.7]) {
    m.cyl(0.006, 0.008, 0.7, 6, 'metal', x, 0.05, -0.35)
    m.box(0.1, 0.06, 0.004, 'blue', x + 0.05, 0.66, -0.35)
  }
}

// ─── Iași — Palace of Culture, neo-gothic ────────────────────────────────────

function iasi(m: Model) {
  m.box(2.0, 0.03, 1.5, 'stoneLight')
  m.cyl(0.14, 0.15, 0.04, 20, 'stone', 0, 0.03, 0.55)
  m.cyl(0.12, 0.12, 0.02, 20, 'water', 0, 0.06, 0.55)
  for (const x of [-0.6, 0.6]) m.box(0.5, 0.02, 0.3, 'grass', x, 0.03, 0.55)
  m.at(0, 0.03, -0.12, 0, () => {
    // Main block with steep slate roof
    m.box(1.7, 0.5, 0.78, 'stone')
    m.box(1.72, 0.03, 0.8, 'stoneGray', 0, 0.5, 0)
    m.hip(1.7, 0.78, 0.28, 'roofSlate', 0, 0.53, 0, 0, 0.35)
    // Gothic pinnacles along the roof line
    for (let i = 0; i < 9; i++) m.cone(0.018, 0.1, 5, 'stone', -0.8 + i * 0.2, 0.53, 0.38)
    // Corner pavilions with pointed roofs and turrets
    for (const x of [-0.72, 0.72]) {
      m.box(0.34, 0.66, 0.36, 'stone', x, 0, 0.26)
      m.hip(0.36, 0.38, 0.4, 'roofSlate', x, 0.66, 0.26)
      for (const [dx, dz] of [
        [-0.17, 0.18],
        [0.17, 0.18],
      ] as const) {
        m.cyl(0.035, 0.035, 0.76, 8, 'stone', x + dx, 0, 0.26 + dz)
        m.cone(0.045, 0.16, 8, 'roofSlate', x + dx, 0.76, 0.26 + dz)
      }
      m.windows(2, 0.14, 0.05, 0.16, x, 0.12, 0.445)
      m.windows(2, 0.14, 0.05, 0.14, x, 0.38, 0.445)
    }
    // Central clock tower — the palace's signature
    m.box(0.3, 1.1, 0.3, 'stone', 0, 0, 0.45)
    m.box(0.34, 0.03, 0.34, 'stoneGray', 0, 1.1, 0.45)
    m.add(
      new THREE.CylinderGeometry(0.08, 0.08, 0.012, 20).rotateX(Math.PI / 2),
      'white',
      0,
      0.9,
      0.603,
    )
    m.box(0.008, 0.06, 0.008, 'iron', 0, 0.89, 0.61)
    m.hip(0.32, 0.32, 0.55, 'roofSlate', 0, 1.13, 0.45)
    for (const [dx, dz] of [
      [-0.15, 0.3],
      [0.15, 0.3],
      [-0.15, 0.6],
      [0.15, 0.6],
    ] as const) {
      m.cone(0.03, 0.16, 6, 'roofSlate', dx, 1.13, dz)
    }
    m.cyl(0.005, 0.005, 0.16, 5, 'gold', 0, 1.68, 0.45)
    // Pointed gothic entrance and tall windows
    m.archedWall(0.2, 0.36, 0.02, [{ cx: 0, w: 0.12, spring: 0.18 }], 'stoneGray', 0, 0, 0.61)
    m.box(0.1, 0.22, 0.01, 'woodDark', 0, 0, 0.605)
    m.windows(1, 0, 0.08, 0.2, 0, 0.44, 0.603)
    for (const y of [0.1, 0.3]) {
      m.windows(4, 0.6, 0.05, 0.14, -0.38, y, 0.393)
      m.windows(4, 0.6, 0.05, 0.14, 0.38, y, 0.393)
    }
  })
}

// ─── Neamț — hilltop citadel reached by a long arched bridge ─────────────────

function neamt(m: Model) {
  m.cyl(0.95, 0.95, 0.02, 36, 'grass')
  // Hill the citadel stands on
  m.cyl(0.52, 0.8, 0.36, 12, 'leafDeep', -0.3, 0.02, -0.15)
  m.cyl(0.5, 0.52, 0.02, 12, 'rock', -0.3, 0.38, -0.15)
  const top = 0.4
  // Irregular pentagonal curtain wall with battlements
  const ring: P2[] = [
    [-0.64, -0.35],
    [-0.35, -0.58],
    [0.04, -0.4],
    [0.08, 0.05],
    [-0.52, 0.12],
  ]
  const court = ring.map(([x, z]): P2 => [-0.3 + (x + 0.3) * 0.72, -0.15 + (z + 0.15) * 0.72])
  m.slab(ring, 0.42, 'stone', top, [court])
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a && b) m.merlons(a, b, top + 0.42, 0.045, 'stone', 1.8)
  }
  // Square towers at the corners
  for (const p of ring) {
    m.box(0.16, 0.56, 0.16, 'stoneGray', p[0], top, p[1])
    m.hip(0.2, 0.2, 0.14, 'roofBrown', p[0], top + 0.56, p[1])
  }
  // Keep with shingle roof inside the courtyard
  m.box(0.24, 0.5, 0.2, 'stoneLight', -0.32, top, -0.22)
  m.gable(0.28, 0.24, 0.16, 'roofBrown', -0.32, top + 0.5, -0.22)
  m.windows(2, 0.12, 0.03, 0.06, -0.32, top + 0.3, -0.115)
  // Gate
  m.archedWall(
    0.16,
    0.24,
    0.02,
    [{ cx: 0, w: 0.08, spring: 0.1 }],
    'window',
    0.08,
    top,
    -0.02,
    Math.PI / 2,
  )
  // The long arched bridge on stone piers leading to the gate
  const arches: Arch[] = []
  const bridgeLen = 0.86
  const n = 5
  for (let i = 0; i < n; i++) {
    const cx = -bridgeLen / 2 + ((i + 0.5) * bridgeLen) / n
    arches.push({ cx, w: 0.1, spring: 0.12 + i * 0.03 })
  }
  m.archedWall(bridgeLen, top + 0.02, 0.1, arches, 'stone', 0.53, 0.02, -0.02)
  m.box(bridgeLen, 0.05, 0.14, 'stoneLight', 0.53, top + 0.04, -0.02)
  for (const z of [-0.08, 0.04]) m.merlons([0.1, z], [0.96, z], top + 0.09, 0.03, 'stone', 2.2)
  // Entrance tower at the foot of the bridge
  m.box(0.18, 0.62, 0.2, 'stoneGray', 0.98, 0.02, -0.02)
  m.hip(0.22, 0.24, 0.16, 'roofBrown', 0.98, 0.64, -0.02)
  m.archedWall(0.1, 0.18, 0.01, [{ cx: 0, w: 0.07, spring: 0.08 }], 'window', 0.98, 0.02, 0.085)
}

export const LANDMARKS: Record<string, (m: Model) => void> = {
  oradea,
  zerind,
  arad,
  timisoara,
  lugoj,
  mehadia,
  drobeta,
  craiova,
  rimnicu,
  sibiu,
  fagaras,
  pitesti,
  bucharest,
  giurgiu,
  urziceni,
  hirsova,
  eforie,
  vaslui,
  iasi,
  neamt,
}
