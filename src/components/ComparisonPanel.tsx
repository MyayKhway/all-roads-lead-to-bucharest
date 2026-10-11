/**
 * ComparisonPanel — every registered variant on the selected pair, side by side.
 * Each metric column has its own bar scale, so columns are never read against each other.
 */

import { cities } from '../data/cities'
import type { RouteComparison, VariantComparison } from '../search/comparison'

interface ComparisonPanelProps {
  comparison: RouteComparison | null
  isMeasuring: boolean
  selectedVariantId: string
  disabled: boolean
  onSelect: (variantId: string) => void
  onClose: () => void
}

interface Column {
  key: string
  label: string
  unit: string
  value: (row: VariantComparison) => number | null
  format: (value: number) => string
  title: (row: VariantComparison) => string
}

const COLUMNS: Column[] = [
  {
    key: 'cost',
    label: 'Path cost',
    unit: 'km',
    value: (row) => row.pathCost,
    format: (v) => String(v),
    title: (row) => `${row.pathCost ?? '—'} km`,
  },
  {
    key: 'time',
    label: 'Time',
    unit: 'µs, median',
    value: (row) => row.timeUs,
    format: (v) => v.toFixed(1),
    title: (row) => `${row.timeUs?.toFixed(2) ?? '—'} µs median per search`,
  },
  {
    key: 'memory',
    label: 'Memory',
    unit: 'entries',
    value: (row) => row.memoryEntries,
    format: (v) => String(v),
    title: (row) => `${row.peakFrontierEntries} peak frontier + ${row.closedSetEntries} closed set`,
  },
  {
    key: 'expanded',
    label: 'Expanded',
    unit: 'nodes',
    value: (row) => row.nodesExpanded,
    format: (v) => String(v),
    title: (row) => `${row.nodesExpanded} expanded, ${row.nodesGenerated} generated`,
  },
]

function columnMax(rows: readonly VariantComparison[], column: Column): number {
  return Math.max(0, ...rows.map((row) => column.value(row) ?? 0))
}

function cityName(id: string): string {
  return cities[id]?.name ?? id
}

export default function ComparisonPanel({
  comparison,
  isMeasuring,
  selectedVariantId,
  disabled,
  onSelect,
  onClose,
}: ComparisonPanelProps) {
  if (comparison === null && !isMeasuring) return null

  return (
    <section className="comparison-panel" aria-label="Search comparison">
      <header className="comparison-header">
        <div>
          <h2 className="comparison-title">
            Comparison
            {comparison && ` · ${cityName(comparison.start)} → ${cityName(comparison.goal)}`}
          </h2>
          <p className="comparison-subtitle">
            {isMeasuring
              ? 'Measuring every method…'
              : 'Memory = peak frontier + closed set. Click a row to show its route.'}
          </p>
        </div>
        <button type="button" className="comparison-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      {comparison && (
        <div className="comparison-scroll">
          <table className={`comparison-table${isMeasuring ? ' comparison-table--stale' : ''}`}>
            <thead>
              <tr>
                <th scope="col">Method</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                    <span className="comparison-unit">{column.unit}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr
                  key={row.variantId}
                  className={row.variantId === selectedVariantId ? 'is-selected' : undefined}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="comparison-method"
                      onClick={() => onSelect(row.variantId)}
                      disabled={disabled}
                    >
                      <span className="comparison-method-name">{row.name}</span>
                      <span className="comparison-method-kind">
                        {row.heuristicName === null ? 'Blind' : 'Heuristic'}
                      </span>
                    </button>
                  </th>
                  {COLUMNS.map((column) => {
                    const value = column.value(row)
                    const max = columnMax(comparison.rows, column)
                    const width = value === null || max === 0 ? 0 : (value / max) * 100
                    return (
                      <td key={column.key} title={column.title(row)}>
                        <div className="comparison-cell">
                          <span className="comparison-value">
                            {value === null ? '—' : column.format(value)}
                          </span>
                          {column.key === 'cost' && value !== null && (
                            <OptimalityBadge row={row} optimalCost={comparison.optimalCost} />
                          )}
                        </div>
                        <div className="comparison-track">
                          <div className="comparison-bar" style={{ width: `${width}%` }} />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function OptimalityBadge({
  row,
  optimalCost,
}: {
  row: VariantComparison
  optimalCost: number | null
}) {
  if (row.optimal) return <span className="comparison-badge comparison-badge--good">✓ optimal</span>
  if (row.pathCost === null || optimalCost === null || optimalCost === 0) return null

  const overshoot = ((row.pathCost - optimalCost) / optimalCost) * 100
  return <span className="comparison-badge comparison-badge--warn">▲ +{overshoot.toFixed(1)}%</span>
}
