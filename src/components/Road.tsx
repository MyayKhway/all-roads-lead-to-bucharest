/**
 * Road — draws a 3D road segment between two cities.
 */

import { Billboard, Text } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { Position3D } from '../data/cities'
import { useAppTheme } from '../lib/ThemeContext'
import { sceneColorFor } from '../lib/theme'

export type RoadStatus = 'normal' | 'path' | 'explored' | 'toll'

interface RoadProps {
  from: Position3D
  to: Position3D
  distance: number
  showDistance?: boolean
  status?: RoadStatus
}

const ROAD_WIDTH = 0.06
const ROAD_HEIGHT = 0.025
const ROAD_Y = 0.04
// Map-wide costs stay small and a little faded so the route's costs stand out.
const LABEL_Y = ROAD_Y + 0.32
const LABEL_SIZE = 0.17
const LABEL_OPACITY = 0.8

const NORMAL_COLOR = '#A09880'
const PATH_COLOR = '#43A047'
const EXPLORED_COLOR = '#7B9BAD'
// Matches the NTB ring colours: the cheapest road out of a ring.
const TOLL_COLOR = '#7c3aed'

export default function Road({
  from,
  to,
  distance,
  showDistance = true,
  status = 'normal',
}: RoadProps) {
  const sceneColor = sceneColorFor(useAppTheme())
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
    status === 'path'
      ? PATH_COLOR
      : status === 'toll'
        ? TOLL_COLOR
        : status === 'explored'
          ? EXPLORED_COLOR
          : NORMAL_COLOR
  const glows = status === 'path' || status === 'toll'
  const emissive = glows ? color : '#000000'
  const emissiveInt = glows ? 0.45 : 0

  return (
    <>
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
      {showDistance && (
        <Billboard position={[position[0], LABEL_Y, position[2]]}>
          <Text
            fontSize={LABEL_SIZE}
            color={sceneColor.roadLabel}
            fillOpacity={LABEL_OPACITY}
            outlineWidth={0.02}
            outlineColor={sceneColor.roadLabelOutline}
            outlineOpacity={LABEL_OPACITY}
            anchorX="center"
            anchorY="middle"
          >
            {String(distance)}
          </Text>
        </Billboard>
      )}
    </>
  )
}
