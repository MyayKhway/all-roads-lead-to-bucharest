import assert from 'node:assert/strict'
import test from 'node:test'

import { aggregateBenchmarkRecords, type ComparisonMetric } from '@/benchmark/aggregation'
import type { BenchmarkRecord } from '@/benchmark/suite'
import type { CityId } from '@/data/cityIds'

interface RecordOptions {
  readonly variantId: string
  readonly start: CityId
  readonly goal: CityId
  readonly nodesGenerated: number
  readonly nodesExpanded: number
  readonly estimatedBytes: number
  readonly calculatedPathCost?: number | null
  readonly medianUs?: number | null
  readonly resultValid?: boolean
  readonly isOptimal?: boolean | null
  readonly costOvershootPercentage?: number | null
}

function createRecord(options: RecordOptions): BenchmarkRecord {
  const resultValid = options.resultValid ?? true
  const calculatedPathCost =
    options.calculatedPathCost === undefined ? 100 : options.calculatedPathCost
  const isOptimal = options.isOptimal === undefined ? true : options.isOptimal
  const costOvershootPercentage =
    options.costOvershootPercentage === undefined ? 0 : options.costOvershootPercentage

  return {
    variantId: options.variantId,
    variantName: `${options.variantId} variant`,
    algorithmName: `${options.variantId} algorithm`,
    heuristicName: null,
    author: `${options.variantId} author`,
    start: options.start,
    goal: options.goal,
    execution: {
      result: {
        status: 'success',
        path: [options.start, options.goal],
        pathCost: calculatedPathCost ?? 0,
      },
      validation: resultValid
        ? { status: 'valid', calculatedPathCost }
        : { status: 'invalid', calculatedPathCost, issues: [] },
      probeSnapshot: {
        nodesGenerated: options.nodesGenerated,
        nodesExpanded: options.nodesExpanded,
        frontierPushes: options.nodesGenerated,
        frontierPops: options.nodesExpanded,
        peakFrontierEntries: options.nodesGenerated,
        closedSetEntries: options.nodesExpanded,
        costTableEntries: options.nodesGenerated,
        edgesExamined: options.nodesGenerated * 2,
        heuristicEvaluations: 0,
        customCounts: {},
      },
      metrics: {
        nodesGenerated: options.nodesGenerated,
        nodesExpanded: options.nodesExpanded,
        frontierPushes: options.nodesGenerated,
        frontierPops: options.nodesExpanded,
        peakFrontierEntries: options.nodesGenerated,
        closedSetEntries: options.nodesExpanded,
        costTableEntries: options.nodesGenerated,
        edgesExamined: options.nodesGenerated * 2,
        heuristicEvaluations: 0,
        customCounts: {},
        estimatedBytes: options.estimatedBytes,
        goalReached: resultValid,
        calculatedPathCost,
        pathEdgeCount: 1,
        resultValid,
      },
    },
    comparison: {
      referencePathCost: 100,
      isOptimal,
      costOvershoot: isOptimal === null ? null : (calculatedPathCost ?? 100) - 100,
      costOvershootPercentage,
    },
    timing:
      options.medianUs === undefined || options.medianUs === null
        ? null
        : {
            medianUs: options.medianUs,
            p25Us: options.medianUs,
            p75Us: options.medianUs,
            minUs: options.medianUs,
            meanUs: options.medianUs,
            stdDevUs: 0,
            iterations: 1,
            trials: 1,
          },
  }
}

function findVariantComparison(records: readonly BenchmarkRecord[], metric: ComparisonMetric) {
  return aggregateBenchmarkRecords(records, 'alpha').variantComparisons.find(
    (result) => result.metric === metric,
  )
}

const ALPHA_ARAD = createRecord({
  variantId: 'alpha',
  start: 'arad',
  goal: 'bucharest',
  nodesGenerated: 2,
  nodesExpanded: 1,
  estimatedBytes: 100,
  medianUs: 10,
})

const RECORDS: readonly BenchmarkRecord[] = [
  ALPHA_ARAD,
  createRecord({
    variantId: 'beta',
    start: 'arad',
    goal: 'bucharest',
    nodesGenerated: 4,
    nodesExpanded: 2,
    estimatedBytes: 200,
    medianUs: 20,
  }),
  createRecord({
    variantId: 'alpha',
    start: 'sibiu',
    goal: 'bucharest',
    nodesGenerated: 6,
    nodesExpanded: 3,
    estimatedBytes: 300,
    calculatedPathCost: 110,
    medianUs: 30,
    isOptimal: false,
    costOvershootPercentage: 10,
  }),
  createRecord({
    variantId: 'beta',
    start: 'sibiu',
    goal: 'bucharest',
    nodesGenerated: 6,
    nodesExpanded: 4,
    estimatedBytes: 250,
    calculatedPathCost: 100,
    medianUs: null,
  }),
]

test('summarizes each variant across valid city pairs', () => {
  const aggregation = aggregateBenchmarkRecords(RECORDS, 'alpha')
  const alpha = aggregation.variants.find((variant) => variant.variantId === 'alpha')
  assert.ok(alpha !== undefined)

  assert.equal(aggregation.focusVariantId, 'alpha')
  assert.equal(alpha.totalPairs, 2)
  assert.equal(alpha.validPairs, 2)
  assert.equal(alpha.invalidPairs, 0)
  assert.equal(alpha.optimalPairs, 1)
  assert.equal(alpha.suboptimalPairs, 1)
  assert.equal(alpha.uncomparedPairs, 0)
  assert.equal(alpha.maxCostOvershootPercentage, 10)
  assert.deepEqual(alpha.metrics.nodesGenerated, {
    sampleCount: 2,
    mean: 4,
    median: 4,
    min: 2,
    max: 6,
  })
  assert.deepEqual(alpha.metrics.executionTimeUs, {
    sampleCount: 2,
    mean: 20,
    median: 20,
    min: 10,
    max: 30,
  })
})

test('compares the focus variant with another variant on matching city pairs', () => {
  assert.deepEqual(findVariantComparison(RECORDS, 'nodesGenerated'), {
    metric: 'nodesGenerated',
    focusVariantId: 'alpha',
    comparisonVariantId: 'beta',
    comparedPairs: 2,
    focusWins: 1,
    ties: 1,
    comparisonWins: 0,
  })
  assert.deepEqual(findVariantComparison(RECORDS, 'executionTimeUs'), {
    metric: 'executionTimeUs',
    focusVariantId: 'alpha',
    comparisonVariantId: 'beta',
    comparedPairs: 1,
    focusWins: 1,
    ties: 0,
    comparisonWins: 0,
  })
  assert.deepEqual(findVariantComparison(RECORDS, 'calculatedPathCost'), {
    metric: 'calculatedPathCost',
    focusVariantId: 'alpha',
    comparisonVariantId: 'beta',
    comparedPairs: 2,
    focusWins: 0,
    ties: 1,
    comparisonWins: 1,
  })
})

test('compares only the focus variant against each alternative', () => {
  const gammaRecord = createRecord({
    variantId: 'gamma',
    start: 'arad',
    goal: 'bucharest',
    nodesGenerated: 3,
    nodesExpanded: 2,
    estimatedBytes: 150,
  })
  const aggregation = aggregateBenchmarkRecords([...RECORDS, gammaRecord], 'alpha')

  assert.equal(aggregation.variantComparisons.length, 14)
  assert.ok(
    aggregation.variantComparisons.every((comparison) => comparison.focusVariantId === 'alpha'),
  )
  assert.deepEqual(
    new Set(aggregation.variantComparisons.map((comparison) => comparison.comparisonVariantId)),
    new Set(['beta', 'gamma']),
  )
})

test('counts invalid results but excludes their metric values', () => {
  const invalidRecord = createRecord({
    variantId: 'invalid',
    start: 'arad',
    goal: 'bucharest',
    nodesGenerated: 0,
    nodesExpanded: 0,
    estimatedBytes: 0,
    resultValid: false,
    isOptimal: null,
    costOvershootPercentage: null,
  })
  const aggregation = aggregateBenchmarkRecords([invalidRecord, ALPHA_ARAD], 'invalid')
  const invalid = aggregation.variants.find((variant) => variant.variantId === 'invalid')
  assert.ok(invalid !== undefined)

  assert.equal(invalid.validPairs, 0)
  assert.equal(invalid.invalidPairs, 1)
  assert.equal(invalid.uncomparedPairs, 1)
  assert.equal(invalid.metrics.nodesGenerated, null)

  const comparison = aggregation.variantComparisons.find(
    (result) => result.metric === 'nodesGenerated',
  )
  assert.equal(comparison?.comparedPairs, 0)
})

test('rejects duplicate variant records for the same ordered city pair', () => {
  const duplicate = createRecord({
    variantId: 'alpha',
    start: 'arad',
    goal: 'bucharest',
    nodesGenerated: 3,
    nodesExpanded: 2,
    estimatedBytes: 120,
  })

  assert.throws(() => aggregateBenchmarkRecords([ALPHA_ARAD, duplicate], 'alpha'), {
    message: 'Duplicate benchmark record for alpha on arad->bucharest',
  })
})

test('rejects a focus variant that is absent from the records', () => {
  assert.throws(() => aggregateBenchmarkRecords(RECORDS, 'missing'), {
    message: 'Focus variant is not present in benchmark records: missing',
  })
})

test('rejects an empty focus variant ID', () => {
  assert.throws(() => aggregateBenchmarkRecords(RECORDS, '  '), {
    message: 'Focus variant ID must not be empty',
  })
})

test('rejects inconsistent metadata for the same variant ID', () => {
  const inconsistentRecord: BenchmarkRecord = {
    ...ALPHA_ARAD,
    start: 'sibiu',
    author: 'Different author',
  }

  assert.throws(() => aggregateBenchmarkRecords([ALPHA_ARAD, inconsistentRecord], 'alpha'), {
    message: 'Inconsistent metadata for search variant: alpha',
  })
})
