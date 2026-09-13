import assert from 'node:assert/strict'
import test from 'node:test'
import { cities } from '../../src/data/cities.js'
import { CITY_IDS, isCityId } from '../../src/data/cityIds.js'
import { edges, romaniaGraph } from '../../src/data/graph.js'

test('defines the complete set of assignment cities', () => {
  assert.equal(CITY_IDS.length, 20)
  assert.equal(new Set(CITY_IDS).size, CITY_IDS.length)
  assert.ok(CITY_IDS.every(isCityId))
  assert.equal(isCityId('not-a-city'), false)
})

test('keeps presentation metadata aligned with canonical city identifiers', () => {
  assert.deepEqual(Object.keys(cities).sort(), [...CITY_IDS].sort())

  for (const cityId of CITY_IDS) {
    assert.equal(cities[cityId]?.id, cityId)
  }
})

test('contains the complete set of valid assignment roads', () => {
  assert.equal(edges.length, 23)

  const roads = new Set<string>()
  for (const edge of edges) {
    assert.ok(isCityId(edge.from), `Unknown road endpoint: ${edge.from}`)
    assert.ok(isCityId(edge.to), `Unknown road endpoint: ${edge.to}`)
    assert.notEqual(edge.from, edge.to, `Self-loop at ${edge.from}`)
    assert.ok(edge.distance > 0, `Non-positive road cost: ${edge.from}-${edge.to}`)

    const key = [edge.from, edge.to].sort().join('|')
    assert.ok(!roads.has(key), `Duplicate road: ${edge.from}-${edge.to}`)
    roads.add(key)
  }
})

test('builds symmetric adjacency for every road', () => {
  const { adjacency } = romaniaGraph

  for (const cityId of CITY_IDS) {
    assert.ok(adjacency[cityId], `Missing adjacency list for ${cityId}`)
  }

  for (const edge of edges) {
    assert.ok(
      adjacency[edge.from]?.some(
        (neighbor) => neighbor.city === edge.to && neighbor.distance === edge.distance,
      ),
      `Missing forward adjacency for ${edge.from}-${edge.to}`,
    )
    assert.ok(
      adjacency[edge.to]?.some(
        (neighbor) => neighbor.city === edge.from && neighbor.distance === edge.distance,
      ),
      `Missing reverse adjacency for ${edge.from}-${edge.to}`,
    )
  }
})

test('keeps every city connected to the Romania graph', () => {
  const visited = new Set<string>()
  const pending: string[] = [CITY_IDS[0]]

  while (pending.length > 0) {
    const cityId = pending.pop()
    if (cityId === undefined || visited.has(cityId)) continue

    visited.add(cityId)
    for (const neighbor of romaniaGraph.adjacency[cityId] ?? []) {
      if (!visited.has(neighbor.city)) pending.push(neighbor.city)
    }
  }

  assert.equal(visited.size, CITY_IDS.length)
})
