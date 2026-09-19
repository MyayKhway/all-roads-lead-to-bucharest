import type {
  BenchmarkAggregation,
  ComparisonMetric,
  NumericSummary,
  VariantBenchmarkSummary,
} from '@/search/evaluation/benchmark/aggregation'
import type { BenchmarkRecord } from '@/search/evaluation/benchmark/suite'

export interface BenchmarkReportData {
  readonly records: readonly BenchmarkRecord[]
  readonly aggregation: BenchmarkAggregation
}

interface PerformanceMetricDefinition {
  readonly label: string
  readonly summary: (variant: VariantBenchmarkSummary) => NumericSummary | null
}

/** A null row renders a visual separator between related groups. */
type TableRow = readonly string[] | null

const PERFORMANCE_METRICS: readonly PerformanceMetricDefinition[] = [
  {
    label: 'Execution time (us)',
    summary: (variant) => variant.metrics.executionTimeUs,
  },
  {
    label: 'Estimated memory (B)',
    summary: (variant) => variant.metrics.estimatedBytes,
  },
  {
    label: 'Nodes generated',
    summary: (variant) => variant.metrics.nodesGenerated,
  },
  {
    label: 'Nodes expanded',
    summary: (variant) => variant.metrics.nodesExpanded,
  },
  {
    label: 'Peak frontier entries',
    summary: (variant) => variant.metrics.peakFrontierEntries,
  },
  {
    label: 'Edges examined',
    summary: (variant) => variant.metrics.edgesExamined,
  },
]

const COMPARISON_METRIC_LABELS: Readonly<Record<ComparisonMetric, string>> = {
  calculatedPathCost: 'Path cost',
  executionTimeUs: 'Execution time',
  estimatedBytes: 'Estimated memory',
  nodesGenerated: 'Nodes generated',
  nodesExpanded: 'Nodes expanded',
  peakFrontierEntries: 'Peak frontier entries',
  edgesExamined: 'Edges examined',
}

const CSV_HEADERS = [
  'variant_id',
  'variant_name',
  'algorithm_name',
  'heuristic_name',
  'author',
  'start',
  'goal',
  'result_status',
  'result_valid',
  'validation_issues',
  'path',
  'reported_path_cost',
  'calculated_path_cost',
  'reference_path_cost',
  'optimal',
  'cost_overshoot',
  'cost_overshoot_percentage',
  'path_edge_count',
  'nodes_generated',
  'nodes_expanded',
  'frontier_pushes',
  'frontier_pops',
  'peak_frontier_entries',
  'closed_set_entries',
  'cost_table_entries',
  'edges_examined',
  'heuristic_evaluations',
  'custom_counts',
  'estimated_bytes',
  'median_us',
  'p25_us',
  'p75_us',
  'min_us',
  'mean_us',
  'std_dev_us',
  'iterations',
  'trials',
] as const

function formatNumber(value: number | null, maximumFractionDigits = 3): string {
  if (value === null) {
    return 'N/A'
  }
  if (Number.isInteger(value)) {
    return String(value)
  }
  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, '')
}

function formatPercentage(value: number | null): string {
  return value === null ? 'N/A' : `${formatNumber(value, 2)}%`
}

function renderTable(headers: readonly string[], rows: readonly TableRow[]): string {
  const widths = headers.map((header, columnIndex) => {
    let width = header.length
    for (const row of rows) {
      if (row === null) {
        continue
      }
      width = Math.max(width, row[columnIndex]?.length ?? 0)
    }
    return width
  })

  const renderRow = (row: readonly string[]): string =>
    headers
      .map((_, columnIndex) => (row[columnIndex] ?? '').padEnd(widths[columnIndex] ?? 0))
      .join('  ')
      .trimEnd()
  const separator = widths.map((width) => '-'.repeat(width)).join('  ')

  return [
    renderRow(headers),
    separator,
    ...rows.map((row) => (row === null ? separator : renderRow(row))),
  ].join('\n')
}

function requireVariant(
  aggregation: BenchmarkAggregation,
  variantId: string,
): VariantBenchmarkSummary {
  const variant = aggregation.variants.find((candidate) => candidate.variantId === variantId)
  if (variant === undefined) {
    throw new Error(`Report is missing variant metadata for: ${variantId}`)
  }
  return variant
}

function formatVariantResults(aggregation: BenchmarkAggregation): string {
  const rows = aggregation.variants.map((variant) => [
    variant.variantName,
    variant.algorithmName,
    variant.heuristicName ?? 'None',
    variant.author,
    String(variant.totalPairs),
    String(variant.validPairs),
    String(variant.invalidPairs),
    String(variant.optimalPairs),
    String(variant.suboptimalPairs),
    String(variant.uncomparedPairs),
    formatPercentage(variant.maxCostOvershootPercentage),
  ])

  return renderTable(
    [
      'Variant',
      'Algorithm',
      'Heuristic',
      'Author',
      'Pairs',
      'Valid',
      'Invalid',
      'Optimal',
      'Suboptimal',
      'Uncompared',
      'Max Overshoot',
    ],
    rows,
  )
}

function formatPerformanceSummary(aggregation: BenchmarkAggregation): string {
  const rows: TableRow[] = []

  aggregation.variants.forEach((variant, variantIndex) => {
    if (variantIndex > 0) {
      rows.push(null)
    }

    PERFORMANCE_METRICS.forEach((metric, metricIndex) => {
      const summary = metric.summary(variant)
      rows.push([
        metricIndex === 0 ? variant.variantName : '',
        metric.label,
        String(summary?.sampleCount ?? 0),
        formatNumber(summary?.mean ?? null),
        formatNumber(summary?.median ?? null),
        formatNumber(summary?.min ?? null),
        formatNumber(summary?.max ?? null),
      ])
    })
  })

  return renderTable(['Variant', 'Metric', 'Pair Samples', 'Mean', 'Median', 'Min', 'Max'], rows)
}

function formatFocusComparisons(aggregation: BenchmarkAggregation): string {
  const focus = requireVariant(aggregation, aggregation.focusVariantId)
  const alternatives = aggregation.variants.filter(
    (variant) => variant.variantId !== aggregation.focusVariantId,
  )
  const rows: TableRow[] = []

  alternatives.forEach((alternative, alternativeIndex) => {
    const comparisons = aggregation.variantComparisons.filter(
      (comparison) => comparison.comparisonVariantId === alternative.variantId,
    )
    if (comparisons.length === 0) {
      return
    }
    if (alternativeIndex > 0) {
      rows.push(null)
    }

    comparisons.forEach((comparison, comparisonIndex) => {
      const winner =
        comparison.comparedPairs === 0
          ? 'Not compared'
          : comparison.focusWins > comparison.comparisonWins
            ? focus.variantName
            : comparison.comparisonWins > comparison.focusWins
              ? alternative.variantName
              : 'Tie'

      rows.push([
        comparisonIndex === 0 ? focus.variantName : '',
        comparisonIndex === 0 ? alternative.variantName : '',
        COMPARISON_METRIC_LABELS[comparison.metric],
        String(comparison.comparedPairs),
        String(comparison.focusWins),
        String(comparison.ties),
        String(comparison.comparisonWins),
        winner,
      ])
    })
  })

  if (rows.length === 0) {
    return 'No comparison variants were selected.'
  }

  return renderTable(
    [
      'Focus Variant',
      'Alternative',
      'Metric',
      'Compared',
      'Focus Wins',
      'Ties',
      'Alternative Wins',
      'Winner',
    ],
    rows,
  )
}

function formatWarnings(aggregation: BenchmarkAggregation): string {
  const warnings: string[] = []

  for (const variant of aggregation.variants) {
    if (variant.invalidPairs > 0) {
      warnings.push(
        `- ${variant.variantName} returned ${variant.invalidPairs} invalid result(s); those pairs were excluded from performance comparisons.`,
      )
    }
    if (variant.suboptimalPairs > 0) {
      warnings.push(
        `- ${variant.variantName} returned ${variant.suboptimalPairs} valid but suboptimal result(s); maximum overshoot was ${formatPercentage(variant.maxCostOvershootPercentage)}.`,
      )
    }
  }

  return warnings.length === 0 ? 'None.' : warnings.join('\n')
}

function formatTimingMethodology(records: readonly BenchmarkRecord[]): string {
  const timedRecords = records.filter((record) => record.timing !== null)
  const timedPairs = new Set(timedRecords.map((record) => `${record.start}->${record.goal}`)).size
  const trialCounts = [...new Set(timedRecords.map((record) => record.timing?.trials))].filter(
    (trials): trials is number => trials !== undefined,
  )
  const trialsDescription =
    trialCounts.length === 0
      ? 'N/A'
      : trialCounts.length === 1
        ? String(trialCounts[0])
        : trialCounts.join(', ')

  return [
    `Timed city pairs: ${timedPairs}`,
    `Trials per timed record: ${trialsDescription}`,
    'Iterations per trial: auto-calibrated for each variant and pair',
    "Cross-pair execution summaries and comparisons use each pair's median time.",
    'Per-pair P25, P75, mean, minimum, and standard deviation are available in CSV and JSON.',
  ].join('\n')
}

/** Formats a concise, human-readable benchmark report without performing file I/O. */
export function formatBenchmarkReport({ records, aggregation }: BenchmarkReportData): string {
  const focus = requireVariant(aggregation, aggregation.focusVariantId)

  return [
    'BENCHMARK REPORT',
    '',
    `Focus variant: ${focus.variantName}`,
    `Algorithm: ${focus.algorithmName}`,
    `Heuristic: ${focus.heuristicName ?? 'None'}`,
    `Author: ${focus.author}`,
    '',
    'VARIANT RESULTS',
    '',
    formatVariantResults(aggregation),
    '',
    'PERFORMANCE SUMMARY',
    '',
    formatPerformanceSummary(aggregation),
    '',
    'FOCUS COMPARISONS',
    '',
    formatFocusComparisons(aggregation),
    '',
    'WARNINGS',
    '',
    formatWarnings(aggregation),
    '',
    'TIMING METHODOLOGY',
    '',
    formatTimingMethodology(records),
  ].join('\n')
}

function csvValue(value: string | number | boolean | null): string {
  if (value === null) {
    return ''
  }

  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function recordToCsvRow(record: BenchmarkRecord): readonly (string | number | boolean | null)[] {
  const { metrics } = record.execution
  const result = record.execution.result
  const validationIssues =
    record.execution.validation.status === 'invalid'
      ? record.execution.validation.issues.map((issue) => issue.code).join('|')
      : ''

  return [
    record.variantId,
    record.variantName,
    record.algorithmName,
    record.heuristicName,
    record.author,
    record.start,
    record.goal,
    result.status,
    metrics.resultValid,
    validationIssues,
    result.status === 'success' ? result.path.join(' -> ') : '',
    result.status === 'success' ? result.pathCost : null,
    metrics.calculatedPathCost,
    record.comparison.referencePathCost,
    record.comparison.isOptimal,
    record.comparison.costOvershoot,
    record.comparison.costOvershootPercentage,
    metrics.pathEdgeCount,
    metrics.nodesGenerated,
    metrics.nodesExpanded,
    metrics.frontierPushes,
    metrics.frontierPops,
    metrics.peakFrontierEntries,
    metrics.closedSetEntries,
    metrics.costTableEntries,
    metrics.edgesExamined,
    metrics.heuristicEvaluations,
    JSON.stringify(metrics.customCounts),
    metrics.estimatedBytes,
    record.timing?.medianUs ?? null,
    record.timing?.p25Us ?? null,
    record.timing?.p75Us ?? null,
    record.timing?.minUs ?? null,
    record.timing?.meanUs ?? null,
    record.timing?.stdDevUs ?? null,
    record.timing?.iterations ?? null,
    record.timing?.trials ?? null,
  ]
}

/** Flattens raw per-pair records into CSV while preserving detailed timing statistics. */
export function benchmarkRecordsToCsv(records: readonly BenchmarkRecord[]): string {
  const rows = records.map((record) => recordToCsvRow(record).map(csvValue).join(','))
  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

/** Serializes both raw evidence and derived comparisons without losing numeric precision. */
export function benchmarkReportToJson(report: BenchmarkReportData): string {
  return JSON.stringify(report, null, 2)
}
