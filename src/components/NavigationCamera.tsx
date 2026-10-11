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
import { ROMANIA_OUTLINE } from '../scenery/geography'

interface NavigationCameraProps {
  path: readonly string[] | null
  cities: CityMap
  animProgress: number
  isAnimating: boolean
}

const LERP_SPEED = 0.04
const FOLLOW_HEIGHT = 5.5
const FOLLOW_DIST = 4.5
// Overviews sit due south of what they frame, looking north (−z).
const OVERVIEW_TILT = 0.95 // radians above the horizon
const OVERVIEW_MARGIN = 1.03
const ROUTE_MIN_RANGE = 9
const SETTLE_EPSILON = 0.02

const ROMANIA_BOX = new THREE.Box3().setFromPoints(
  ROMANIA_OUTLINE.map(([x, z]) => new THREE.Vector3(x, 0, z)),
)

function fovOf(camera: THREE.Camera): number {
  return camera instanceof THREE.PerspectiveCamera ? camera.fov : 45
}

/** Camera position and target that fit a ground box in view, seen from the south. */
function frameBox(
  box: THREE.Box3,
  fovDegrees: number,
  aspect: number,
  minRange = 0,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const target = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const vfov = THREE.MathUtils.degToRad(fovDegrees)
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
  // The southern (near) edge looks widest, so fit the width there; depth is foreshortened by the tilt.
  const nearEdge = (size.z / 2) * Math.cos(OVERVIEW_TILT)
  const fitWidth = ((size.x / 2) * OVERVIEW_MARGIN) / Math.tan(hfov / 2) + nearEdge
  const fitDepth = (((size.z * Math.sin(OVERVIEW_TILT)) / 2) * OVERVIEW_MARGIN) / Math.tan(vfov / 2)
  const range = Math.max(minRange, fitWidth, fitDepth)
  const position = new THREE.Vector3(
    target.x,
    range * Math.sin(OVERVIEW_TILT),
    target.z + range * Math.cos(OVERVIEW_TILT),
  )
  return { position, target }
}

export default function NavigationCamera({
  path,
  cities,
  animProgress,
  isAnimating,
}: NavigationCameraProps) {
  const { camera, size } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const controlsRef = useRef<OrbitControlsImpl>(null)
  // True while flying to the overview; once there, the user has the camera.
  const settling = useRef(false)

  // No route on screen: show the whole country. Glide there when a route is cleared;
  // jump there at startup and on resize, where a glide would only look like lag.
  const hadRoute = useRef(false)
  useEffect(() => {
    const hasRoute = path !== null && path.length > 0
    const cleared = hadRoute.current && !hasRoute
    hadRoute.current = hasRoute
    if (hasRoute) return
    const home = frameBox(ROMANIA_BOX, fovOf(camera), size.width / Math.max(1, size.height))
    targetPos.current.copy(home.position)
    targetLookAt.current.copy(home.target)
    if (cleared) {
      settling.current = true
      return
    }
    camera.position.copy(home.position)
    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(home.target)
      controls.update()
    } else {
      camera.lookAt(home.target)
    }
    settling.current = false
  }, [path, camera, size.width, size.height])

  useEffect(() => {
    if (!path || path.length === 0) return
    if (!isAnimating) {
      const pts = path
        .map((id) => positionOf(cities, id))
        .filter((p): p is Position3D => p !== undefined)
        .map((p) => new THREE.Vector3(...p))
      if (pts.length === 0) return
      const overview = frameBox(
        new THREE.Box3().setFromPoints(pts),
        fovOf(camera),
        size.width / Math.max(1, size.height),
        ROUTE_MIN_RANGE,
      )
      targetPos.current.copy(overview.position)
      targetLookAt.current.copy(overview.target)
      settling.current = true
    }
  }, [isAnimating, path, cities, camera, size.width, size.height])

  useFrame(() => {
    if (!isAnimating || !path || path.length === 0) {
      if (!settling.current) return
      // Move the orbit target with the camera so OrbitControls keeps it looking at the route.
      const controls = controlsRef.current
      camera.position.lerp(targetPos.current, LERP_SPEED)
      if (controls) {
        controls.target.lerp(targetLookAt.current, LERP_SPEED * 2)
        controls.update()
      } else {
        camera.lookAt(targetLookAt.current)
      }
      if (camera.position.distanceTo(targetPos.current) < SETTLE_EPSILON) {
        camera.position.copy(targetPos.current)
        controls?.target.copy(targetLookAt.current)
        controls?.update()
        settling.current = false
      }
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
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.2}
    />
  )
}
