import { createMagneticFieldAStar } from '@/algorithms/magneticFieldAStar'
import { CITY_IDS } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import {
  calculateManhattanEstimate,
  precomputeMagneticHeuristic,
} from '@/heuristics/magneticAlignmentV2'
import type { SearchProblem } from '@/search/contracts'
import { measureExecutionTime } from '@/search/evaluation/benchmark/timer'
import { executeSearch } from '@/search/evaluation/execution'
import { createSearchProbe } from '@/search/evaluation/probe'
import { referenceDijkstra } from '@/search/evaluation/referenceDijkstra'

interface PairResult {
  readonly expanded: number
  readonly generated: number
  readonly examined: number
}

interface AlphaResult {
  readonly alpha: number
  readonly optimalPairs: number
  readonly meanExpanded: number
  readonly meanGenerated: number
  readonly meanExamined: number
  readonly medianTimeUsPerSearch: number | null
  readonly pairResults: ReadonlyMap<string, PairResult>
}

// 1. Read and validate sweep settings ----------------------------------------

function readNumberOption(name: string, fallback: number): number {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  const rawValue = process.argv[index + 1]
  const value = Number(rawValue)
  if (rawValue === undefined || !Number.isFinite(value)) {
    throw new RangeError(`${name} requires a finite number`)
  }
  return value
}

const fromAlpha = readNumberOption('--from', 0)
const toAlpha = readNumberOption('--to', 1)
const step = readNumberOption('--step', 0.05)
const measureTiming = process.argv.includes('--timing')
const timingWarmupMs = readNumberOption('--timing-warmup-ms', 50)
const timingTrialMs = readNumberOption('--timing-trial-ms', 10)
const timingTrials = readNumberOption('--timing-trials', 30)
if (fromAlpha < 0 || toAlpha > 1 || fromAlpha > toAlpha || step <= 0) {
  throw new RangeError('Alpha sweep requires 0 <= from <= to <= 1 and step > 0')
}

const alphas: number[] = []
for (let alpha = fromAlpha; alpha <= toAlpha + Number.EPSILON; alpha += step) {
  alphas.push(Number(alpha.toFixed(6)))
}
if (alphas.at(-1) !== toAlpha) alphas.push(toAlpha)

// 2. Prepare the same 380 cases and reference answers for every alpha --------

const problems: SearchProblem[] = []
for (const start of CITY_IDS) {
  for (const goal of CITY_IDS) {
    if (start !== goal) problems.push({ graph: romaniaGraph, start, goal })
  }
}

const referenceCosts = new Map<string, number>()
for (const problem of problems) {
  const reference = referenceDijkstra(problem, {})
  if (reference.status !== 'success') {
    throw new Error(`Unexpected unreachable pair: ${problem.start} -> ${problem.goal}`)
  }
  referenceCosts.set(`${problem.start}->${problem.goal}`, reference.pathCost)
}

// 3. Evaluate one fully precomputed alpha -----------------------------------

function evaluateAlpha(alpha: number): AlphaResult {
  const cachedHeuristic = precomputeMagneticHeuristic(alpha)
  const algorithm = createMagneticFieldAStar(cachedHeuristic)
  const pairResults = new Map<string, PairResult>()
  let optimalPairs = 0
  let expanded = 0
  let generated = 0
  let examined = 0

  for (const problem of problems) {
    const key = `${problem.start}->${problem.goal}`
    const execution = executeSearch({
      problem,
      algorithm,
      heuristic: calculateManhattanEstimate,
    })
    const expectedCost = referenceCosts.get(key)
    if (
      execution.result.status === 'success' &&
      expectedCost !== undefined &&
      execution.result.pathCost === expectedCost
    ) {
      optimalPairs += 1
    }

    const pairResult = {
      expanded: execution.metrics.nodesExpanded,
      generated: execution.metrics.nodesGenerated,
      examined: execution.metrics.edgesExamined,
    }
    pairResults.set(key, pairResult)
    expanded += pairResult.expanded
    generated += pairResult.generated
    examined += pairResult.examined
  }

  // The heuristic table and algorithm are already prepared above. Each timed
  // operation runs the same complete 380-pair workload with fresh probes.
  const timing = measureTiming
    ? measureExecutionTime(
        () => {
          let pathCostChecksum = 0
          for (const problem of problems) {
            const result = algorithm(problem, {
              probe: createSearchProbe(),
              heuristic: calculateManhattanEstimate,
            })
            if (result.status === 'success') pathCostChecksum += result.pathCost
          }
          return pathCostChecksum
        },
        {
          warmupMs: timingWarmupMs,
          minTrialMs: timingTrialMs,
          trials: timingTrials,
        },
      )
    : null

  return {
    alpha,
    optimalPairs,
    meanExpanded: expanded / problems.length,
    meanGenerated: generated / problems.length,
    meanExamined: examined / problems.length,
    medianTimeUsPerSearch: timing === null ? null : timing.medianUs / problems.length,
    pairResults,
  }
}

// 4. Compare and rank alpha results ------------------------------------------

function compareAlphaResults(left: AlphaResult, right: AlphaResult): number {
  if (measureTiming) {
    const leftTime = left.medianTimeUsPerSearch ?? Number.POSITIVE_INFINITY
    const rightTime = right.medianTimeUsPerSearch ?? Number.POSITIVE_INFINITY
    if (leftTime !== rightTime) return leftTime - rightTime
  }

  return (
    left.meanExpanded - right.meanExpanded ||
    left.meanExamined - right.meanExamined ||
    left.meanGenerated - right.meanGenerated ||
    // When structural results tie, keep the stronger magnetic influence.
    right.alpha - left.alpha
  )
}

function compareWithBaseline(
  result: AlphaResult,
  baseline: AlphaResult,
): { improved: number; tied: number; worsened: number } {
  let improved = 0
  let tied = 0
  let worsened = 0

  for (const [key, current] of result.pairResults) {
    const baselinePair = baseline.pairResults.get(key)
    if (baselinePair === undefined) throw new Error(`Missing baseline result for ${key}`)
    if (current.expanded < baselinePair.expanded) improved += 1
    else if (current.expanded > baselinePair.expanded) worsened += 1
    else tied += 1
  }
  return { improved, tied, worsened }
}

const alphaResults = alphas.map(evaluateAlpha)
const baseline = alphaResults.find((result) => result.alpha === 0) ?? evaluateAlpha(0)
const rankedResults = baseline.alpha < fromAlpha ? [baseline, ...alphaResults] : alphaResults
const optimalResults = rankedResults.filter((result) => result.optimalPairs === problems.length)
const bestOverall = [...optimalResults].sort(compareAlphaResults)[0]
const bestMagnetic = [...optimalResults]
  .filter((result) => result.alpha > 0)
  .sort(compareAlphaResults)[0]

if (bestOverall === undefined || bestMagnetic === undefined) {
  throw new Error('No fully optimal alpha was found')
}

// 5. Format the human-readable report ---------------------------------------

function formatMetric(value: number): string {
  return value.toFixed(3).padStart(8)
}

const lines = [
  `Magnetic alignment V2 alpha sweep ${fromAlpha}..${toAlpha} step ${step} ` +
    '(all 380 nontrivial ordered pairs)',
  measureTiming
    ? '   alpha  optimal  time/search us  mean expanded  better  tied  worse'
    : '   alpha  optimal  mean expanded  mean generated  mean examined  better  tied  worse',
]

for (const result of alphaResults) {
  const comparison = compareWithBaseline(result, baseline)
  const prefix =
    `${result.alpha.toFixed(6).padStart(8)}  ${String(result.optimalPairs).padStart(7)}  ` +
    (measureTiming
      ? `${(result.medianTimeUsPerSearch ?? 0).toFixed(3).padStart(14)}  ` +
        `${formatMetric(result.meanExpanded)}  `
      : `${formatMetric(result.meanExpanded)}       ${formatMetric(result.meanGenerated)}       ` +
        `${formatMetric(result.meanExamined)}  `)
  lines.push(
    `${prefix}${String(comparison.improved).padStart(6)}  ` +
      `${String(comparison.tied).padStart(4)}  ${String(comparison.worsened).padStart(5)}`,
  )
}

lines.push('')
lines.push(`Best overall alpha: ${bestOverall.alpha.toFixed(6)}`)
lines.push(`Best positive alpha: ${bestMagnetic.alpha.toFixed(6)}`)
process.stdout.write(`${lines.join('\n')}\n`)
