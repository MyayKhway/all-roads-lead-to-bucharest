/**
 * InstancedModel — renders one GLB many times with a single draw call per
 * material, using THREE.InstancedMesh. Used for every tree, bush, rock and
 * mountain, so a forest of hundreds of trees costs two draw calls
 * (trunk + foliage) instead of hundreds.
 */

import { useGLTF } from '@react-three/drei'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Instance } from '../scenery/placement'

interface Part {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  /** Mesh transform inside the GLB, applied before each instance transform. */
  local: THREE.Matrix4
}

interface InstancedPartProps {
  part: Part
  instances: readonly Instance[]
  castShadow: boolean
  receiveShadow: boolean
}

function InstancedPart({ part, instances, castShadow, receiveShadow }: InstancedPartProps) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    instances.forEach((inst, i) => {
      p.set(...inst.position)
      s.set(...inst.scale)
      q.setFromAxisAngle(up, inst.rotationY)
      m.compose(p, q, s).multiply(part.local)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [instances, part])

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

interface InstancedModelProps {
  url: string
  instances: readonly Instance[]
  castShadow?: boolean
  receiveShadow?: boolean
}

function InstancedModel({
  url,
  instances,
  castShadow = true,
  receiveShadow = true,
}: InstancedModelProps) {
  const { scene } = useGLTF(url, false)

  const parts = useMemo<Part[]>(() => {
    const out: Part[] = []
    scene.updateMatrixWorld(true)
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      out.push({
        geometry: mesh.geometry,
        material: mesh.material as THREE.Material,
        local: mesh.matrixWorld.clone(),
      })
    })
    return out
  }, [scene])

  if (instances.length === 0) return null
  return (
    <group>
      {parts.map((part) => (
        <InstancedPart
          key={part.geometry.uuid}
          part={part}
          instances={instances}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  )
}

export default memo(InstancedModel)
