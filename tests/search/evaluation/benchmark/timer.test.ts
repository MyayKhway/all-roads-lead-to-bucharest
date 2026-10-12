import assert from 'node:assert/strict'
import test from 'node:test'

import {
  measureExecutionTime,
  measureInterleavedExecutionTimes,
  type TimingOptions,
  timingSink,
} from '@/search/evaluation/benchmark/timer'

const FAST_TEST_OPTIONS: TimingOptions = {
  warmupMs: 0,
  minTrialMs: 1,
  trials: 5,
}

test('reports finite non-negative timing statistics', () => {
  const result = measureExecutionTime(() => 42, FAST_TEST_OPTIONS)

  for (const statistic of [
    result.medianUs,
    result.p25Us,
    result.p75Us,
    result.minUs,
    result.meanUs,
    result.stdDevUs,
  ]) {
    assert.ok(Number.isFinite(statistic))
    assert.ok(statistic >= 0)
  }
})

test('reports ordered distribution statistics', () => {
  const result = measureExecutionTime(() => 42, FAST_TEST_OPTIONS)

  assert.ok(result.minUs <= result.p25Us)
  assert.ok(result.p25Us <= result.medianUs)
  assert.ok(result.medianUs <= result.p75Us)
})

test('uses the requested trial count', () => {
  const result = measureExecutionTime(() => 1, {
    warmupMs: 0,
    minTrialMs: 1,
    trials: 7,
  })

  assert.equal(result.trials, 7)
})

test('calibrates multiple iterations for a fast operation', () => {
  const result = measureExecutionTime(() => 1, FAST_TEST_OPTIONS)

  assert.ok(result.iterations > 1)
})

test('retains the operation result in the exported sink', () => {
  measureExecutionTime(() => 'observed-result', FAST_TEST_OPTIONS)

  assert.equal(timingSink, 'observed-result')
})

test('rejects invalid timing options', () => {
  const invalidOptions: readonly TimingOptions[] = [
    { warmupMs: -1 },
    { warmupMs: Number.POSITIVE_INFINITY },
    { minTrialMs: 0 },
    { minTrialMs: Number.NaN },
    { trials: 0 },
    { trials: 1.5 },
    { maxIterations: 0 },
    { maxIterations: 1.5 },
  ]

  for (const options of invalidOptions) {
    assert.throws(() => measureExecutionTime(() => 1, options), RangeError)
  }
})

test('fails when calibration reaches its iteration limit', () => {
  assert.throws(
    () =>
      measureExecutionTime(() => 1, {
        warmupMs: 0,
        minTrialMs: 1_000,
        trials: 1,
        maxIterations: 1,
      }),
    RangeError,
  )
})

function busyWait(ms: number): void {
  const startedAt = performance.now()
  while (performance.now() - startedAt < ms) {}
}

test('times interleaved operations in rotating order', () => {
  const order: string[] = []
  // Each call outlasts minTrialMs, so calibration settles on one iteration per batch.
  const record = (name: string) => () => {
    busyWait(0.01)
    order.push(name)
  }
  const results = measureInterleavedExecutionTimes([record('a'), record('b'), record('c')], {
    warmupMs: 0,
    minTrialMs: 0.001,
    trials: 3,
  })

  assert.equal(results.length, 3)
  for (const result of results) {
    assert.equal(result.trials, 3)
    assert.equal(result.iterations, 1)
  }
  // Each operation runs once to calibrate, then each trial starts one operation later.
  assert.deepEqual(order, ['a', 'b', 'c', 'a', 'b', 'c', 'b', 'c', 'a', 'c', 'a', 'b'])
})

test('slower interleaved operations report larger medians', () => {
  const [fast, slow] = measureInterleavedExecutionTimes(
    [() => busyWait(0.05), () => busyWait(0.5)],
    FAST_TEST_OPTIONS,
  )
  assert.ok(fast && slow)
  assert.ok(slow.medianUs > fast.medianUs)
})
