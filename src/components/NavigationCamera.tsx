/**
 * NavigationCamera — smoothly flies the camera along the route.
 */

import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { CityMap, Position3D } from '../data/cities'
import { positionOf } from '../data/cities'

interface NavigationCameraProps {
  path: string[] | null
  cities: CityMap
  animProgress: number
  isAnimating: boolean
}

const LERP_SPEED = 0.04
const FOLLOW_HEIGHT = 5.5
const FOLLOW_DIST = 4.5
const OVERVIEW_HEIGHT = 14
const OVERVIEW_DIST = 2

export default function NavigationCamera({
  path,
  cities,
  animProgress,
  isAnimating,
}: NavigationCameraProps) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    if (!path || path.length === 0) return
    if (!isAnimating) {
      const pts = path
        .map((id) => positionOf(cities, id))
        .filter((p): p is Position3D => p !== undefined)
        .map((p) => new THREE.Vector3(...p))
      if (pts.length === 0) return
      const center = pts
        .reduce((acc, p) => acc.add(p), new THREE.Vector3())
        .divideScalar(pts.length)
      targetPos.current.set(center.x + OVERVIEW_DIST, OVERVIEW_HEIGHT, center.z + OVERVIEW_DIST * 2)
      targetLookAt.current.copy(center)
    }
  }, [isAnimating, path, cities])

  useFrame(() => {
    if (!path || path.length === 0) return

    if (!isAnimating) {
      camera.position.lerp(targetPos.current, LERP_SPEED)
      const currentDir = new THREE.Vector3()
      camera.getWorldDirection(currentDir)
      const desired = targetLookAt.current.clone().sub(camera.position).normalize()
      const blended = currentDir.lerp(desired, LERP_SPEED * 2)
      camera.lookAt(camera.position.clone().add(blended))
      return
    }

    const clamped = Math.max(0, Math.min(path.length - 1, animProgress))
    const cityIdx = Math.min(Math.floor(clamped), path.length - 1)
    const currentPos = positionOf(cities, path[cityIdx])
    if (currentPos === undefined) return
    const cityPos = new THREE.Vector3(...currentPos)

    const nextPos = positionOf(cities, path[cityIdx + 1])
    const lookTarget =
      nextPos !== undefined
        ? new THREE.Vector3(...nextPos)
        : cityPos.clone().add(new THREE.Vector3(1, 0, 1))

    targetPos.current.set(cityPos.x + FOLLOW_DIST * 0.7, FOLLOW_HEIGHT, cityPos.z + FOLLOW_DIST)
    targetLookAt.current.copy(lookTarget)

    camera.position.lerp(targetPos.current, LERP_SPEED * 1.5)
    const currentDir = new THREE.Vector3()
    camera.getWorldDirection(currentDir)
    const desired = targetLookAt.current.clone().sub(camera.position).normalize()
    const blended = currentDir.lerp(desired, LERP_SPEED * 3)
    camera.lookAt(camera.position.clone().add(blended))
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isAnimating}
      enablePan
      enableZoom
      enableRotate
      minDistance={3}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.2}
    />
  )
}
