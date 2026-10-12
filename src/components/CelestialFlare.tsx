/**
 * CelestialFlare — on each theme switch, a sun (light) or moon (dark) orbits
 * across the sky: it rises on the left, arcs over the map lighting it from its
 * changing position (so shadows sweep), and sets on the right. Purely
 * decorative; skipped under prefers-reduced-motion.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useAppTheme } from '../lib/ThemeContext'
import type { ThemeName } from '../lib/useTheme'

const DURATION = 3.6 // seconds, horizon to horizon
const DEPTH = 20 // distance in front of the camera
// Ray angles around the sun, alternating long and short.
const RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: (i / 12) * Math.PI * 2,
  length: i % 2 ? 3.4 : 2.6,
}))

const LOOK = {
  light: { core: '#fff4c2', halo: '#ffc94d', light: '#ffe2a8', intensity: 2.2 },
  dark: { core: '#e9eef8', halo: '#8fb2ff', light: '#b8ccff', intensity: 1.8 },
} as const

const CRATERS: [number, number, number][] = [
  [-0.32, 0.22, 0.2],
  [0.28, -0.1, 0.14],
  [-0.05, -0.38, 0.11],
  [0.18, 0.4, 0.08],
]

function smooth(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

/** Brightness over the orbit: fades in above the horizon, out as it sets. */
function envelope(t: number): number {
  if (t < 0.2) return smooth(t / 0.2)
  if (t < 0.8) return 1
  return 1 - smooth((t - 0.8) / 0.2)
}

/** Ease in-out so the body lingers a little near the top of its arc. */
function orbitAngle(t: number): number {
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
  return Math.PI * (1 - (0.15 + 0.7 * eased)) // ~153° (left) → ~27° (right)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useGlowTexture(): THREE.Texture {
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
    }
    return new THREE.CanvasTexture(canvas)
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

export default function CelestialFlare() {
  const theme = useAppTheme()
  const camera = useThree((s) => s.camera)
  const glow = useGlowTexture()

  // Which body is out, and when it started; null while the sky is empty.
  const [flare, setFlare] = useState<{ body: ThemeName; key: number } | null>(null)
  const startRef = useRef<number | null>(null)
  const prevTheme = useRef(theme)

  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const raysRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const fadeRefs = useRef<THREE.MeshBasicMaterial[]>([])

  useEffect(() => {
    // Only react to switches, not to the theme the page loaded with.
    if (theme === prevTheme.current) return
    prevTheme.current = theme
    if (prefersReducedMotion()) return
    startRef.current = null
    setFlare((prev) => ({ body: theme, key: (prev?.key ?? 0) + 1 }))
  }, [theme])

  const offset = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const group = groupRef.current
    if (!flare || !group) return
    const now = state.clock.elapsedTime
    if (startRef.current === null) startRef.current = now
    const t = (now - startRef.current) / DURATION
    if (t >= 1) {
      startRef.current = null
      setFlare(null)
      return
    }
    const k = envelope(t)

    // Ride along with the camera, orbiting around a centre below the view so
    // the arc rises from the left edge, crests near the top and sets right.
    const cam = camera as THREE.PerspectiveCamera
    const halfH = DEPTH * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const halfW = halfH * cam.aspect
    const angle = orbitAngle(t)
    const x = Math.cos(angle) * halfW * 1.05
    const y = -halfH * 0.55 + Math.sin(angle) * halfH * 1.35
    offset.set(x, y, -DEPTH).applyQuaternion(cam.quaternion)
    group.position.copy(cam.position).add(offset)
    group.quaternion.copy(cam.quaternion)

    const scale = halfH * 0.1 * (0.75 + 0.25 * k)
    bodyRef.current?.scale.setScalar(scale)
    if (raysRef.current) raysRef.current.rotation.z = now * 0.4
    for (const m of fadeRefs.current) m.opacity = k * (m.userData.peak as number)

    // Light falls from the body's direction onto the map.
    const light = lightRef.current
    if (light) {
      light.intensity = LOOK[flare.body].intensity * k
      light.position.copy(group.position)
    }
  })

  if (!flare) return null
  const look = LOOK[flare.body]
  fadeRefs.current = []
  const fade = (peak: number) => (m: THREE.MeshBasicMaterial | null) => {
    if (!m) return
    m.userData.peak = peak
    m.opacity = 0
    fadeRefs.current.push(m)
  }
  const overlay = {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  }

  return (
    <>
      <directionalLight ref={lightRef} color={look.light} intensity={0} />
      <group ref={groupRef} key={flare.key} renderOrder={10}>
        <group ref={bodyRef}>
          {/* halo */}
          <mesh renderOrder={10}>
            <planeGeometry args={[7, 7]} />
            <meshBasicMaterial
              ref={fade(0.85)}
              map={glow}
              color={look.halo}
              blending={THREE.AdditiveBlending}
              {...overlay}
            />
          </mesh>

          {flare.body === 'light' && (
            <group ref={raysRef}>
              {RAYS.map(({ angle, length }) => (
                <mesh key={angle} rotation={[0, 0, angle]} renderOrder={11}>
                  <planeGeometry args={[0.16, length]} />
                  <meshBasicMaterial
                    ref={fade(0.5)}
                    color={look.halo}
                    blending={THREE.AdditiveBlending}
                    {...overlay}
                  />
                </mesh>
              ))}
            </group>
          )}

          {/* disc */}
          <mesh renderOrder={12}>
            <circleGeometry args={[1, 48]} />
            <meshBasicMaterial ref={fade(1)} color={look.core} {...overlay} />
          </mesh>

          {flare.body === 'dark' &&
            CRATERS.map(([cx, cy, r]) => (
              <mesh key={`${cx},${cy}`} position={[cx, cy, 0]} renderOrder={13}>
                <circleGeometry args={[r, 24]} />
                <meshBasicMaterial ref={fade(0.35)} color="#9aa6bd" {...overlay} />
              </mesh>
            ))}
        </group>
      </group>
    </>
  )
}
