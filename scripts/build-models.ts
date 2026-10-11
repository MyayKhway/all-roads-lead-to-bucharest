/**
 * build-models — generates every GLB under public/models/.
 *
 *   npm run models
 *
 * Landmarks → public/models/<city>/<city>.glb
 * Scenery   → public/models/environment/<name>.glb
 *
 * The output is deterministic, so re-running only changes files whose builder
 * changed.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type * as THREE from 'three'
import { bake, toGLB } from './models/bake'
import { ENVIRONMENT } from './models/environment'
import { Model } from './models/kit'
import { LANDMARKS } from './models/landmarks'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')

function stats(scene: THREE.Object3D) {
  let meshes = 0
  let triangles = 0
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    meshes++
    const { index } = mesh.geometry
    triangles += (index ? index.count : mesh.geometry.getAttribute('position').count) / 3
  })
  return { meshes, triangles }
}

async function write(path: string, scene: THREE.Object3D) {
  const bytes = await toGLB(scene)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, Buffer.from(bytes))
  const { meshes, triangles } = stats(scene)
  const rel = path.slice(root.length + 1)
  process.stdout.write(
    `  ${rel.padEnd(34)} ${String(meshes).padStart(3)} meshes ${String(Math.round(triangles)).padStart(6)} tris ${(bytes.byteLength / 1024).toFixed(0).padStart(5)} KB\n`,
  )
}

async function main() {
  const t0 = performance.now()
  process.stdout.write('Landmarks\n')
  for (const [id, build] of Object.entries(LANDMARKS)) {
    const model = new Model(id)
    build(model)
    await write(join(root, id, `${id}.glb`), bake(model.root, { ao: true, aoDistance: 0.4 }))
  }

  process.stdout.write('Environment\n')
  for (const [name, { build, ao }] of Object.entries(ENVIRONMENT)) {
    const model = build()
    await write(join(root, 'environment', `${name}.glb`), bake(model.root, { ao, aoDistance: 0.3 }))
  }
  process.stdout.write(`Done in ${((performance.now() - t0) / 1000).toFixed(1)} s\n`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
