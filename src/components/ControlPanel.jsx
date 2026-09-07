/**
 * ControlPanel — sidebar UI for selecting cities, algorithm, and heuristic.
 *
 * Props:
 *   cities        object   — city map
 *   startCity     string   — selected start city id
 *   goalCity      string   — selected goal city id
 *   algorithm     string   — 'astar'
 *   heuristic     string   — 'magnetic_field' | 'straight_line'
 *   isAnimating   bool
 *   pathResult    object|null
 *   exploredStep  number   — current exploration step index during search viz
 *   onStart       fn(id)
 *   onGoal        fn(id)
 *   onAlgorithm   fn(val)
 *   onHeuristic   fn(val)
 *   onFindPath    fn()
 *   onReset       fn()
 */

import { cityList } from '../data/cities.js';
import { HEURISTICS } from '../algorithms/astar.js';

const ALGORITHMS = [
  { value: 'astar', label: 'A*' },
];

const HEURISTIC_OPTIONS = [
  { value: HEURISTICS.MAGNETIC_FIELD, label: 'Magnetic Field' },
  { value: HEURISTICS.STRAIGHT_LINE,  label: 'Straight Line' },
];

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
}) {
  const canFind = startCity && goalCity && startCity !== goalCity && !isAnimating;

  return (
    <div className="control-panel">
      {/* ---- Header ---- */}
      <div className="panel-header">
        <div className="panel-logo">📍</div>
        <h1 className="panel-title">Romania 3D Map</h1>
        <p className="panel-subtitle">Pathfinding Visualizer</p>
      </div>

      {/* ---- Controls ---- */}
      <div className="panel-section">
        <label className="field-label">Start City</label>
        <select
          className="field-select"
          value={startCity}
          onChange={e => onStart(e.target.value)}
          disabled={isAnimating}
        >
          <option value="">— Select —</option>
          {cityList.map(c => (
            <option key={c.id} value={c.id} disabled={c.id === goalCity}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="panel-section">
        <label className="field-label">Destination</label>
        <select
          className="field-select"
          value={goalCity}
          onChange={e => onGoal(e.target.value)}
          disabled={isAnimating}
        >
          <option value="">— Select —</option>
          {cityList.map(c => (
            <option key={c.id} value={c.id} disabled={c.id === startCity}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="panel-section">
        <label className="field-label">Algorithm</label>
        <select
          className="field-select"
          value={algorithm}
          onChange={e => onAlgorithm(e.target.value)}
          disabled={isAnimating}
        >
          {ALGORITHMS.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      <div className="panel-section">
        <label className="field-label">Heuristic</label>
        <select
          className="field-select"
          value={heuristic}
          onChange={e => onHeuristic(e.target.value)}
          disabled={isAnimating}
        >
          {HEURISTIC_OPTIONS.map(h => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      {/* ---- Action buttons ---- */}
      <div className="panel-actions">
        <button
          className="btn btn-primary"
          onClick={onFindPath}
          disabled={!canFind}
        >
          {isAnimating ? '⏳ Navigating…' : '▶ Find Path'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onReset}
          disabled={isAnimating}
        >
          ↺ Reset
        </button>
      </div>

      {/* ---- Legend ---- */}
      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#66BB6A' }} />
          <span>Start city</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#EF5350' }} />
          <span>Destination</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#43A047' }} />
          <span>Route</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#78909C' }} />
          <span>Explored</span>
        </div>
      </div>

      {/* ---- Result card ---- */}
      {pathResult && !isAnimating && (
        <ResultCard pathResult={pathResult} algorithm={algorithm} heuristic={heuristic} />
      )}
    </div>
  );
}

// ---- Sub-component: result card ----

function ResultCard({ pathResult, algorithm, heuristic }) {
  const { path, totalDistance, exploredOrder } = pathResult;

  const algoLabel      = algorithm === 'astar' ? 'A*' : algorithm;
  const heuristicLabel = heuristic === HEURISTICS.MAGNETIC_FIELD ? 'Magnetic Field' : 'Straight Line';

  return (
    <div className="result-card">
      <div className="result-header">
        <span className="result-badge">✓ Route Found</span>
      </div>

      {/* Path steps */}
      <div className="result-path">
        {path.map((cityId, i) => (
          <div key={cityId} className="path-step">
            <div className={`path-node ${i === 0 ? 'path-node--start' : i === path.length - 1 ? 'path-node--goal' : ''}`}>
              {cityId.charAt(0).toUpperCase() + cityId.slice(1)}
            </div>
            {i < path.length - 1 && <div className="path-arrow">↓</div>}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="result-stats">
        <div className="stat-row">
          <span className="stat-label">Total Distance</span>
          <span className="stat-value">{totalDistance} km</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Cities in Route</span>
          <span className="stat-value">{path.length}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Nodes Explored</span>
          <span className="stat-value">{exploredOrder?.length ?? '—'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Algorithm</span>
          <span className="stat-value">{algoLabel}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Heuristic</span>
          <span className="stat-value">{heuristicLabel}</span>
        </div>
      </div>
    </div>
  );
}
