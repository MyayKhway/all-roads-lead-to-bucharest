/**
 * Landmark — procedural low-poly city landmark.
 * Each city gets a distinctive procedural shape.
 */

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { COLOR } from '../lib/theme'

type ShapeVariant =
  | 'castle'
  | 'church'
  | 'cathedral'
  | 'tower'
  | 'fort'
  | 'arch'
  | 'palace'
  | 'bridge'

const SHAPE_MAP: Record<string, ShapeVariant> = {
  arad: 'castle',
  zerind: 'church',
  oradea: 'castle',
  timisoara: 'cathedral',
  lugoj: 'tower',
  mehadia: 'fort',
  drobeta: 'arch',
  craiova: 'palace',
  sibiu: 'bridge',
  rimnicu: 'tower',
  pitesti: 'fort',
  fagaras: 'castle',
  bucharest: 'palace',
  giurgiu: 'fort',
  urziceni: 'church',
  hirsova: 'castle',
  eforie: 'tower',
  vaslui: 'fort',
  iasi: 'palace',
  neamt: 'castle',
}

const STONE: Record<ShapeVariant, string> = {
  castle: '#6e7a8a',
  church: '#7d7690',
  cathedral: '#71889a',
  tower: '#8a7862',
  fort: '#6b6455',
  arch: '#9c8a68',
  palace: '#8a7484',
  bridge: '#5f7f86',
}

interface ShapeProps {
  color: string
  scale: number
}

function CastleShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {(
        [
          [-0.15, -0.15],
          [0.15, -0.15],
          [-0.15, 0.15],
          [0.15, 0.15],
        ] as [number, number][]
      ).map(([x, z], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, order is fixed
        <mesh key={i} position={[x, 0.7, z]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[0.25, 0.3, 6]} />
        <meshStandardMaterial color="#a85c3f" roughness={0.55} />
      </mesh>
    </group>
  )
}

function ChurchShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.35, 0.4, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <coneGeometry args={[0.22, 0.4, 4]} />
        <meshStandardMaterial color="#5e6e88" roughness={0.5} />
      </mesh>
      <mesh position={[0.2, 0.35, 0.1]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 0.65, 0.1]} castShadow>
        <coneGeometry args={[0.1, 0.2, 8]} />
        <meshStandardMaterial color="#5e6e88" roughness={0.5} />
      </mesh>
    </group>
  )
}

function CathedralShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5e8a82" roughness={0.4} />
      </mesh>
      {(
        [
          [-0.2, 0.2],
          [0.2, 0.2],
          [-0.2, -0.2],
          [0.2, -0.2],
        ] as [number, number][]
      ).map(([x, z], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, order is fixed
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <coneGeometry args={[0.09, 0.2, 8]} />
            <meshStandardMaterial color="#5e8a82" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function TowerShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.7, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <coneGeometry args={[0.22, 0.35, 8]} />
        <meshStandardMaterial color="#a86e4a" roughness={0.55} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, order is fixed
          key={i}
          position={[Math.sin(angle) * 0.19, 0.4, Math.cos(angle) * 0.19]}
          rotation={[0, angle, 0]}
          castShadow
        >
          <boxGeometry args={[0.04, 0.12, 0.02]} />
          <meshStandardMaterial color="#2c2620" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function FortShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {(
        [
          [-0.25, -0.25],
          [0.25, -0.25],
          [-0.25, 0.25],
          [0.25, 0.25],
        ] as [number, number][]
      ).map(([x, z], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, order is fixed
        <mesh key={i} position={[x, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.35, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.25, 0.35, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  )
}

function ArchShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[-0.2, 0.25, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 0.25, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.52, 0.1, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.7, 0.06, 0.18]} />
        <meshStandardMaterial color="#4a4238" roughness={0.85} />
      </mesh>
    </group>
  )
}

function PalaceShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <coneGeometry args={[0.2, 0.18, 4]} />
        <meshStandardMaterial color="#6e5a68" roughness={0.45} />
      </mesh>
      {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, order is fixed
        <mesh key={i} position={[x, 0.2, 0.26]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.4, 6]} />
          <meshStandardMaterial color="#c9bfa8" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[-0.48, 0.18, 0]} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0.48, 0.18, 0]} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

function BridgeShape({ color, scale }: ShapeProps) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <torusGeometry args={[0.18, 0.04, 8, 12, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-0.12, 0.12].map((z, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, order is fixed
        <mesh key={i} position={[0, 0.3, z]} castShadow>
          <boxGeometry args={[0.68, 0.06, 0.03]} />
          <meshStandardMaterial color="#4a4238" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LandmarkProps {
  cityId: string
  highlight: boolean
  explored: boolean
}

export default function Landmark({ cityId, highlight, explored }: LandmarkProps) {
  const ref = useRef<THREE.Group>(null)
  const variant: ShapeVariant = SHAPE_MAP[cityId] ?? 'tower'
  const baseColor = STONE[variant]

  const color = highlight ? COLOR.amberHover : explored ? '#5c6a7d' : baseColor

  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = highlight ? Math.sin(state.clock.elapsedTime * 2) * 0.05 : 0
  })

  const shapeProps: ShapeProps = { color, scale: highlight ? 1.25 : 1 }

  return (
    <group ref={ref}>
      {variant === 'castle' && <CastleShape {...shapeProps} />}
      {variant === 'church' && <ChurchShape {...shapeProps} />}
      {variant === 'cathedral' && <CathedralShape {...shapeProps} />}
      {variant === 'tower' && <TowerShape {...shapeProps} />}
      {variant === 'fort' && <FortShape {...shapeProps} />}
      {variant === 'arch' && <ArchShape {...shapeProps} />}
      {variant === 'palace' && <PalaceShape {...shapeProps} />}
      {variant === 'bridge' && <BridgeShape {...shapeProps} />}
    </group>
  )
}
