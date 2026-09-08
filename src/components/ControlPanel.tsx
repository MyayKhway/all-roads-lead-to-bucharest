/**
 * ControlPanel — sidebar UI for selecting cities, algorithm, and heuristic.
 */

import type { AstarResult, HeuristicName } from '../algorithms/astar'
import { HEURISTICS } from '../algorithms/astar'
import { cityList } from '../data/cities'

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
]

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
        <div className="panel-logo">📍</div>
        <h1 className="panel-title">Romania 3D Map</h1>
        <p className="panel-subtitle">Pathfinding Visualizer</p>
      </div>

      {/* Start city */}
      <div className="panel-section">
        <label className="field-label" htmlFor="start-city">
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
          {isAnimating ? '⏳ Navigating…' : '▶ Find Path'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          disabled={isAnimating}
        >
          ↺ Reset
        </button>
      </div>

      {/* Legend */}
      <div className="legend">
        {[
          { color: '#66BB6A', label: 'Start city' },
          { color: '#EF5350', label: 'Destination' },
          { color: '#43A047', label: 'Route' },
          { color: '#78909C', label: 'Explored' },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Result card */}
      {pathResult && !isAnimating && (
        <ResultCard pathResult={pathResult} algorithm={algorithm} heuristic={heuristic} />
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
  const heuristicLabel =
    heuristic === HEURISTICS.MAGNETIC_FIELD ? 'Magnetic Field' : 'Straight Line'

  return (
    <div className="result-card">
      <div className="result-header">
        <span className="result-badge">✓ Route Found</span>
      </div>

      <div className="result-path">
        {path.map((cityId, i) => (
          <div key={cityId} className="path-step">
            <div
              className={`path-node${i === 0 ? ' path-node--start' : i === path.length - 1 ? ' path-node--goal' : ''}`}
            >
              {cityId.charAt(0).toUpperCase() + cityId.slice(1)}
            </div>
            {i < path.length - 1 && <div className="path-arrow">↓</div>}
          </div>
        ))}
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
