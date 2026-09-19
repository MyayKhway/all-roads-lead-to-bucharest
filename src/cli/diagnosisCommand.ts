import { formatVariantList } from '@/cli/formatVariantList'
import type { CityId } from '@/data/cityIds'
import { isCityId } from '@/data/cityIds'
import type { WeightedGraph } from '@/data/graph'
import { diagnoseSearch, type SearchDiagnosis } from '@/diagnosis/diagnoseSearch'
import { findSearchVariant, type SearchVariant } from '@/search/variant'

export interface DiagnosisCommandOptions {
  readonly help: boolean
  readonly listVariants: boolean
  readonly variantId: string | null
  readonly start: CityId
  readonly goal: CityId
}

function requireValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new RangeError(`${option} requires a value`)
  }
  return value
}

function requireCity(value: string, option: string): CityId {
  if (!isCityId(value)) {
    throw new RangeError(`${option} contains an unknown city: ${value}`)
  }
  return value
}

export function parseDiagnosisCommandArgs(args: readonly string[]): DiagnosisCommandOptions {
  let help = false
  let listVariants = false
  let variantId: string | null = null
  let start: CityId = 'arad'
  let goal: CityId = 'bucharest'

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') {
      help = true
    } else if (argument === '--list') {
      listVariants = true
    } else if (argument === '--variant') {
      variantId = requireValue(args, index, argument)
      index += 1
    } else if (argument === '--start') {
      start = requireCity(requireValue(args, index, argument), argument)
      index += 1
    } else if (argument === '--goal') {
      goal = requireCity(requireValue(args, index, argument), argument)
      index += 1
    } else {
      throw new RangeError(`Unknown diagnosis option: ${argument}`)
    }
  }

  return { help, listVariants, variantId, start, goal }
}

export function formatDiagnosisCommandHelp(): string {
  return [
    'Usage: npm run diagnosis -- [options]',
    '',
    '--variant <id>    Variant to diagnose; defaults to the first registered variant',
    '--start <city>    Start city; defaults to arad',
    '--goal <city>     Goal city; defaults to bucharest',
    '--list            List registered variants',
    '--help            Show this help',
  ].join('\n')
}

function formatValue(value: number | null): string {
  return value === null ? 'N/A' : String(value)
}

/** Formats one diagnostic run for an author inspecting correctness and search behavior. */
function formatDiagnosisOutput(diagnosis: SearchDiagnosis): string {
  const { result, metrics, validation } = diagnosis.execution
  const resultLines =
    result.status === 'success'
      ? [`Path: ${result.path.join(' -> ')}`, `Reported path cost: ${result.pathCost}`]
      : [`Failure reason: ${result.reason}`]
  const issueLines =
    validation.status === 'valid'
      ? ['Validation issues: None']
      : [
          `Validation issues: ${validation.issues.length}`,
          ...validation.issues.map((issue) => `- ${issue.code}: ${issue.message}`),
        ]

  return [
    'SEARCH DIAGNOSIS',
    '',
    `Variant: ${diagnosis.variantName}`,
    `Algorithm: ${diagnosis.algorithmName}`,
    `Heuristic: ${diagnosis.heuristicName ?? 'None'}`,
    `Author: ${diagnosis.author}`,
    `Problem: ${diagnosis.problem.start} -> ${diagnosis.problem.goal}`,
    '',
    'RESULT',
    '',
    `Status: ${result.status}`,
    ...resultLines,
    `Validation: ${validation.status}`,
    ...issueLines,
    `Reference path cost: ${formatValue(diagnosis.comparison.referencePathCost)}`,
    `Optimal: ${diagnosis.comparison.isOptimal === null ? 'N/A' : String(diagnosis.comparison.isOptimal)}`,
    `Cost overshoot: ${formatValue(diagnosis.comparison.costOvershoot)}`,
    '',
    'SEARCH WORK',
    '',
    `Nodes generated: ${metrics.nodesGenerated}`,
    `Nodes expanded: ${metrics.nodesExpanded}`,
    `Peak frontier entries: ${metrics.peakFrontierEntries}`,
    `Edges examined: ${metrics.edgesExamined}`,
    `Heuristic evaluations: ${metrics.heuristicEvaluations}`,
    `Estimated structural memory: ${metrics.estimatedBytes} B`,
    '',
    'EVENTS',
    '',
    `Recorded events: ${diagnosis.events.length}`,
    ...diagnosis.events.map((event, index) => `${index + 1}. ${JSON.stringify(event)}`),
  ].join('\n')
}

/** Runs the diagnosis command without performing terminal I/O. */
export function runDiagnosisCommand(
  options: DiagnosisCommandOptions,
  registeredVariants: readonly SearchVariant[],
  graph: WeightedGraph,
): string {
  if (options.help) {
    return formatDiagnosisCommandHelp()
  }
  if (options.listVariants) {
    return formatVariantList(registeredVariants)
  }
  const firstVariant = registeredVariants[0]
  if (firstVariant === undefined) {
    throw new RangeError('No search variants are registered; add a variant before diagnosis')
  }
  const variant =
    options.variantId === null
      ? firstVariant
      : findSearchVariant(registeredVariants, options.variantId)

  return formatDiagnosisOutput(
    diagnoseSearch({ graph, variant, start: options.start, goal: options.goal }),
  )
}
