/**
 * Terrain — the ground the map stands on: Romania as a raised landmass, the
 * surrounding plain, and the major rivers. Purely decorative; it has no
 * bearing on the graph.
 */

import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { useAppTheme } from '../lib/ThemeContext'
import { sceneColorFor } from '../lib/theme'
import { RIVERS, ROMANIA_OUTLINE, type XZ } from '../scenery/geography'
import { LAND_Y, PLAIN_Y } from '../scenery/placement'

const LAND_DEPTH = 0.3
const LAND_BEVEL = 0.05

function shapeOf(points: readonly XZ[]): THREE.Shape {
  return new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)))
}

/** Flat ribbon following a smoothed river course, just above the land. */
function riverGeometry(points: readonly XZ[], width: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)))
  const samples = Math.max(24, points.length * 12)
  const positions: number[] = []
  const index: number[] = []
  const y = LAND_Y + 0.006
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const nx = -tan.z
    const nz = tan.x
    // Rivers start narrow at their source and widen downstream
    const w = (width / 2) * (0.55 + 0.45 * t)
    positions.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w)
    if (i < samples) {
      const a = i * 2
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

function Terrain() {
  const sceneColor = sceneColorFor(useAppTheme())

  const land = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shapeOf(ROMANIA_OUTLINE), {
      depth: LAND_DEPTH,
      bevelEnabled: true,
      bevelSize: LAND_BEVEL,
      bevelThickness: LAND_BEVEL,
      bevelSegments: 3,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, LAND_Y - LAND_DEPTH - LAND_BEVEL, 0)
    return g
  }, [])

  const rivers = useMemo(
    () => RIVERS.map((r) => ({ name: r.name, geometry: riverGeometry(r.points, r.width) })),
    [],
  )

  const landMaterials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: sceneColor.land, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: sceneColor.landSide, roughness: 1 }),
    ],
    [sceneColor],
  )

  return (
    <group>
      {/* Surrounding plain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAIN_Y, 0]} receiveShadow>
        <circleGeometry args={[80, 64]} />
        <meshStandardMaterial color={sceneColor.plain} roughness={1} />
      </mesh>

      {/* Romania — a raised landmass, like a tile on a relief map */}
      <mesh geometry={land} material={landMaterials} receiveShadow castShadow />

      {/* Rivers */}
      {rivers.map(({ name, geometry }) => (
        <mesh key={name} geometry={geometry} receiveShadow>
          <meshStandardMaterial
            color={sceneColor.river}
            roughness={0.2}
            metalness={0.05}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ))}
    </group>
  )
}

export default memo(Terrain)
