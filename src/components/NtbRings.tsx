/**
 * NtbRings — the NTB heuristic's rings drawn on the 3D map during a replay.
 *
 * Every city gets a flat halo in the colour of its ring (roads to the goal),
 * with the ring number on the ground beside it.
 */

import { Text } from '@react-three/drei'
import { memo, useMemo } from 'react'
import * as THREE from 'three'
import type { CityMap } from '../data/cities'
import type { CityId } from '../data/cityIds'
import { romaniaGraph } from '../data/graph'
import { ringColor } from '../lib/theme'
import { hopDistancesFromGoal } from '../search/heuristics/ntb'

interface NtbRingsProps {
  cities: CityMap
  goal: CityId
}

const INNER = 0.8
const OUTER = 0.96

function NtbRings({ cities, goal }: NtbRingsProps) {
  const hops = useMemo(() => hopDistancesFromGoal(romaniaGraph, goal), [goal])

  return (
    <group>
      {[...hops].map(([id, ring]) => {
        const city = cities[id]
        if (!city || ring === 0) return null
        const [x, , z] = city.position
        const color = ringColor(ring)
        return (
          <group key={id} position={[x, 0.016, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[INNER, OUTER, 48]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
            <Text
              position={[0.7, 0.01, 0.82]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.26}
              color={color}
              outlineWidth={0.02}
              outlineColor="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {String(ring)}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

export default memo(NtbRings)
