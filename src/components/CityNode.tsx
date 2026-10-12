/**
 * CityNode — renders a city as a status platform + GLB landmark + label.
 *
 * The landmark model is never re-coloured (that would spoil its materials);
 * search state is shown by the platform disc and a glowing ring underneath,
 * and the city currently being expanded gently bobs.
 */

import { Billboard, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import type { City } from '../data/cities'
import { useAppTheme } from '../lib/ThemeContext'
import { STATUS_COLOR, sceneColorFor } from '../lib/theme'
import { useDistanceScale } from '../lib/useDistanceScale'
import LandmarkModel from './LandmarkModel'

export type CityStatus = 'normal' | 'start' | 'goal' | 'explored' | 'path' | 'frontier' | 'current'

interface CityNodeProps {
  city: City
  status?: CityStatus
  onClick?: (cityId: string, shiftKey: boolean) => void
  onPointerOver?: (cityId: string) => void
  onPointerOut?: (cityId: string) => void
}

const BASE_HEIGHT = 0.035
const PLATFORM_RADIUS = 0.6

const RING: Partial<Record<CityStatus, string>> = {
  start: STATUS_COLOR.start,
  goal: STATUS_COLOR.goal,
  path: STATUS_COLOR.path,
  current: STATUS_COLOR.current,
  frontier: STATUS_COLOR.frontier,
}

export default function CityNode({
  city,
  status = 'normal',
  onClick,
  onPointerOver,
  onPointerOut,
}: CityNodeProps) {
  const [hovered, setHovered] = useState(false)
  const [modelHeight, setModelHeight] = useState(0.9)
  const landmarkRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<THREE.Group>(null)
  useDistanceScale(labelRef, 17)

  const sceneColor = sceneColorFor(useAppTheme())
  const ringColor = RING[status]
  const platformColor = hovered
    ? STATUS_COLOR.hover
    : status === 'normal'
      ? sceneColor.platform
      : status === 'frontier'
        ? sceneColor.platform
        : STATUS_COLOR[status]
  const isCurrent = status === 'current'
  const isHighlighted = status === 'start' || status === 'goal' || status === 'path'

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (landmarkRef.current) {
      landmarkRef.current.position.y =
        BASE_HEIGHT + (isCurrent ? Math.abs(Math.sin(t * 4)) * 0.08 : 0)
    }
    if (ringRef.current) {
      const pulse = isCurrent || status === 'frontier' ? 1 + Math.sin(t * 5) * 0.06 : 1
      ringRef.current.scale.setScalar(pulse)
    }
  })

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
    onClick?.(city.id, e.shiftKey)
  }

  const handleHeight = useCallback((h: number) => setModelHeight(h), [])

  const [px, py, pz] = city.position
  const labelY = BASE_HEIGHT + modelHeight + 0.28

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not DOM
    <group
      position={[px, py, pz]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Status platform */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[PLATFORM_RADIUS, PLATFORM_RADIUS + 0.03, BASE_HEIGHT, 40]} />
        <meshStandardMaterial color={platformColor} roughness={0.85} />
      </mesh>

      {/* Glow ring: start / goal / route / frontier / currently expanding */}
      {ringColor && (
        <mesh ref={ringRef} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[PLATFORM_RADIUS + 0.04, PLATFORM_RADIUS + (isCurrent ? 0.16 : 0.11), 48]}
          />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={0.9}
            transparent
            opacity={status === 'frontier' ? 0.7 : 0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Landmark */}
      <group ref={landmarkRef} position={[0, BASE_HEIGHT, 0]}>
        <LandmarkModel
          city={city}
          onHeight={handleHeight}
          highlight={isHighlighted}
          explored={status === 'explored'}
        />
      </group>

      {/* City label — always faces the camera; landmark name on hover */}
      <Billboard ref={labelRef} follow position={[0, labelY, 0]}>
        <Text
          fontSize={0.24}
          color={ringColor && status !== 'frontier' ? ringColor : '#ffffff'}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.022}
          outlineColor="#1d2733"
        >
          {city.name}
        </Text>
        {hovered && (
          <Text
            position={[0, -0.05, 0]}
            fontSize={0.14}
            color="#f5efe1"
            anchorX="center"
            anchorY="top"
            outlineWidth={0.016}
            outlineColor="#1d2733"
          >
            {city.landmark}
          </Text>
        )}
      </Billboard>
    </group>
  )
}
