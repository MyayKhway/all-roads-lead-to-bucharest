import assert from 'node:assert/strict'
import test from 'node:test'
import type { SearchProbeSnapshot, SearchResult } from '@/search/contracts'
import { BYTE_ESTIMATES, deriveSearchMetrics } from '@/search/evaluation/metrics'
import type { SearchResultValidation } from '@/search/validation'

const PROBE_SNAPSHOT: SearchProbeSnapshot = {
  nodesGenerated: 7,
  nodesExpanded: 4,
  frontierPushes: 7,
  frontierPops: 5,
  peakFrontierEntries: 3,
  closedSetEntries: 4,
  costTableEntries: 6,
  edgesExamined: 9,
  heuristicEvaluations: 7,
  customCounts: { staleEntries: 1 },
}

test('derives metrics for a valid successful result', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'sibiu', 'fagaras', 'bucharest'],
    pathCost: 450,
  }
  const validation: SearchResultValidation = {
    status: 'valid',
    calculatedPathCost: 450,
  }

  const metrics = deriveSearchMetrics({
    result,
    validation,
    probeSnapshot: PROBE_SNAPSHOT,
  })

  assert.deepEqual(metrics, {
    ...PROBE_SNAPSHOT,
    estimatedBytes:
      3 * BYTE_ESTIMATES.frontierEntry +
      4 * BYTE_ESTIMATES.closedSetEntry +
      6 * BYTE_ESTIMATES.costTableEntry,
    goalReached: true,
    calculatedPathCost: 450,
    pathEdgeCount: 3,
    resultValid: true,
  })
})

test('treats a truthful unreachable result as valid without reaching the goal', () => {
  const result: SearchResult = {
    status: 'failure',
    reason: 'unreachable',
  }
  const validation: SearchResultValidation = {
    status: 'valid',
    calculatedPathCost: null,
  }

  const metrics = deriveSearchMetrics({
    result,
    validation,
    probeSnapshot: PROBE_SNAPSHOT,
  })

  assert.equal(metrics.resultValid, true)
  assert.equal(metrics.goalReached, false)
  assert.equal(metrics.calculatedPathCost, null)
  assert.equal(metrics.pathEdgeCount, 0)
})

test('does not treat an invalid success as reaching the goal', () => {
  const result: SearchResult = {
    status: 'success',
    path: ['arad', 'zerind'],
    pathCost: 75,
  }
  const validation: SearchResultValidation = {
    status: 'invalid',
    calculatedPathCost: 75,
    issues: [{ code: 'incorrect-goal', message: 'The result ends at the wrong city.' }],
  }

  const metrics = deriveSearchMetrics({
    result,
    validation,
    probeSnapshot: PROBE_SNAPSHOT,
  })

  assert.equal(metrics.resultValid, false)
  assert.equal(metrics.goalReached, false)
  assert.equal(metrics.calculatedPathCost, 75)
  assert.equal(metrics.pathEdgeCount, 1)
})

test('copies custom counts instead of exposing the snapshot object', () => {
  const result: SearchResult = {
    status: 'failure',
    reason: 'unreachable',
  }
  const validation: SearchResultValidation = {
    status: 'valid',
    calculatedPathCost: null,
  }

  const metrics = deriveSearchMetrics({
    result,
    validation,
    probeSnapshot: PROBE_SNAPSHOT,
  })

  assert.notEqual(metrics.customCounts, PROBE_SNAPSHOT.customCounts)
  assert.deepEqual(metrics.customCounts, PROBE_SNAPSHOT.customCounts)
  assert.equal(Object.isFrozen(metrics), true)
  assert.equal(Object.isFrozen(metrics.customCounts), true)
})
