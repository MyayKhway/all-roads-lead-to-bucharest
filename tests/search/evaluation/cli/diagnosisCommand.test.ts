import assert from 'node:assert/strict'
import test from 'node:test'

import { romaniaGraph } from '@/data/graph'
import {
  parseDiagnosisCommandArgs,
  runDiagnosisCommand,
} from '@/search/evaluation/cli/diagnosisCommand'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'
import type { SearchVariant } from '@/search/variant'

const variant: SearchVariant = {
  id: 'dijkstra',
  name: 'Dijkstra baseline',
  algorithmName: 'Dijkstra',
  heuristicName: null,
  author: 'Test',
  algorithm: referenceDijkstra,
}

test('parses and runs a single diagnosis selection', () => {
  const options = parseDiagnosisCommandArgs([
    '--variant',
    'dijkstra',
    '--start',
    'oradea',
    '--goal',
    'eforie',
  ])
  const output = runDiagnosisCommand(options, [variant], romaniaGraph)

  assert.equal(options.start, 'oradea')
  assert.equal(options.goal, 'eforie')
  assert.match(output, /SEARCH DIAGNOSIS/)
  assert.match(output, /Problem: oradea -> eforie/)
  assert.match(output, /Validation: valid/)
  assert.match(output, /Reference path cost:/)
  assert.match(output, /Recorded events:/)
})

test('supports diagnosis help and registry listing', () => {
  assert.match(
    runDiagnosisCommand(parseDiagnosisCommandArgs(['--help']), [], romaniaGraph),
    /npm run diagnosis/,
  )
  assert.match(
    runDiagnosisCommand(parseDiagnosisCommandArgs(['--list']), [variant], romaniaGraph),
    /dijkstra: Dijkstra baseline/,
  )
})

test('rejects unknown cities, variants, and an empty registry', () => {
  assert.throws(() => parseDiagnosisCommandArgs(['--start', 'not-a-city']), /unknown city/)
  assert.throws(
    () =>
      runDiagnosisCommand(
        parseDiagnosisCommandArgs(['--variant', 'missing']),
        [variant],
        romaniaGraph,
      ),
    /Unknown search variant/,
  )
  assert.throws(
    () => runDiagnosisCommand(parseDiagnosisCommandArgs([]), [], romaniaGraph),
    /No search variants are registered/,
  )
})
