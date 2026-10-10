import assert from 'node:assert/strict'
import test from 'node:test'
import { searchVariantRegistry } from '@/search/registry'

test('registers magnetic alignment', () => {
  assert.deepEqual(searchVariantRegistry.map((variant) => variant.id), [
    'astar-magnetic-alignment',
  ])
})
