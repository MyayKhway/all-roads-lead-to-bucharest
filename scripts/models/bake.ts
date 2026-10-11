/**
 * bake — turns a freshly built model into an optimised, GLB-ready scene.
 *
 *  1. Flatten: every mesh is transformed into model space and merged with all
 *     other meshes sharing its material → one draw call per material.
 *  2. Ambient occlusion: optional per-vertex AO, ray-cast against the model
 *     itself plus a ground plane and baked into vertex colours. Corners,
 *     arcades, the underside of roofs and the base of walls darken slightly,
 *     which reads as soft contact shadow without any textures or post effects.
 *  3. Export: GLTFExporter → .glb bytes.
 */

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MeshBVH } from 'three-mesh-bvh'
import { rng } from './kit'

export interface BakeOptions {
  /** Bake ambient occlusion into vertex colours. */
  ao?: boolean
  /** Longest AO ray, in model units. */
  aoDistance?: number
  /** 0 = no darkening, 1 = fully occluded corners go black. */
  aoStrength?: number
  /** Include a ground plane at y = 0 as an occluder (contact shadow). */
  aoGround?: boolean
}

function prepare(mesh: THREE.Mesh): THREE.BufferGeometry {
  let g = mesh.geometry.clone()
  g.applyMatrix4(mesh.matrixWorld)
  if (g.index) g = g.toNonIndexed()
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name)
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  g.clearGroups()
  return g
}

/** Merge meshes by material name; returns [material, merged geometry] pairs. */
function mergeByMaterial(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const buckets = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >()
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.Material
    const bucket = buckets.get(mat.name) ?? { material: mat, geometries: [] }
    bucket.geometries.push(prepare(mesh))
    buckets.set(mat.name, bucket)
  })

  const out: { material: THREE.Material; geometry: THREE.BufferGeometry }[] = []
  for (const { material, geometries } of buckets.values()) {
    // mergeGeometries needs identical attribute sets — pad missing colours with white.
    const anyColor = geometries.some((g) => g.getAttribute('color'))
    if (anyColor) {
      for (const g of geometries) {
        if (!g.getAttribute('color')) {
          const count = g.getAttribute('position').count
          g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3))
        }
      }
    }
    const merged = mergeGeometries(geometries, false)
    if (!merged) throw new Error(`Could not merge geometries for material ${material.name}`)
    out.push({ material, geometry: merged })
  }
  return out
}

/** Cosine-weighted hemisphere directions around +z (golden-angle spiral). */
function hemisphereSamples(n: number): THREE.Vector3[] {
  const dirs: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt((i + 0.5) / n)
    const a = i * golden
    dirs.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(1 - r * r)))
  }
  return dirs
}

function bakeAmbientOcclusion(
  parts: { geometry: THREE.BufferGeometry }[],
  { aoDistance = 0.45, aoStrength = 0.8, aoGround = true }: BakeOptions,
): void {
  const occluders = parts.map((p) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', p.geometry.getAttribute('position'))
    return g
  })

  const box = new THREE.Box3()
  for (const o of occluders) {
    o.computeBoundingBox()
    if (o.boundingBox) box.union(o.boundingBox)
  }
  if (aoGround) {
    const size = box.getSize(new THREE.Vector3())
    const ground = new THREE.PlaneGeometry(size.x * 3 + 2, size.z * 3 + 2).rotateX(-Math.PI / 2)
    const center = box.getCenter(new THREE.Vector3())
    ground.translate(center.x, -0.001, center.z)
    const flat = new THREE.BufferGeometry()
    flat.setAttribute('position', ground.toNonIndexed().getAttribute('position'))
    occluders.push(flat)
  }

  const combined = mergeGeometries(occluders, false)
  if (!combined) throw new Error('AO: could not build occluder geometry')
  const bvh = new MeshBVH(combined)

  const samples = hemisphereSamples(24)
  const jitter = rng(7)
  const ray = new THREE.Ray()
  const n = new THREE.Vector3()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 0, 1)
  const cache = new Map<string, number>()

  for (const { geometry } of parts) {
    const pos = geometry.getAttribute('position')
    const nor = geometry.getAttribute('normal')
    const existing = geometry.getAttribute('color')
    const colors = new Float32Array(pos.count * 3)

    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(nor, i).normalize()
      const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}|${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)}`
      let ao = cache.get(key)
      if (ao === undefined) {
        q.setFromUnitVectors(up, n)
        const spin = jitter() * Math.PI * 2
        const spinQ = new THREE.Quaternion().setFromAxisAngle(up, spin)
        let occlusion = 0
        for (const s of samples) {
          ray.origin.fromBufferAttribute(pos, i).addScaledVector(n, 0.004)
          ray.direction.copy(s).applyQuaternion(spinQ).applyQuaternion(q)
          const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0, aoDistance)
          if (hit) occlusion += 1 - hit.distance / aoDistance
        }
        ao = 1 - aoStrength * (occlusion / samples.length)
        ao = Math.max(0.35, Math.min(1, ao))
        cache.set(key, ao)
      }
      const base = existing ? [existing.getX(i), existing.getY(i), existing.getZ(i)] : [1, 1, 1]
      colors[i * 3] = (base[0] ?? 1) * ao
      colors[i * 3 + 1] = (base[1] ?? 1) * ao
      colors[i * 3 + 2] = (base[2] ?? 1) * ao
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }
}

/** Flatten + (optionally) AO-bake a built model into an export-ready scene. */
export function bake(root: THREE.Object3D, options: BakeOptions = {}): THREE.Scene {
  const parts = mergeByMaterial(root)
  if (options.ao) bakeAmbientOcclusion(parts, options)

  const scene = new THREE.Scene()
  scene.name = root.name
  for (const { material, geometry } of parts) {
    const m = (material as THREE.MeshStandardMaterial).clone()
    m.vertexColors = Boolean(geometry.getAttribute('color'))
    // Re-index: identical corners (same position, normal and baked colour) share a vertex.
    const mesh = new THREE.Mesh(mergeVertices(geometry, 1e-4), m)
    mesh.name = `${root.name}_${material.name}`
    scene.add(mesh)
  }
  return scene
}

// GLTFExporter uses the browser FileReader to assemble the binary chunk.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buf) => {
      this.result = buf
      this.onloadend?.()
    })
  }

  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`
      this.onloadend?.()
    })
  }
}

if (typeof (globalThis as { FileReader?: unknown }).FileReader === 'undefined') {
  ;(globalThis as { FileReader?: unknown }).FileReader = NodeFileReader
}

export async function toGLB(scene: THREE.Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter()
  const result = await exporter.parseAsync(scene, { binary: true })
  if (!(result instanceof ArrayBuffer)) throw new Error('GLTFExporter did not return binary output')
  return result
}
