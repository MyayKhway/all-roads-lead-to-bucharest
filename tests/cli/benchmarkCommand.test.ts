import assert from 'node:assert/strict'
import test from 'node:test'

import { referenceDijkstra } from '@/benchmark/reference'
import { parseBenchmarkCommandArgs, runBenchmarkCommand } from '@/cli/benchmarkCommand'
import { romaniaGraph } from '@/data/graph'
import type { SearchVariant } from '@/search/variant'

const variants: readonly SearchVariant[] = [
  {
    id: 'dijkstra-a',
    name: 'Dijkstra A',
    algorithmName: 'Dijkstra',
    heuristicName: null,
    author: 'A',
    algorithm: referenceDijkstra,
  },
  {
    id: 'dijkstra-b',
    name: 'Dijkstra B',
    algorithmName: 'Dijkstra',
    heuristicName: null,
    author: 'B',
    algorithm: referenceDijkstra,
  },
]

test('parses benchmark selections and output options', () => {
  const options = parseBenchmarkCommandArgs([
    '--focus',
    'dijkstra-b',
    '--variants',
    'dijkstra-a,dijkstra-b',
    '--pairs',
    'arad:bucharest,oradea:eforie',
    '--format',
    'json',
    '--out',
    'results.json',
    '--no-timing',
  ])

  assert.equal(options.focusVariantId, 'dijkstra-b')
  assert.deepEqual(options.variantIds, ['dijkstra-a', 'dijkstra-b'])
  assert.equal(options.cityPairs === 'all' ? 0 : options.cityPairs.length, 2)
  assert.equal(options.format, 'json')
  assert.equal(options.outputFile, 'results.json')
  assert.equal(options.measureTiming, false)
})

test('runs selected variants through the benchmark reporting pipeline', () => {
  const options = parseBenchmarkCommandArgs([
    '--focus',
    'dijkstra-a',
    '--pairs',
    'arad:bucharest',
    '--no-timing',
  ])
  const output = runBenchmarkCommand(options, variants, romaniaGraph)

  assert.match(output, /BENCHMARK REPORT/)
  assert.match(output, /Focus variant: Dijkstra A/)
  assert.match(output, /Dijkstra B/)
})

test('supports help and registry listing without registered algorithms', () => {
  const help = runBenchmarkCommand(parseBenchmarkCommandArgs(['--help']), [], romaniaGraph)
  assert.match(help, /npm run benchmark/)
  assert.match(help, /^--format <table\|csv\|json> {2}Output format; defaults to table$/m)
  assert.equal(
    runBenchmarkCommand(parseBenchmarkCommandArgs(['--list']), [], romaniaGraph),
    'No search variants are registered.',
  )
})

test('rejects malformed benchmark arguments and an empty registry', () => {
  assert.throws(
    () => parseBenchmarkCommandArgs(['--pairs', 'arad:not-a-city']),
    /Invalid city pair/,
  )
  assert.throws(
    () => runBenchmarkCommand(parseBenchmarkCommandArgs([]), [], romaniaGraph),
    /No search variants are registered/,
  )
})
