/**
 * CityNode — renders a city as a base platform + landmark + label.
 */

import { Billboard, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import type { City } from '../data/cities'
import { STATUS_COLOR } from '../lib/theme'
import Landmark from './Landmark'

export type CityStatus = 'normal' | 'start' | 'goal' | 'explored' | 'path'

interface CityNodeProps {
  city: City
  status?: CityStatus
  onClick?: (cityId: string) => void
  onPointerOver?: (cityId: string) => void
  onPointerOut?: (cityId: string) => void
}

const BASE_HEIGHT = 0.06

export default function CityNode({
  city,
  status = 'normal',
  onClick,
  onPointerOver,
  onPointerOut,
}: CityNodeProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)

  const isHighlighted = status === 'start' || status === 'goal' || status === 'path'
  const isExplored = status === 'explored'
  const platformColor = hovered ? STATUS_COLOR.hover : STATUS_COLOR[status]
  const ringColor =
    status === 'goal'
      ? STATUS_COLOR.goal
      : status === 'start'
        ? STATUS_COLOR.start
        : STATUS_COLOR.path

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
    onPointerOver?.(city.id)
  }

  function handlePointerOut(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'default'
    onPointerOut?.(city.id)
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    onClick?.(city.id)
  }

  const [px, py, pz] = city.position

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not DOM
    <group
      ref={groupRef}
      position={[px, py, pz]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Base platform */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.45, 0.48, BASE_HEIGHT, 16]} />
        <meshStandardMaterial color={platformColor} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Glow ring for highlighted cities */}
      {isHighlighted && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.58, 32]} />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={0.85}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Landmark */}
      <group position={[0, BASE_HEIGHT, 0]}>
        <Landmark cityId={city.id} highlight={isHighlighted} explored={isExplored} />
      </group>

      {/* City label — always faces camera */}
      <Billboard follow position={[0, 1.4, 0]}>
        <Text
          fontSize={0.22}
          color={isHighlighted ? ringColor : '#e7eaee'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor="#0a0d12"
        >
          {city.name}
        </Text>
      </Billboard>
    </group>
  )
}
