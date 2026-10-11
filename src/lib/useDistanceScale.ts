import { useFrame } from '@react-three/fiber'
import { type RefObject, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Scale an object with its distance from the camera, so labels keep a roughly
 * constant on-screen size: readable from the overview, never billboard-sized
 * when the camera swoops in to follow the route.
 */
export function useDistanceScale(
  ref: RefObject<THREE.Object3D | null>,
  referenceDistance = 20,
  min = 0.35,
  max = 1.35,
): void {
  const world = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const obj = ref.current
    if (!obj) return
    obj.getWorldPosition(world)
    const s = THREE.MathUtils.clamp(camera.position.distanceTo(world) / referenceDistance, min, max)
    obj.scale.setScalar(s)
  })
}
