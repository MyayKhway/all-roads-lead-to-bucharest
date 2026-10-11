/**
 * Scenery — mountains, hills, forests, bushes, rocks and grass.
 *
 * Every element is one of twelve reusable GLB models (public/models/environment)
 * drawn through instancing at controlled positions from scenery/placement.ts.
 * Decoration only: the pathfinding graph is untouched.
 */

import { useGLTF } from '@react-three/drei'
import { memo } from 'react'
import type { TerrainModel } from '../scenery/geography'
import { reliefInstances, type VegetationModel, vegetationInstances } from '../scenery/placement'
import InstancedModel from './InstancedModel'

const url = (name: string) => `/models/environment/${name}.glb`

// Placement is deterministic, so compute it once for the lifetime of the page.
const RELIEF = reliefInstances()
const VEGETATION = vegetationInstances()

const RELIEF_MODELS: TerrainModel[] = ['mountain_a', 'mountain_b', 'mountain_c', 'hill']
const TREE_MODELS: VegetationModel[] = ['pine', 'round', 'small', 'large', 'poplar']

for (const name of [...RELIEF_MODELS, ...TREE_MODELS, 'bush', 'grass', 'rock']) {
  useGLTF.preload(url(name), false)
}

function Scenery() {
  return (
    <group>
      {RELIEF_MODELS.map((name) => (
        <InstancedModel key={name} url={url(name)} instances={RELIEF[name]} />
      ))}
      {TREE_MODELS.map((name) => (
        <InstancedModel key={name} url={url(name)} instances={VEGETATION[name]} />
      ))}
      <InstancedModel url={url('bush')} instances={VEGETATION.bush} />
      <InstancedModel url={url('rock')} instances={VEGETATION.rock} />
      {/* Grass is too small to cast a readable shadow — skip it in the shadow pass */}
      <InstancedModel url={url('grass')} instances={VEGETATION.grass} castShadow={false} />
    </group>
  )
}

export default memo(Scenery)
