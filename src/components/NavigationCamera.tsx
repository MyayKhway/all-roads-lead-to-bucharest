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
// Overviews sit due south of what they frame, looking north (−z), unless given a heading.
const OVERVIEW_TILT = 0.95 // radians above the horizon
const OVERVIEW_MARGIN = 1.03
const ROUTE_MIN_RANGE = 9
const SETTLE_EPSILON = 0.02

const ROMANIA_POINTS = ROMANIA_OUTLINE.map(([x, z]) => new THREE.Vector3(x, 0, z))

function fovOf(camera: THREE.Camera): number {
  return camera instanceof THREE.PerspectiveCamera ? camera.fov : 45
}

/** How much of the screen (normalised device coordinates) framed points may fill. */
const COUNTRY_FILL = 0.94 / OVERVIEW_MARGIN
// A route's cities carry landmarks and labels beyond their centre points, so leave more room.
const ROUTE_FILL = 0.72
// The opening shot of a journey frames just its first leg, close enough to read the cities.
const OPENING_FILL = 0.52
// How far into the journey (in legs) the camera hands over from the opening shot to following.
const OPENING_HANDOFF = 0.5

function cameraFor(
  target: THREE.Vector3,
  range: number,
  fov: number,
  aspect: number,
  heading = new THREE.Vector2(0, 1),
) {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 500)
  camera.position.set(
    target.x + range * Math.cos(OVERVIEW_TILT) * heading.x,
    target.y + range * Math.sin(OVERVIEW_TILT),
    target.z + range * Math.cos(OVERVIEW_TILT) * heading.y,
  )
  camera.lookAt(target)
  camera.updateMatrixWorld()
  return camera
}

/**
 * Camera position and target that fit ground points on screen from a chosen heading.
 * Points are projected and the view is nudged until their on-screen bounds are centred.
 */
function framePoints(
  points: readonly THREE.Vector3[],
  fov: number,
  aspect: number,
  fill: number,
  minRange = 0,
  heading = new THREE.Vector2(0, 1),
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const box = new THREE.Box3().setFromPoints([...points])
  const target = box.getCenter(new THREE.Vector3())
  const vfov = THREE.MathUtils.degToRad(fov)
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
  let range = Math.max(minRange, box.getSize(new THREE.Vector3()).length())

  for (let pass = 0; pass < 8; pass += 1) {
    const camera = cameraFor(target, range, fov, aspect, heading)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const point of points) {
      const ndc = point.clone().project(camera)
      minX = Math.min(minX, ndc.x)
      maxX = Math.max(maxX, ndc.x)
      minY = Math.min(minY, ndc.y)
      maxY = Math.max(maxY, ndc.y)
    }
    // Shift the target so the projected bounds are centred (screen up points away from
    // the camera along −heading, screen right along heading turned clockwise)…
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const rightX = heading.y
    const rightZ = -heading.x
    const horizontalShift = centerX * range * Math.tan(hfov / 2)
    const verticalShift = (centerY * range * Math.tan(vfov / 2)) / Math.sin(OVERVIEW_TILT)
    target.x += rightX * horizontalShift - heading.x * verticalShift
    target.z += rightZ * horizontalShift - heading.y * verticalShift
    // …and scale the distance so the larger extent fills FILL of the screen.
    const extent = Math.max((maxX - minX) / 2, (maxY - minY) / 2)
    range = Math.max(minRange, range * (extent / fill))
  }

  return { position: cameraFor(target, range, fov, aspect, heading).position.clone(), target }
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
  // Framing of the journey's first leg, glided to as the journey starts.
  const opening = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  // No route on screen: show the whole country. Glide there when a route is cleared;
  // jump there at startup and on resize, where a glide would only look like lag.
  const hadRoute = useRef(false)
  useEffect(() => {
    const hasRoute = path !== null && path.length > 0
    const cleared = hadRoute.current && !hasRoute
    hadRoute.current = hasRoute
    if (hasRoute) return
    const home = framePoints(
      ROMANIA_POINTS,
      fovOf(camera),
      size.width / Math.max(1, size.height),
      COUNTRY_FILL,
    )
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
    opening.current = null
    if (!isAnimating || !path || path.length < 2) return
    const first = positionOf(cities, path[0])
    const second = positionOf(cities, path[1])
    if (!first || !second) return
    // Look along the first leg, from behind its starting city.
    const heading = new THREE.Vector2(first[0] - second[0], first[2] - second[2]).normalize()
    opening.current = framePoints(
      [new THREE.Vector3(...first), new THREE.Vector3(...second)],
      fovOf(camera),
      size.width / Math.max(1, size.height),
      OPENING_FILL,
      ROUTE_MIN_RANGE,
      heading,
    )
  }, [isAnimating, path, cities, camera, size.width, size.height])

  useEffect(() => {
    if (!path || path.length === 0) return
    if (!isAnimating) {
      const pts = path
        .map((id) => positionOf(cities, id))
        .filter((p): p is Position3D => p !== undefined)
        .map((p) => new THREE.Vector3(...p))
      if (pts.length === 0) return
      const overview = framePoints(
        pts,
        fovOf(camera),
        size.width / Math.max(1, size.height),
        ROUTE_FILL,
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
    const previousPos = positionOf(cities, path[cityIdx - 1])
    const travelDirection = nextPos
      ? new THREE.Vector2(nextPos[0] - cityPos.x, nextPos[2] - cityPos.z)
      : previousPos
        ? new THREE.Vector2(cityPos.x - previousPos[0], cityPos.z - previousPos[2])
        : new THREE.Vector2(0, -1)
    travelDirection.normalize()
    const lookTarget = nextPos ? cityPos.clone().lerp(new THREE.Vector3(...nextPos), 0.55) : cityPos

    targetPos.current.set(
      cityPos.x - travelDirection.x * FOLLOW_DIST,
      FOLLOW_HEIGHT,
      cityPos.z - travelDirection.y * FOLLOW_DIST,
    )
    targetLookAt.current.copy(lookTarget)
    // Start from the opening shot and blend into following as the journey gets going.
    if (opening.current) {
      const follow = THREE.MathUtils.smoothstep(clamped, 0, OPENING_HANDOFF)
      targetPos.current.lerpVectors(opening.current.position, targetPos.current, follow)
      targetLookAt.current.lerpVectors(opening.current.target, targetLookAt.current, follow)
    }

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
