/**
 * HeartMonitor — visualization layer for the Heartbeat heuristic.
 *
 * Consumes an AstarResult and derives a simulated heart rate per path city
 * from its accumulated road distance (gCost). Purely presentational: it
 * does not feed back into the search algorithm.
 */

import type { AstarResult } from '../algorithms/astar'
import { calculateSimulatedHeartRate } from '../algorithms/heartbeat'
import { IconHeartPulse } from './icons'

interface HeartMonitorProps {
  pathResult: AstarResult
}

const MIN_BAR_HEIGHT = 8
const MAX_BAR_HEIGHT = 28
const MIN_BPM = 70
const MAX_BPM = 110

function barHeight(bpm: number): number {
  const t = Math.min(1, Math.max(0, (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)))
  return MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT)
}

export default function HeartMonitor({ pathResult }: HeartMonitorProps) {
  const { path, exploredCosts } = pathResult

  const bpmSeries = path.map((cityId) => calculateSimulatedHeartRate(exploredCosts[cityId] ?? 0))
  const peakBpm = bpmSeries[bpmSeries.length - 1] ?? MIN_BPM

  return (
    <div className="heart-monitor">
      <div className="heart-monitor-header">
        <IconHeartPulse />
        <span>Heart Monitor</span>
      </div>

      <div className="heart-monitor-bpm">
        {peakBpm}
        <span className="heart-monitor-unit">BPM</span>
      </div>

      <div className="heart-monitor-sparkline">
        {bpmSeries.map((bpm, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: path order is stable for the lifetime of a result
          <span key={i} className="heart-monitor-bar" style={{ height: `${barHeight(bpm)}px` }} />
        ))}
      </div>

      <p className="heart-monitor-caption">Simulated cardiovascular stress along the route</p>
    </div>
  )
}
