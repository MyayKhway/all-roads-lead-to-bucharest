import assert from 'node:assert/strict'
import test from 'node:test'

import { aggregateBenchmarkRecords } from '@/benchmark/aggregation'
import { referenceDijkstra } from '@/benchmark/reference'
import {
  type BenchmarkReportData,
  benchmarkRecordsToCsv,
  benchmarkReportToJson,
  formatBenchmarkReport,
} from '@/benchmark/report'
import { type BenchmarkRecord, runBenchmarkSuite } from '@/benchmark/suite'
import { romaniaGraph } from '@/data/graph'
import type { SearchAlgorithm } from '@/search/contracts'
import type { SearchVariant } from '@/search/registry'

const shortestPathAlgorithm: SearchAlgorithm = (problem) => referenceDijkstra(problem, {})
const invalidAlgorithm: SearchAlgorithm = () => ({
  status: 'success',
  path: ['arad', 'zerind'],
  pathCost: 75,
})

const VARIANTS: readonly SearchVariant[] = [
  {
    id: 'focus',
    name: 'Magnetic, "Prime"',
    algorithmName: 'A*',
    heuristicName: 'Magnetic',
    author: 'Tony, Team A',
    algorithm: shortestPathAlgorithm,
    heuristic: () => 0,
  },
  {
    id: 'alt',
    name: 'ALT baseline',
    algorithmName: 'A*',
    heuristicName: 'ALT',
    author: 'Person 2',
    algorithm: shortestPathAlgorithm,
    heuristic: () => 0,
  },
  {
    id: 'invalid',
    name: 'Broken experiment',
    algorithmName: 'Greedy best-first',
    heuristicName: null,
    author: 'Person 3',
    algorithm: invalidAlgorithm,
  },
]

function createReportData(): BenchmarkReportData {
  const records = runBenchmarkSuite({
    graph: romaniaGraph,
    variants: VARIANTS,
    cityPairs: [{ start: 'arad', goal: 'bucharest' }],
  })
  const timedRecords: readonly BenchmarkRecord[] = records.map((record) =>
    record.variantId === 'focus'
      ? {
          ...record,
          timing: {
            medianUs: 12,
            p25Us: 11,
            p75Us: 13,
            minUs: 10,
            meanUs: 12.2,
            stdDevUs: 1.1,
            iterations: 2_048,
            trials: 30,
          },
        }
      : record,
  )

  return {
    records: timedRecords,
    aggregation: aggregateBenchmarkRecords(timedRecords, 'focus'),
  }
}

test('formats the three human-readable benchmark tables', () => {
  const output = formatBenchmarkReport(createReportData())

  assert.match(output, /VARIANT RESULTS/)
  assert.match(output, /PERFORMANCE SUMMARY/)
  assert.match(output, /Pair Samples/)
  assert.match(output, /FOCUS COMPARISONS/)
  assert.match(output, /Magnetic, "Prime"/)
  assert.match(output, /ALT baseline/)
})

test('groups repeated variant metrics and identifies both comparison sides', () => {
  const output = formatBenchmarkReport(createReportData())
  const performanceSection = output.split('PERFORMANCE SUMMARY')[1]?.split('FOCUS COMPARISONS')[0]
  const comparisonSection = output.split('FOCUS COMPARISONS')[1]?.split('WARNINGS')[0]

  assert.equal(performanceSection?.match(/Magnetic, "Prime"/g)?.length, 1)
  assert.equal(performanceSection?.match(/ALT baseline/g)?.length, 1)
  assert.equal(performanceSection?.match(/Broken experiment/g)?.length, 1)
  assert.match(comparisonSection ?? '', /Focus Variant/)
  assert.match(comparisonSection ?? '', /Magnetic, "Prime"/)
  assert.match(comparisonSection ?? '', /ALT baseline/)
})

test('names the head-to-head winner for each comparison metric', () => {
  const report = createReportData()
  const variantComparisons = report.aggregation.variantComparisons.map((comparison) => {
    if (comparison.comparisonVariantId !== 'alt') {
      return comparison
    }
    if (comparison.metric === 'nodesGenerated') {
      return { ...comparison, comparedPairs: 1, focusWins: 1, ties: 0, comparisonWins: 0 }
    }
    if (comparison.metric === 'edgesExamined') {
      return { ...comparison, comparedPairs: 1, focusWins: 0, ties: 0, comparisonWins: 1 }
    }
    return comparison
  })
  const output = formatBenchmarkReport({
    records: report.records,
    aggregation: { ...report.aggregation, variantComparisons },
  })

  assert.match(output, /Nodes generated\s+1\s+1\s+0\s+0\s+Magnetic, "Prime"/)
  assert.match(output, /Edges examined\s+1\s+0\s+0\s+1\s+ALT baseline/)
  assert.match(output, /Not compared/)
})

test('reports invalid results and timing methodology', () => {
  const output = formatBenchmarkReport(createReportData())

  assert.match(output, /Broken experiment returned 1 invalid result/)
  assert.match(output, /Timed city pairs: 1/)
  assert.match(output, /Trials per timed record: 30/)
  assert.match(output, /Per-pair P25, P75/)
})

test('writes one escaped CSV row per raw benchmark record', () => {
  const { records } = createReportData()
  const csv = benchmarkRecordsToCsv(records)
  const lines = csv.split('\n')

  assert.equal(lines.length, records.length + 1)
  assert.match(lines[0] ?? '', /variant_id/)
  assert.match(lines[0] ?? '', /p25_us/)
  assert.match(csv, /"Magnetic, ""Prime"""/)
  assert.match(csv, /"Tony, Team A"/)
  assert.match(csv, /,2048,30/)
})

test('serializes raw and aggregated data as parseable JSON', () => {
  const report = createReportData()
  const parsed = JSON.parse(benchmarkReportToJson(report)) as {
    records: unknown[]
    aggregation: { focusVariantId: string; variantComparisons: unknown[] }
  }

  assert.equal(parsed.records.length, report.records.length)
  assert.equal(parsed.aggregation.focusVariantId, 'focus')
  assert.equal(parsed.aggregation.variantComparisons.length, 14)
})

test('does not mutate report data while formatting it', () => {
  const report = createReportData()
  const before = JSON.stringify(report)

  formatBenchmarkReport(report)
  benchmarkRecordsToCsv(report.records)
  benchmarkReportToJson(report)

  assert.equal(JSON.stringify(report), before)
})
