/**
 * LandmarkModel — loads a city's GLB landmark and places it on the map.
 *
 * If a model is missing or fails to parse, the city falls back to the old
 * procedural placeholder (Landmark.tsx) instead of taking the scene down.
 */

import { useGLTF } from '@react-three/drei'
import { Component, type ReactNode, Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { City } from '../data/cities'
import { cityList } from '../data/cities'
import Landmark from './Landmark'

for (const city of cityList) useGLTF.preload(city.model, false)

/** Uniform boost on top of each city's calibrated scale, so landmarks read a bit larger. */
const SCALE_BOOST = 1.18

interface BoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

class ModelBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    console.warn('Landmark model failed to load; using placeholder.', error)
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

interface GlbProps {
  city: City
  onHeight?: (height: number) => void
}

function Glb({ city, onHeight }: GlbProps) {
  const { scene } = useGLTF(city.model, false)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    return clone
  }, [scene])

  const scale = city.scale * SCALE_BOOST

  const height = useMemo(() => new THREE.Box3().setFromObject(model).max.y * scale, [model, scale])

  useEffect(() => {
    onHeight?.(height)
  }, [height, onHeight])

  return <primitive object={model} scale={scale} />
}

interface LandmarkModelProps extends GlbProps {
  highlight: boolean
  explored: boolean
}

export default function LandmarkModel({ city, onHeight, highlight, explored }: LandmarkModelProps) {
  const placeholder = <Landmark cityId={city.id} highlight={highlight} explored={explored} />
  return (
    <ModelBoundary fallback={placeholder}>
      <Suspense fallback={null}>
        <Glb city={city} {...(onHeight ? { onHeight } : {})} />
      </Suspense>
    </ModelBoundary>
  )
}
