/**
 * ControlPanel — left sidebar: pick the cities and search method, run or reset.
 */

import { cityList } from '../data/cities'
import type { Phase } from '../lib/searchView'
import { STATUS_COLOR } from '../lib/theme'
import type { ThemeName } from '../lib/useTheme'
import { searchVariantRegistry } from '../search/registry'

const REPO_URL = 'https://github.com/MyayKhway/all-roads-lead-to-bucharest'

interface ControlPanelProps {
  startCity: string
  goalCity: string
  variantId: string
  isAnimating: boolean
  phase: Phase
  theme: ThemeName
  onStart: (id: string) => void
  onGoal: (id: string) => void
  onVariant: (id: string) => void
  onFindPath: () => void
  onReset: () => void
  onToggleTheme: () => void
}

export default function ControlPanel({
  startCity,
  goalCity,
  variantId,
  isAnimating,
  phase,
  theme,
  onStart,
  onGoal,
  onVariant,
  onFindPath,
  onReset,
  onToggleTheme,
}: ControlPanelProps) {
  const canFind = startCity && goalCity && startCity !== goalCity && !isAnimating

  return (
    <div className="control-panel">
      {/* Header */}
      <div className="panel-header">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label="Dark mode"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="theme-toggle-icon theme-toggle-icon--sun" aria-hidden="true">
            ☀
          </span>
          <span className="theme-toggle-icon theme-toggle-icon--moon" aria-hidden="true">
            ☾
          </span>
          <span className="theme-toggle-thumb" aria-hidden="true" />
        </button>
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

      <p className="map-tip">
        On the map: click a city for the destination, Shift+click for a new start.
      </p>

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
          {!isAnimating
            ? '▶ Find Path'
            : phase === 'searching'
              ? '⏳ Searching…'
              : '⏳ Navigating…'}
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
          { color: STATUS_COLOR.current, label: 'Expanding now' },
          { color: STATUS_COLOR.frontier, label: 'In the queue' },
          { color: STATUS_COLOR.explored, label: 'Explored' },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
