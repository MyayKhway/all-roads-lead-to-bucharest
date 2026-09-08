/**
 * Road — draws a 3D road segment between two cities.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { Position3D } from '../data/cities'

export type RoadStatus = 'normal' | 'path' | 'explored'

interface RoadProps {
  from: Position3D
  to: Position3D
  status?: RoadStatus
}

const ROAD_WIDTH = 0.06
const ROAD_HEIGHT = 0.025
const ROAD_Y = 0.04

const NORMAL_COLOR = '#A09880'
const PATH_COLOR = '#43A047'
const EXPLORED_COLOR = '#7B9BAD'

export default function Road({ from, to, status = 'normal' }: RoadProps) {
  const { position, rotation, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    a.y = ROAD_Y
    b.y = ROAD_Y

    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    const angle = Math.atan2(dir.x, dir.z)

    return {
      position: mid.toArray() as Position3D,
      rotation: [0, angle, 0] as [number, number, number],
      length: len,
    }
  }, [from, to])

  const color =
    status === 'path' ? PATH_COLOR : status === 'explored' ? EXPLORED_COLOR : NORMAL_COLOR
  const emissive = status === 'path' ? PATH_COLOR : '#000000'
  const emissiveInt = status === 'path' ? 0.35 : 0

  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={[ROAD_WIDTH, ROAD_HEIGHT, length]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveInt}
        roughness={0.85}
        metalness={0}
      />
    </mesh>
  )
}
