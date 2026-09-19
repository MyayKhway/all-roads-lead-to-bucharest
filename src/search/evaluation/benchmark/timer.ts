export interface TimingOptions {
  /** Approximate time spent warming up the operation before measurement. */
  readonly warmupMs?: number
  /** Minimum duration of one calibrated batch. */
  readonly minTrialMs?: number
  /** Number of calibrated batches used to calculate statistics. */
  readonly trials?: number
  /** Safety limit that prevents calibration from doubling forever. */
  readonly maxIterations?: number
}

export interface TimingResult {
  readonly medianUs: number
  readonly p25Us: number
  readonly p75Us: number
  readonly minUs: number
  readonly meanUs: number
  readonly stdDevUs: number
  readonly iterations: number
  readonly trials: number
}

const DEFAULT_WARMUP_MS = 50
const DEFAULT_MIN_TRIAL_MS = 10
const DEFAULT_TRIALS = 30
const DEFAULT_MAX_ITERATIONS = 2 ** 30

/** Timing sink that keeps operation results observable, preventing dead-code elimination. */
export let timingSink: unknown

/** A batch is a group of repeated operation calls measured together as one timed unit. */
function runBatch<T>(operation: () => T, iterations: number): void {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    timingSink = operation()
  }
}

/** Times one complete batch with a single start and end clock reading. */
function measureBatchDuration<T>(operation: () => T, iterations: number): number {
  const startedAt = performance.now()
  runBatch(operation, iterations)
  return performance.now() - startedAt
}

function calculatePercentile(sortedValues: readonly number[], fraction: number): number {
  const position = (sortedValues.length - 1) * fraction
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const lowerValue = sortedValues[lowerIndex]
  const upperValue = sortedValues[upperIndex]

  if (lowerValue === undefined || upperValue === undefined) {
    throw new Error('Cannot calculate a percentile from an empty sample')
  }

  if (lowerIndex === upperIndex) {
    return lowerValue
  }

  const remainder = position - lowerIndex
  return lowerValue + (upperValue - lowerValue) * remainder
}

function validateTimingOptions(
  warmupMs: number,
  minTrialMs: number,
  trials: number,
  maxIterations: number,
): void {
  if (!Number.isFinite(warmupMs) || warmupMs < 0) {
    throw new RangeError('warmupMs must be finite and greater than or equal to zero')
  }

  if (!Number.isFinite(minTrialMs) || minTrialMs <= 0) {
    throw new RangeError('minTrialMs must be finite and greater than zero')
  }

  if (!Number.isSafeInteger(trials) || trials <= 0) {
    throw new RangeError('trials must be a positive safe integer')
  }

  if (!Number.isSafeInteger(maxIterations) || maxIterations <= 0) {
    throw new RangeError('maxIterations must be a positive safe integer')
  }
}

/** Exercises the operation before measurement to reduce JIT warm-up effects. */
function runWarmup<T>(operation: () => T, warmupMs: number): void {
  const startedAt = performance.now()

  while (performance.now() - startedAt < warmupMs) {
    timingSink = operation()
  }
}

/** Finds a batch size that is long enough to measure reliably. */
function calibrateIterationsPerTrial<T>(
  operation: () => T,
  minTrialMs: number,
  maxIterations: number,
): number {
  let iterations = 1
  let calibrationDurationMs = measureBatchDuration(operation, iterations)

  // Increase batch size until timer resolution is negligible relative to the trial.
  while (calibrationDurationMs < minTrialMs) {
    // Stop if even the largest permitted batch is shorter than the target duration.
    if (iterations >= maxIterations) {
      throw new RangeError('Unable to reach minTrialMs within maxIterations')
    }

    // Doubling reaches a useful batch size quickly; clamping respects the safety limit.
    iterations = Math.min(iterations * 2, maxIterations)
    calibrationDurationMs = measureBatchDuration(operation, iterations)
  }

  return iterations
}

/** Measures a synchronous operation after warm-up and automatic batch calibration. */
export function measureExecutionTime<T>(
  operation: () => T,
  options: TimingOptions = {},
): TimingResult {
  const warmupMs = options.warmupMs ?? DEFAULT_WARMUP_MS
  const minTrialMs = options.minTrialMs ?? DEFAULT_MIN_TRIAL_MS
  const trials = options.trials ?? DEFAULT_TRIALS
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS

  validateTimingOptions(warmupMs, minTrialMs, trials, maxIterations)

  runWarmup(operation, warmupMs)
  const iterations = calibrateIterationsPerTrial(operation, minTrialMs, maxIterations)

  // Every trial uses the same calibrated batch size and produces one per-call sample.
  const samplesUs: number[] = []
  for (let trial = 0; trial < trials; trial += 1) {
    const elapsedMs = measureBatchDuration(operation, iterations)
    samplesUs.push((elapsedMs * 1_000) / iterations)
  }

  // Percentiles require ordered samples, so sort a copy of the collected results.
  const sortedSamples = [...samplesUs].sort((left, right) => left - right)
  const minimum = sortedSamples[0]
  if (minimum === undefined) {
    throw new Error('Timing produced no samples')
  }

  const total = samplesUs.reduce((sum, sample) => sum + sample, 0)
  const mean = total / samplesUs.length
  // Treat the measured trials as the full population when calculating variance.
  const squaredDifferenceTotal = samplesUs.reduce((sum, sample) => {
    const difference = sample - mean
    return sum + difference * difference
  }, 0)

  return {
    medianUs: calculatePercentile(sortedSamples, 0.5),
    p25Us: calculatePercentile(sortedSamples, 0.25),
    p75Us: calculatePercentile(sortedSamples, 0.75),
    minUs: minimum,
    meanUs: mean,
    stdDevUs: Math.sqrt(squaredDifferenceTotal / samplesUs.length),
    iterations,
    trials,
  }
}
