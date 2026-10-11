import assert from 'node:assert/strict'
import test from 'node:test'
import { searchVariantRegistry } from '@/search/registry'

test('registers the magnetic field variant', () => {
  const variant = searchVariantRegistry.find((candidate) => candidate.id === 'astar-magnetic-field')

  assert.ok(variant)
  assert.equal(variant.name, 'A* with magnetic field heuristic')
  assert.equal(variant.algorithmName, 'Magnetic-field A*')
  assert.equal(variant.heuristicName, 'Magnetic field')
})
