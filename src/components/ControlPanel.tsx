/**
 * ControlPanel — sidebar UI for selecting cities and a registered search variant.
 */

import { cities, cityList } from '../data/cities'
import type { Phase, SearchView } from '../lib/searchView'
import { STATUS_COLOR } from '../lib/theme'
import type { RouteRun } from '../search/presentation'
import { searchVariantRegistry } from '../search/registry'

const REPO_URL = 'https://github.com/MyayKhway/all-roads-lead-to-bucharest'

interface ControlPanelProps {
  startCity: string
  goalCity: string
  variantId: string
  isAnimating: boolean
  phase: Phase
  view: SearchView
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
  phase,
  view,
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
        <a className="panel-repo-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          View source on GitHub
        </a>
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
          {phase === 'searching' ? '⏳ Searching…' : isAnimating ? '⏳ Navigating…' : '▶ Find Path'}
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
          { color: STATUS_COLOR.start, label: 'Start city' },
          { color: STATUS_COLOR.goal, label: 'Destination' },
          { color: STATUS_COLOR.path, label: 'Route' },
          { color: STATUS_COLOR.explored, label: 'Explored' },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Step-by-step panel while the search replays */}
      {pathResult && phase === 'searching' && <StepCard pathResult={pathResult} view={view} />}

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

// ─── Step card ────────────────────────────────────────────────────────────────

function cityName(id: string): string {
  return cities[id]?.name ?? id
}

function StepCard({ pathResult, view }: { pathResult: RouteRun; view: SearchView }) {
  const { step } = view
  if (!step) return null
  const informed = pathResult.variant.heuristic !== undefined
  // BFS keeps the first route it finds; UCS replaces a route only when cheaper.
  const stale = pathResult.variant.id === 'bfs' ? 'already reached' : 'no gain'

  return (
    <div className="result-card step-card">
      <div className="result-header">
        <span className="result-badge">
          {pathResult.variant.name} · step {view.explored.length} / {pathResult.steps.length}
        </span>
      </div>
      <div className="step-current">
        Expanding <strong>{cityName(step.city)}</strong>
        <span className="step-formula">
          g = {step.g}
          {informed && step.h !== null && ` · f = ${(step.g + step.h).toFixed(0)}`}
        </span>
      </div>
      {step.candidates.length === 0 ? (
        <p className="step-note">Goal selected for expansion, so the search stops here.</p>
      ) : (
        <table className="step-table">
          <thead>
            <tr>
              <th scope="col">Neighbour</th>
              <th scope="col">g</th>
              {informed && <th scope="col">h</th>}
              {informed && <th scope="col">f = g + h</th>}
              {!informed && <th scope="col">Result</th>}
            </tr>
          </thead>
          <tbody>
            {step.candidates.map((c) => (
              <tr key={c.city} className={c.improved ? undefined : 'step-row--stale'}>
                <td>{cityName(c.city)}</td>
                <td>{c.g}</td>
                {informed && <td>{c.h === null ? '—' : c.h.toFixed(0)}</td>}
                {informed && <td>{c.f === null ? 'no gain' : c.f.toFixed(0)}</td>}
                {!informed && <td>{c.improved ? 'added' : stale}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="step-note">
        {informed
          ? 'A* expands the frontier city with the lowest f next.'
          : pathResult.variant.id === 'bfs'
            ? 'BFS expands cities in the order it found them, ignoring cost.'
            : 'UCS expands the frontier city with the lowest g next.'}
      </p>
    </div>
  )
}
