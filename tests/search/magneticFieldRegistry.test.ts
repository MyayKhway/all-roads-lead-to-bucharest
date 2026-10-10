import assert from 'node:assert/strict'
import test from 'node:test'
import { searchVariantRegistry } from '@/search/registry'

test('registers the magnetic field variant', () => {
  assert.deepEqual(
    searchVariantRegistry.map((variant) => variant.id),
    ['astar-magnetic-field'],
  )
})
