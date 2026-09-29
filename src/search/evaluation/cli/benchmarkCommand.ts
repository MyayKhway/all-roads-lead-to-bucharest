import { isCityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import { aggregateBenchmarkRecords } from '@/search/evaluation/benchmark/aggregation'
import {
  benchmarkRecordsToCsv,
  benchmarkReportToJson,
  formatBenchmarkReport,
} from '@/search/evaluation/benchmark/report'
import { type BenchmarkCityPair, runBenchmarkSuite } from '@/search/evaluation/benchmark/suite'
import { formatVariantList } from '@/search/evaluation/cli/formatVariantList'
import { findSearchVariant, type SearchVariant } from '@/search/variant'

export type BenchmarkOutputFormat = 'table' | 'csv' | 'json'

export interface BenchmarkCommandOptions {
  readonly help: boolean
  readonly listVariants: boolean
  readonly focusVariantId: string | null
  readonly comparisonVariantIds: readonly string[]
  readonly cityPairs: readonly BenchmarkCityPair[] | 'all'
  readonly measureTiming: boolean
  readonly format: BenchmarkOutputFormat
  readonly outputFile: string | null
}

function requireValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new RangeError(`${option} requires a value`)
  }
  return value
}

function parsePair(value: string): BenchmarkCityPair {
  const [start, goal, extra] = value.split(':')
  if (start === undefined || goal === undefined || extra !== undefined || !isCityId(start)) {
    throw new RangeError(`Invalid city pair: ${value}`)
  }
  if (!isCityId(goal)) {
    throw new RangeError(`Invalid city pair: ${value}`)
  }
  if (start === goal) {
    throw new RangeError(`Benchmark pair must contain different cities: ${value}`)
  }
  return { start, goal }
}

export function parseBenchmarkCommandArgs(args: readonly string[]): BenchmarkCommandOptions {
  let help = false
  let listVariants = false
  let focusVariantId: string | null = null
  let comparisonVariantIds: readonly string[] = []
  let cityPairs: readonly BenchmarkCityPair[] | 'all' = [{ start: 'arad', goal: 'bucharest' }]
  let measureTiming = true
  let format: BenchmarkOutputFormat = 'table'
  let outputFile: string | null = null

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') {
      help = true
    } else if (argument === '--list') {
      listVariants = true
    } else if (argument === '--no-timing') {
      measureTiming = false
    } else if (argument === '--focus') {
      focusVariantId = requireValue(args, index, argument)
      index += 1
    } else if (argument === '--compare') {
      const value = requireValue(args, index, argument)
      comparisonVariantIds = value.split(',').filter((id) => id.length > 0)
      if (comparisonVariantIds.length === 0) {
        throw new RangeError('--compare requires at least one variant ID')
      }
      index += 1
    } else if (argument === '--pairs') {
      const value = requireValue(args, index, argument)
      cityPairs = value === 'all' ? 'all' : value.split(',').map(parsePair)
      index += 1
    } else if (argument === '--format') {
      const value = requireValue(args, index, argument)
      if (value !== 'table' && value !== 'csv' && value !== 'json') {
        throw new RangeError(`Unsupported benchmark format: ${value}`)
      }
      format = value
      index += 1
    } else if (argument === '--out') {
      outputFile = requireValue(args, index, argument)
      index += 1
    } else {
      throw new RangeError(`Unknown benchmark option: ${argument}`)
    }
  }

  return {
    help,
    listVariants,
    focusVariantId,
    comparisonVariantIds,
    cityPairs,
    measureTiming,
    format,
    outputFile,
  }
}

export function formatBenchmarkCommandHelp(): string {
  const options: readonly (readonly [string, string])[] = [
    ['--focus <id>', 'Variant to benchmark; defaults to the first registered variant'],
    ['--compare <id,id>', 'Other variants to compare against the focus'],
    ['--pairs <a:b,c:d|all>', 'Ordered city pairs; defaults to arad:bucharest'],
    ['--format <table|csv|json>', 'Output format; defaults to table'],
    ['--out <file>', 'Write output to a file instead of stdout'],
    ['--no-timing', 'Skip calibrated execution-time measurement'],
    ['--list', 'List registered variants'],
    ['--help', 'Show this help'],
  ]
  const optionWidth = Math.max(...options.map(([option]) => option.length))

  return [
    'Usage: npm run benchmark -- [options]',
    '',
    ...options.map(([option, description]) => `${option.padEnd(optionWidth)}  ${description}`),
  ].join('\n')
}

function createAllPairs(graph: WeightedGraph): readonly BenchmarkCityPair[] {
  return graph.cityIds.flatMap((start) =>
    graph.cityIds.flatMap((goal) => (start === goal ? [] : [{ start, goal }])),
  )
}

/** Runs the benchmark command without performing terminal or file I/O. */
export function runBenchmarkCommand(
  options: BenchmarkCommandOptions,
  registeredVariants: readonly SearchVariant[],
  graph: WeightedGraph,
): string {
  if (options.help) {
    return formatBenchmarkCommandHelp()
  }
  if (options.listVariants) {
    return formatVariantList(registeredVariants)
  }
  if (registeredVariants.length === 0) {
    throw new RangeError('No search variants are registered; add a variant before benchmarking')
  }

  const defaultFocusVariant = registeredVariants[0]
  if (defaultFocusVariant === undefined) {
    throw new RangeError('No search variants are registered; add a variant before benchmarking')
  }
  const focusVariant =
    options.focusVariantId === null
      ? defaultFocusVariant
      : findSearchVariant(registeredVariants, options.focusVariantId)
  const uniqueComparisonIds = new Set(options.comparisonVariantIds)
  if (uniqueComparisonIds.size !== options.comparisonVariantIds.length) {
    throw new RangeError('--compare contains duplicate variant IDs')
  }
  if (uniqueComparisonIds.has(focusVariant.id)) {
    throw new RangeError(`Focus variant must not be included in --compare: ${focusVariant.id}`)
  }
  const comparisonVariants = options.comparisonVariantIds.map((id) =>
    findSearchVariant(registeredVariants, id),
  )
  const variants = [focusVariant, ...comparisonVariants]
  const focusVariantId = focusVariant.id

  const requestedPairs = options.cityPairs === 'all' ? createAllPairs(graph) : options.cityPairs
  const cityPairs = requestedPairs.map((pair) => ({
    ...pair,
    measureTiming: options.measureTiming,
  }))
  const records = runBenchmarkSuite({ graph, variants, cityPairs })
  const report = {
    records,
    aggregation: aggregateBenchmarkRecords(records, focusVariantId),
  }

  if (options.format === 'csv') {
    return benchmarkRecordsToCsv(records)
  }
  if (options.format === 'json') {
    return benchmarkReportToJson(report)
  }
  return formatBenchmarkReport(report)
}
