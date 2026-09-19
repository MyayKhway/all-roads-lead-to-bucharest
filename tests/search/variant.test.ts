import assert from 'node:assert/strict'
import test from 'node:test'

import { referenceDijkstra } from '@/benchmark/reference'
import { findSearchVariant, type SearchVariant, validateSearchVariants } from '@/search/variant'

const variant: SearchVariant = {
  id: 'dijkstra',
  name: 'Dijkstra baseline',
  algorithmName: 'Dijkstra',
  heuristicName: null,
  author: 'Test',
  algorithm: referenceDijkstra,
}

test('validates and resolves a registered search variant', () => {
  validateSearchVariants([variant])

  assert.equal(findSearchVariant([variant], 'dijkstra'), variant)
})

test('rejects duplicate variant IDs and unknown selections', () => {
  assert.throws(() => validateSearchVariants([variant, variant]), /Duplicate search variant ID/)
  assert.throws(() => findSearchVariant([variant], 'missing'), /Unknown search variant/)
})
