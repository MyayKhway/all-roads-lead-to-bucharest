/**
 * ControlPanel — sidebar UI for selecting cities, algorithm, and heuristic.
 */

import type { AstarResult, HeuristicName } from '../algorithms/astar'
import { HEURISTICS } from '../algorithms/astar'
import { cityList } from '../data/cities'
import { COLOR } from '../lib/theme'
import HeartMonitor from './HeartMonitor'
import {
  IconCheckCircle,
  IconCompass,
  IconFlagGoal,
  IconFlagStart,
  IconLayers,
  IconPlay,
  IconRefresh,
  IconRoute,
  IconSpinner,
} from './icons'

interface ControlPanelProps {
  startCity: string
  goalCity: string
  algorithm: string
  heuristic: HeuristicName
  isAnimating: boolean
  pathResult: AstarResult | null
  onStart: (id: string) => void
  onGoal: (id: string) => void
  onAlgorithm: (val: string) => void
  onHeuristic: (val: HeuristicName) => void
  onFindPath: () => void
  onReset: () => void
}

const ALGORITHMS = [{ value: 'astar', label: 'A*' }]

const HEURISTIC_OPTIONS: { value: HeuristicName; label: string }[] = [
  { value: HEURISTICS.MAGNETIC_FIELD, label: 'Magnetic Field' },
  { value: HEURISTICS.STRAIGHT_LINE, label: 'Straight Line' },
  { value: HEURISTICS.HEARTBEAT, label: 'Heartbeat' },
]

const HEURISTIC_LABEL: Record<HeuristicName, string> = {
  [HEURISTICS.MAGNETIC_FIELD]: 'Magnetic Field',
  [HEURISTICS.STRAIGHT_LINE]: 'Straight Line',
  [HEURISTICS.HEARTBEAT]: 'Heartbeat',
}

export default function ControlPanel({
  startCity,
  goalCity,
  algorithm,
  heuristic,
  isAnimating,
  pathResult,
  onStart,
  onGoal,
  onAlgorithm,
  onHeuristic,
  onFindPath,
  onReset,
}: ControlPanelProps) {
  const canFind = startCity && goalCity && startCity !== goalCity && !isAnimating

  return (
    <div className="control-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-logo">
          <IconRoute />
        </div>
        <div className="panel-header-text">
          <h1 className="panel-title">Romania Atlas</h1>
          <p className="panel-subtitle">AI Route Planner</p>
        </div>
      </div>

      {/* Start city */}
      <div className="panel-section">
        <label className="field-label" htmlFor="start-city">
          <IconFlagStart />
          Start City
        </label>
        <select
          id="start-city"
          className="field-select"
          value={startCity}
          onChange={(e) => onStart(e.target.value)}
          disabled={isAnimating}
        >
          <option value="">— Select —</option>
          {cityList.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === goalCity}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Destination */}
      <div className="panel-section">
        <label className="field-label" htmlFor="goal-city">
          <IconFlagGoal />
          Destination
        </label>
        <select
          id="goal-city"
          className="field-select"
          value={goalCity}
          onChange={(e) => onGoal(e.target.value)}
          disabled={isAnimating}
        >
          <option value="">— Select —</option>
          {cityList.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === startCity}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Algorithm */}
      <div className="panel-section">
        <label className="field-label" htmlFor="algorithm">
          <IconLayers />
          Algorithm
        </label>
        <select
          id="algorithm"
          className="field-select"
          value={algorithm}
          onChange={(e) => onAlgorithm(e.target.value)}
          disabled={isAnimating}
        >
          {ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Heuristic */}
      <div className="panel-section">
        <label className="field-label" htmlFor="heuristic">
          <IconCompass />
          Heuristic
        </label>
        <select
          id="heuristic"
          className="field-select"
          value={heuristic}
          onChange={(e) => onHeuristic(e.target.value as HeuristicName)}
          disabled={isAnimating}
        >
          {HEURISTIC_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div className="panel-actions">
        <button type="button" className="btn btn-primary" onClick={onFindPath} disabled={!canFind}>
          {isAnimating ? (
            <>
              <IconSpinner className="spin" />
              Navigating…
            </>
          ) : (
            <>
              <IconPlay />
              Find Route
            </>
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          disabled={isAnimating}
        >
          <IconRefresh />
          Reset
        </button>
      </div>

      {/* Legend */}
      <div className="legend">
        {[
          { color: COLOR.amber, label: 'Start city' },
          { color: COLOR.crimson, label: 'Destination' },
          { color: COLOR.emerald, label: 'Route' },
          { color: COLOR.slateBlue, label: 'Explored' },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Result card */}
      {pathResult && !isAnimating && (
        <>
          <ResultCard pathResult={pathResult} algorithm={algorithm} heuristic={heuristic} />
          <HeartMonitor pathResult={pathResult} />
        </>
      )}
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  pathResult: AstarResult
  algorithm: string
  heuristic: HeuristicName
}

function ResultCard({ pathResult, algorithm, heuristic }: ResultCardProps) {
  const { path, totalDistance, exploredOrder } = pathResult
  const algoLabel = algorithm === 'astar' ? 'A*' : algorithm
  const heuristicLabel = HEURISTIC_LABEL[heuristic]

  return (
    <div className="result-card">
      <div className="result-header">
        <IconCheckCircle />
        <span className="result-badge">Route Found</span>
      </div>

      <div className="result-path">
        {path.map((cityId, i) => {
          const isStart = i === 0
          const isGoal = i === path.length - 1
          return (
            <div key={cityId} className="path-step">
              <div className="path-step-rail">
                <span
                  className={`path-step-dot${isStart ? ' path-step-dot--start' : isGoal ? ' path-step-dot--goal' : ''}`}
                />
                {!isGoal && <span className="path-step-line" />}
              </div>
              <div
                className={`path-node${isStart ? ' path-node--start' : isGoal ? ' path-node--goal' : ''}`}
              >
                {cityId.charAt(0).toUpperCase() + cityId.slice(1)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="result-stats">
        {[
          { label: 'Total Distance', value: `${totalDistance} km` },
          { label: 'Cities in Route', value: String(path.length) },
          { label: 'Nodes Explored', value: String(exploredOrder?.length ?? '—') },
          { label: 'Algorithm', value: algoLabel },
          { label: 'Heuristic', value: heuristicLabel },
        ].map(({ label, value }) => (
          <div key={label} className="stat-row">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
