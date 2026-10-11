/**
 * ControlPanel — sidebar UI for selecting cities and a registered search variant.
 */

import { cities, cityList } from '../data/cities'
import type { RouteRun } from '../search/presentation'
import { searchVariantRegistry } from '../search/registry'

interface ControlPanelProps {
  startCity: string
  goalCity: string
  variantId: string
  isAnimating: boolean
  pathResult: RouteRun | null
  onStart: (id: string) => void
  onGoal: (id: string) => void
  onVariant: (id: string) => void
  onFindPath: () => void
  onReset: () => void
}

export default function ControlPanel({
  startCity,
  goalCity,
  variantId,
  isAnimating,
  pathResult,
  onStart,
  onGoal,
  onVariant,
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

      {/* Search method: one registered algorithm-and-heuristic variant */}
      <div className="panel-section">
        <label className="field-label" htmlFor="variant">
          Search Method
        </label>
        <select
          id="variant"
          className="field-select"
          value={variantId}
          onChange={(e) => onVariant(e.target.value)}
          disabled={isAnimating}
        >
          {searchVariantRegistry.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
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
      {pathResult && !isAnimating && <ResultCard pathResult={pathResult} />}
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  pathResult: RouteRun
}

function ResultCard({ pathResult }: ResultCardProps) {
  const { path, pathCost, metrics, variant } = pathResult

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
              {cities[cityId]?.name ?? cityId}
            </div>
            {i < path.length - 1 && <div className="path-arrow">↓</div>}
          </div>
        ))}
      </div>

      <div className="result-stats">
        {[
          { label: 'Total Distance', value: `${pathCost} km` },
          { label: 'Cities in Route', value: String(path.length) },
          { label: 'Nodes Expanded', value: String(metrics.nodesExpanded) },
          { label: 'Peak Frontier', value: String(metrics.peakFrontierEntries) },
          { label: 'Algorithm', value: variant.algorithmName },
          { label: 'Heuristic', value: variant.heuristicName ?? 'None (blind)' },
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
