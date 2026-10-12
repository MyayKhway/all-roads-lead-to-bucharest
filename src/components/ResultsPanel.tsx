/**
 * ResultsPanel — right sidebar: the rationale for each replay step, then the route found.
 */

import { cities } from '../data/cities'
import { isCityId } from '../data/cityIds'
import { romaniaGraph } from '../data/graph'
import type { Phase, SearchView } from '../lib/searchView'
import { ringColor } from '../lib/theme'
import { explainNtb } from '../search/heuristics/ntbBreakdown'
import type { RouteRun } from '../search/presentation'

interface ResultsPanelProps {
  phase: Phase
  view: SearchView
  pathResult: RouteRun | null
  onExplain: () => void
  onExplainSample: () => void
}

export default function ResultsPanel({
  phase,
  view,
  pathResult,
  onExplain,
  onExplainSample,
}: ResultsPanelProps) {
  return (
    <aside className="control-panel results-panel" aria-label="Search results">
      <div className="results-header">
        <h2>{phase === 'searching' ? 'Why this step' : 'Result'}</h2>
      </div>

      {pathResult && phase === 'searching' && (
        <StepCard pathResult={pathResult} view={view} onExplain={onExplain} />
      )}
      {pathResult && phase === 'done' && (
        <ResultCard pathResult={pathResult} onExplain={onExplain} />
      )}
      {pathResult && phase === 'navigating' && <p className="results-empty">Drawing the route…</p>}
      {!pathResult && (
        <p className="results-empty">
          Pick a start and a destination on the left, then press Find Path. Each step of the search
          is explained here.
        </p>
      )}

      {/* The step and result cards carry their own "Explain every step" link. */}
      {!(pathResult && (phase === 'searching' || phase === 'done')) && (
        <button type="button" className="results-sample-explain" onClick={onExplainSample}>
          Algorithm Explanation
        </button>
      )}
    </aside>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  pathResult: RouteRun
  onExplain: () => void
}

function ExplainButton({ onExplain }: { onExplain: () => void }) {
  return (
    <button type="button" className="btn btn-secondary result-explain" onClick={onExplain}>
      Explain every step →
    </button>
  )
}

function ResultCard({ pathResult, onExplain }: ResultCardProps) {
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
          { label: 'Total Distance', value: String(pathCost) },
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
      <ExplainButton onExplain={onExplain} />
    </div>
  )
}

// ─── Step card ────────────────────────────────────────────────────────────────

function cityName(id: string): string {
  return cities[id]?.name ?? id
}

function StepCard({
  pathResult,
  view,
  onExplain,
}: {
  pathResult: RouteRun
  view: SearchView
  onExplain: () => void
}) {
  const { step } = view
  if (!step) return null
  const informed = pathResult.variant.heuristic !== undefined
  const goal = pathResult.path.at(-1)
  const ntb =
    pathResult.variant.id === 'astar-ntb' && goal && isCityId(step.city) && step.city !== goal
      ? explainNtb(romaniaGraph, step.city, goal)
      : null
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
      {ntb && (
        <div className="step-ntb">
          <span>
            h from ring tolls: {ntb.tolls.map((t) => t.road.distance).join(' + ')} ={' '}
            <strong>{ntb.total}</strong>
          </span>
          <span className="step-ntb-key">
            {ntb.tolls.map((t) => (
              <i
                key={t.threshold}
                style={{ background: ringColor(t.threshold) }}
                title={`ring ${t.threshold}`}
              />
            ))}
            violet roads on the map
          </span>
        </div>
      )}
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
      <ExplainButton onExplain={onExplain} />
    </div>
  )
}
