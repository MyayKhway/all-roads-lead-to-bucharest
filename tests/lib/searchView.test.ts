import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveSearchView, EMPTY_VIEW, roadKey } from '@/lib/searchView'
import { runRoute } from '@/search/presentation'
import { ntbAstarVariant } from '@/search/variants/ntbAstar'

const run = runRoute(ntbAstarVariant, 'arad', 'bucharest')

test('shows nothing before the first expansion', () => {
  assert.equal(deriveSearchView(run, 0), EMPTY_VIEW)
})

test('after expanding Arad, its neighbours form the frontier', () => {
  const view = deriveSearchView(run, 1)

  assert.deepEqual(view.explored, ['arad'])
  assert.equal(view.current, 'arad')
  assert.deepEqual([...view.frontier].sort(), ['sibiu', 'timisoara', 'zerind'])
  assert.ok(view.touchedRoads.has(roadKey('sibiu', 'arad')))
})

test('expanded cities leave the frontier', () => {
  const view = deriveSearchView(run, 2)

  assert.equal(view.current, 'sibiu')
  assert.ok(!view.frontier.has('sibiu'))
  assert.ok(view.frontier.has('rimnicu'))
})
