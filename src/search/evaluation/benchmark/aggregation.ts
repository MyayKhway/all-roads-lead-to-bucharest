import type { BenchmarkRecord } from '@/search/evaluation/benchmark/suite'

export interface NumericSummary {
  readonly sampleCount: number
  readonly mean: number
  readonly median: number
  readonly min: number
  readonly max: number
}

export interface VariantMetricSummaries {
  readonly nodesGenerated: NumericSummary | null
  readonly nodesExpanded: NumericSummary | null
  readonly frontierPushes: NumericSummary | null
  readonly frontierPops: NumericSummary | null
  readonly peakFrontierEntries: NumericSummary | null
  readonly closedSetEntries: NumericSummary | null
  readonly costTableEntries: NumericSummary | null
  readonly edgesExamined: NumericSummary | null
  readonly heuristicEvaluations: NumericSummary | null
  readonly estimatedBytes: NumericSummary | null
  readonly calculatedPathCost: NumericSummary | null
  readonly pathEdgeCount: NumericSummary | null
  /** Distribution of per-pair median execution times, not pooled timer samples. */
  readonly executionTimeUs: NumericSummary | null
}

export interface VariantBenchmarkSummary {
  readonly variantId: string
  readonly variantName: string
  readonly algorithmName: string
  readonly heuristicName: string | null
  readonly author: string
  readonly totalPairs: number
  readonly validPairs: number
  readonly invalidPairs: number
  readonly optimalPairs: number
  readonly suboptimalPairs: number
  readonly uncomparedPairs: number
  readonly maxCostOvershootPercentage: number | null
  readonly metrics: VariantMetricSummaries
}

export type ComparisonMetric =
  | 'calculatedPathCost'
  | 'executionTimeUs'
  | 'estimatedBytes'
  | 'nodesGenerated'
  | 'nodesExpanded'
  | 'peakFrontierEntries'
  | 'edgesExamined'

export interface VariantComparisonResult {
  readonly metric: ComparisonMetric
  readonly focusVariantId: string
  readonly comparisonVariantId: string
  readonly comparedPairs: number
  /** A win means the variant produced the lower value for this metric. */
  readonly focusWins: number
  readonly ties: number
  readonly comparisonWins: number
}

export interface BenchmarkAggregation {
  readonly focusVariantId: string
  readonly variants: readonly VariantBenchmarkSummary[]
  readonly variantComparisons: readonly VariantComparisonResult[]
}

interface VariantRecordGroup {
  readonly variantId: string
  readonly variantName: string
  readonly algorithmName: string
  readonly heuristicName: string | null
  readonly author: string
  readonly records: BenchmarkRecord[]
}

interface ComparisonMetricDefinition {
  readonly name: ComparisonMetric
  readonly value: (record: BenchmarkRecord) => number | null
}

const COMPARISON_METRICS: readonly ComparisonMetricDefinition[] = [
  {
    name: 'calculatedPathCost',
    value: (record) => record.execution.metrics.calculatedPathCost,
  },
  {
    name: 'executionTimeUs',
    value: (record) => record.timing?.medianUs ?? null,
  },
  {
    name: 'estimatedBytes',
    value: (record) => record.execution.metrics.estimatedBytes,
  },
  {
    name: 'nodesGenerated',
    value: (record) => record.execution.metrics.nodesGenerated,
  },
  {
    name: 'nodesExpanded',
    value: (record) => record.execution.metrics.nodesExpanded,
  },
  {
    name: 'peakFrontierEntries',
    value: (record) => record.execution.metrics.peakFrontierEntries,
  },
  {
    name: 'edgesExamined',
    value: (record) => record.execution.metrics.edgesExamined,
  },
]

function cityPairKey(record: BenchmarkRecord): string {
  return `${record.start}->${record.goal}`
}

function summarizeNumbers(values: readonly number[]): NumericSummary | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const minimum = sorted[0]
  const maximum = sorted[sorted.length - 1]
  if (minimum === undefined || maximum === undefined) {
    throw new Error('Cannot summarize an empty numeric sample')
  }

  const middle = Math.floor(sorted.length / 2)
  const middleValue = sorted[middle]
  if (middleValue === undefined) {
    throw new Error('Numeric sample has no middle value')
  }

  let median = middleValue
  if (sorted.length % 2 === 0) {
    const lowerMiddleValue = sorted[middle - 1]
    if (lowerMiddleValue === undefined) {
      throw new Error('Even numeric sample has no lower middle value')
    }
    median = (lowerMiddleValue + middleValue) / 2
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length

  return Object.freeze({
    sampleCount: values.length,
    mean,
    median,
    min: minimum,
    max: maximum,
  })
}

function groupRecordsByVariant(records: readonly BenchmarkRecord[]): readonly VariantRecordGroup[] {
  const groups = new Map<string, VariantRecordGroup>()

  for (const record of records) {
    const existing = groups.get(record.variantId)
    if (existing === undefined) {
      groups.set(record.variantId, {
        variantId: record.variantId,
        variantName: record.variantName,
        algorithmName: record.algorithmName,
        heuristicName: record.heuristicName,
        author: record.author,
        records: [record],
      })
      continue
    }

    if (
      existing.variantName !== record.variantName ||
      existing.algorithmName !== record.algorithmName ||
      existing.heuristicName !== record.heuristicName ||
      existing.author !== record.author
    ) {
      throw new Error(`Inconsistent metadata for search variant: ${record.variantId}`)
    }
    existing.records.push(record)
  }

  return [...groups.values()]
}

function summarizeVariantMetrics(records: readonly BenchmarkRecord[]): VariantMetricSummaries {
  // Invalid answers are counted separately and cannot earn favorable performance statistics.
  const validRecords = records.filter((record) => record.execution.metrics.resultValid)
  const metricValues = validRecords.map((record) => record.execution.metrics)

  return Object.freeze({
    nodesGenerated: summarizeNumbers(metricValues.map((metrics) => metrics.nodesGenerated)),
    nodesExpanded: summarizeNumbers(metricValues.map((metrics) => metrics.nodesExpanded)),
    frontierPushes: summarizeNumbers(metricValues.map((metrics) => metrics.frontierPushes)),
    frontierPops: summarizeNumbers(metricValues.map((metrics) => metrics.frontierPops)),
    peakFrontierEntries: summarizeNumbers(
      metricValues.map((metrics) => metrics.peakFrontierEntries),
    ),
    closedSetEntries: summarizeNumbers(metricValues.map((metrics) => metrics.closedSetEntries)),
    costTableEntries: summarizeNumbers(metricValues.map((metrics) => metrics.costTableEntries)),
    edgesExamined: summarizeNumbers(metricValues.map((metrics) => metrics.edgesExamined)),
    heuristicEvaluations: summarizeNumbers(
      metricValues.map((metrics) => metrics.heuristicEvaluations),
    ),
    estimatedBytes: summarizeNumbers(metricValues.map((metrics) => metrics.estimatedBytes)),
    calculatedPathCost: summarizeNumbers(
      metricValues.flatMap((metrics) =>
        metrics.calculatedPathCost === null ? [] : [metrics.calculatedPathCost],
      ),
    ),
    pathEdgeCount: summarizeNumbers(metricValues.map((metrics) => metrics.pathEdgeCount)),
    executionTimeUs: summarizeNumbers(
      validRecords.flatMap((record) => (record.timing === null ? [] : [record.timing.medianUs])),
    ),
  })
}

function summarizeVariant(group: VariantRecordGroup): VariantBenchmarkSummary {
  const validPairs = group.records.filter((record) => record.execution.metrics.resultValid).length
  const optimalPairs = group.records.filter((record) => record.comparison.isOptimal === true).length
  const suboptimalPairs = group.records.filter(
    (record) => record.comparison.isOptimal === false,
  ).length
  const overshootPercentages = group.records.flatMap((record) =>
    record.comparison.costOvershootPercentage === null
      ? []
      : [record.comparison.costOvershootPercentage],
  )

  return Object.freeze({
    variantId: group.variantId,
    variantName: group.variantName,
    algorithmName: group.algorithmName,
    heuristicName: group.heuristicName,
    author: group.author,
    totalPairs: group.records.length,
    validPairs,
    invalidPairs: group.records.length - validPairs,
    optimalPairs,
    suboptimalPairs,
    uncomparedPairs: group.records.length - optimalPairs - suboptimalPairs,
    maxCostOvershootPercentage:
      overshootPercentages.length === 0 ? null : Math.max(...overshootPercentages),
    metrics: summarizeVariantMetrics(group.records),
  })
}

function indexRecordsByPair(
  records: readonly BenchmarkRecord[],
): ReadonlyMap<string, ReadonlyMap<string, BenchmarkRecord>> {
  const recordsByPair = new Map<string, Map<string, BenchmarkRecord>>()

  for (const record of records) {
    const key = cityPairKey(record)
    const pairRecords = recordsByPair.get(key) ?? new Map<string, BenchmarkRecord>()
    if (pairRecords.has(record.variantId)) {
      throw new Error(`Duplicate benchmark record for ${record.variantId} on ${key}`)
    }
    pairRecords.set(record.variantId, record)
    recordsByPair.set(key, pairRecords)
  }

  return recordsByPair
}

function compareFocusWithVariant(
  focusVariantId: string,
  comparisonVariantId: string,
  metric: ComparisonMetricDefinition,
  recordsByPair: ReadonlyMap<string, ReadonlyMap<string, BenchmarkRecord>>,
): VariantComparisonResult {
  let focusWins = 0
  let ties = 0
  let comparisonWins = 0

  for (const pairRecords of recordsByPair.values()) {
    const focusRecord = pairRecords.get(focusVariantId)
    const comparisonRecord = pairRecords.get(comparisonVariantId)
    if (
      focusRecord === undefined ||
      comparisonRecord === undefined ||
      !focusRecord.execution.metrics.resultValid ||
      !comparisonRecord.execution.metrics.resultValid
    ) {
      continue
    }

    const focusValue = metric.value(focusRecord)
    const comparisonValue = metric.value(comparisonRecord)
    if (focusValue === null || comparisonValue === null) {
      continue
    }

    if (focusValue < comparisonValue) {
      focusWins += 1
    } else if (focusValue > comparisonValue) {
      comparisonWins += 1
    } else {
      ties += 1
    }
  }

  return Object.freeze({
    metric: metric.name,
    focusVariantId,
    comparisonVariantId,
    comparedPairs: focusWins + ties + comparisonWins,
    focusWins,
    ties,
    comparisonWins,
  })
}

function buildVariantComparisons(
  groups: readonly VariantRecordGroup[],
  records: readonly BenchmarkRecord[],
  focusVariantId: string,
): readonly VariantComparisonResult[] {
  const focusVariantExists = groups.some((group) => group.variantId === focusVariantId)
  if (!focusVariantExists) {
    throw new RangeError(`Focus variant is not present in benchmark records: ${focusVariantId}`)
  }

  const recordsByPair = indexRecordsByPair(records)
  const results: VariantComparisonResult[] = []

  for (const comparisonVariant of groups) {
    if (comparisonVariant.variantId === focusVariantId) {
      continue
    }

    for (const metric of COMPARISON_METRICS) {
      results.push(
        compareFocusWithVariant(focusVariantId, comparisonVariant.variantId, metric, recordsByPair),
      )
    }
  }

  return Object.freeze(results)
}

/** Summarizes raw suite records without rerunning candidates or changing their measurements. */
export function aggregateBenchmarkRecords(
  records: readonly BenchmarkRecord[],
  focusVariantId: string,
): BenchmarkAggregation {
  if (focusVariantId.trim().length === 0) {
    throw new RangeError('Focus variant ID must not be empty')
  }

  const groups = groupRecordsByVariant(records)

  return Object.freeze({
    focusVariantId,
    variants: Object.freeze(groups.map(summarizeVariant)),
    variantComparisons: buildVariantComparisons(groups, records, focusVariantId),
  })
}
