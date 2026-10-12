/**
 * ComparisonPanel — a compact route comparison that expands into the full benchmark report.
 */

import { useState } from 'react'
import { cities } from '../data/cities'
import type {
  AllPairsComparison,
  AllPairsVariantComparison,
  RouteComparison,
  VariantComparison,
} from '../search/comparison'
import { COMPARISON_BASELINE, COMPARISON_FOCUS } from '../search/comparisonVariants'

interface ComparisonPanelProps {
  comparison: RouteComparison | null
  isMeasuring: boolean
  allPairsComparison: AllPairsComparison | null
  isMeasuringAllPairs: boolean
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
    unit: 'total cost',
    value: (row) => row.pathCost,
    format: (v) => String(v),
    title: (row) => `${row.pathCost ?? '—'} total road cost`,
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
    label: 'Memory use',
    unit: 'entries',
    value: (row) => row.memoryEntries,
    format: (v) => String(v),
    title: (row) =>
      `${row.peakFrontierEntries} peak frontier + ${row.closedSetEntries} closed set + ${row.costTableEntries} cost table entries`,
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

function cityName(id: string): string {
  return cities[id]?.name ?? id
}

type MethodRole = 'focus' | 'baseline' | 'extra'

function methodRole(variantId: string): MethodRole {
  if (variantId === COMPARISON_FOCUS.id) return 'focus'
  if (variantId === COMPARISON_BASELINE.id) return 'baseline'
  return 'extra'
}

/** A label short enough for chart columns: the heuristic's name, or the method's initials. */
function shortName(row: { name: string; heuristicName: string | null }): string {
  return (
    row.heuristicName ??
    row.name
      .split(/[\s-]+/)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('')
  )
}

export default function ComparisonPanel({
  comparison,
  isMeasuring,
  allPairsComparison,
  isMeasuringAllPairs,
  selectedVariantId,
  disabled,
  onSelect,
  onClose,
}: ComparisonPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [reportSection, setReportSection] = useState<'selected-route' | 'all-routes'>(
    'selected-route',
  )
  if (comparison === null && !isMeasuring) return null

  return (
    <section
      className={`comparison-panel${expanded ? ' comparison-panel--expanded' : ''}`}
      aria-label="Search comparison"
    >
      <header className="comparison-header">
        <div>
          <h2 className="comparison-title">
            {expanded
              ? `${COMPARISON_FOCUS.name} vs ${COMPARISON_BASELINE.name}`
              : 'Selected Route'}
            {!expanded &&
              comparison &&
              ` · ${cityName(comparison.start)} → ${cityName(comparison.goal)}`}
          </h2>
          {expanded && (
            <p className="comparison-subtitle">
              {reportSection === 'selected-route'
                ? comparison
                  ? `${cityName(comparison.start)} → ${cityName(comparison.goal)}`
                  : 'Selected route'
                : 'Performance across every ordered pair of distinct cities'}
            </p>
          )}
        </div>
        <div className="comparison-actions">
          <button
            type="button"
            className="comparison-expand"
            onClick={() => {
              if (!expanded) setReportSection('selected-route')
              setExpanded((current) => !current)
            }}
            aria-expanded={expanded}
          >
            {expanded ? 'Collapse' : 'Full report'}
          </button>
          <button type="button" className="comparison-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </header>

      {!expanded && comparison && (
        <div className="comparison-scroll comparison-scroll--compact">
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
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && (
        <>
          <div className="full-report-tabs" role="tablist" aria-label="Report scope">
            <button
              type="button"
              role="tab"
              aria-selected={reportSection === 'selected-route'}
              className={reportSection === 'selected-route' ? 'is-active' : undefined}
              onClick={() => setReportSection('selected-route')}
            >
              Selected route
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reportSection === 'all-routes'}
              className={reportSection === 'all-routes' ? 'is-active' : undefined}
              onClick={() => setReportSection('all-routes')}
            >
              {allPairsComparison ? `All ${allPairsComparison.pairCount} routes` : 'All routes'}
            </button>
          </div>
          {reportSection === 'selected-route' && comparison && (
            <SelectedRouteSection comparison={comparison} />
          )}
          {reportSection === 'all-routes' && (
            <AllPairsSection comparison={allPairsComparison} isMeasuring={isMeasuringAllPairs} />
          )}
        </>
      )}
    </section>
  )
}

function SelectedRouteSection({ comparison }: { comparison: RouteComparison }) {
  const focus = comparison.rows.find((row) => row.variantId === COMPARISON_FOCUS.id)
  const baseline = comparison.rows.find((row) => row.variantId === COMPARISON_BASELINE.id)
  if (focus === undefined || baseline === undefined) {
    return <div className="all-pairs-loading">The selected-route result is incomplete.</div>
  }

  const searchWorkMetrics = [
    {
      label: 'Nodes expanded',
      focusValue: focus.nodesExpanded,
      baselineValue: baseline.nodesExpanded,
      format: (value: number) => value.toFixed(0),
    },
    {
      label: 'Nodes generated',
      focusValue: focus.nodesGenerated,
      baselineValue: baseline.nodesGenerated,
      format: (value: number) => value.toFixed(0),
    },
    {
      label: 'Roads examined',
      focusValue: focus.edgesExamined,
      baselineValue: baseline.edgesExamined,
      format: (value: number) => value.toFixed(0),
    },
  ]
  const memoryParts = [
    {
      key: 'frontier',
      label: 'Peak frontier',
      focusValue: focus.peakFrontierEntries,
      baselineValue: baseline.peakFrontierEntries,
    },
    {
      key: 'closed',
      label: 'Closed set',
      focusValue: focus.closedSetEntries,
      baselineValue: baseline.closedSetEntries,
    },
    {
      key: 'cost',
      label: 'Cost table',
      focusValue: focus.costTableEntries,
      baselineValue: baseline.costTableEntries,
    },
  ]
  const focusMemoryTotal = memoryParts.reduce((sum, part) => sum + part.focusValue, 0)
  const baselineMemoryTotal = memoryParts.reduce((sum, part) => sum + part.baselineValue, 0)
  const memoryMax = Math.max(focusMemoryTotal, baselineMemoryTotal)
  const focusTime = focus.timeUs ?? 0
  const baselineTime = baseline.timeUs ?? 0
  const timeMax = Math.max(focusTime, baselineTime)
  const timeDifference = percentageReduction(focusTime, baselineTime)
  const costAboveMinimum = (row: VariantComparison) =>
    row.pathCost === null || comparison.optimalCost === null
      ? null
      : Math.max(0, row.pathCost - comparison.optimalCost)
  const qualityRows = [
    {
      label: 'Returned path cost',
      direction: 'Lower is better',
      format: (row: VariantComparison) => String(row.pathCost ?? '—'),
    },
    {
      label: 'Cost above minimum',
      direction: 'Zero means optimal',
      format: (row: VariantComparison) => {
        const overrun = costAboveMinimum(row)
        return overrun === null ? '—' : overrun === 0 ? '0' : `+${overrun}`
      },
    },
    {
      label: 'Result',
      direction: 'Compared with the reference',
      format: (row: VariantComparison) => (row.optimal ? 'Optimal' : 'Suboptimal'),
    },
  ]
  return (
    <div className="selected-route-report">
      <section className="report-card" aria-labelledby="selected-execution-title">
        <ReportHeading
          id="selected-execution-title"
          title="Execution performance"
          description="Measured after warm-up for this selected route"
        />
        <div className="suite-time-heading">
          <strong>Median execution time</strong>
          <span>
            {shortName(focus)} is {Math.abs(timeDifference).toFixed(1)}%{' '}
            {timeDifference >= 0 ? 'faster' : 'slower'}
          </span>
        </div>
        <div className="suite-time-comparison">
          {[
            { name: focus.name, variant: 'focus', time: focusTime },
            { name: baseline.name, variant: 'baseline', time: baselineTime },
          ].map(({ name, variant, time }) => (
            <div className="suite-time-row" key={variant}>
              <strong className="suite-time-method">{name}</strong>
              <div className="suite-time-track">
                <span
                  className={`suite-time-fill suite-time-fill--${variant}`}
                  style={{ width: `${timeMax === 0 ? 0 : (time / timeMax) * 100}%` }}
                />
              </div>
              <div className="suite-time-value">
                <strong className="suite-time-value__total">{time.toFixed(2)} µs</strong>
              </div>
            </div>
          ))}
        </div>
        <SearchWorkComparison
          title="Search work"
          metrics={searchWorkMetrics}
          focusName={shortName(focus)}
          baselineName={shortName(baseline)}
        />
      </section>

      <section className="report-card" aria-labelledby="selected-memory-title">
        <ReportHeading
          id="selected-memory-title"
          title="Memory usage"
          description="Tracked entries for this route; shorter total bars are better"
        />
        <div className="memory-legend">
          {memoryParts.map((part) => (
            <span key={part.key}>
              <i className={`memory-key memory-key--${part.key}`} />
              {part.label}
            </span>
          ))}
        </div>
        <div className="memory-comparison">
          {[
            { name: focus.name, variant: 'focus', total: focusMemoryTotal, useFocus: true },
            {
              name: baseline.name,
              variant: 'baseline',
              total: baselineMemoryTotal,
              useFocus: false,
            },
          ].map(({ name, variant, total, useFocus }) => (
            <div className="memory-row" key={variant}>
              <div className="memory-row__heading">
                <strong>{name}</strong>
                <span>{total} total entries</span>
              </div>
              <div className="memory-track">
                {memoryParts.map((part) => {
                  const value = useFocus ? part.focusValue : part.baselineValue
                  return (
                    <span
                      className={`memory-segment memory-segment--${part.key}`}
                      key={part.key}
                      style={{ width: `${memoryMax === 0 ? 0 : (value / memoryMax) * 100}%` }}
                      title={`${part.label}: ${value}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="report-card" aria-labelledby="selected-quality-title">
        <ReportHeading
          id="selected-quality-title"
          title="Solution quality (path cost)"
          description={`Dijkstra reference minimum: ${comparison.optimalCost ?? 'unavailable'}`}
        />
        <table className="quality-table selected-quality-table">
          <thead>
            <tr className="quality-table__heading-row">
              <th className="quality-table__cell quality-table__measure" scope="col">
                Measure
              </th>
              {comparison.rows.map((row) => (
                <th
                  key={row.variantId}
                  className="quality-table__cell quality-table__method"
                  scope="col"
                >
                  <i className={`method-dot method-dot--${methodRole(row.variantId)}`} />
                  {row.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qualityRows.map((measure) => (
              <tr className="quality-table__row" key={measure.label}>
                <th className="quality-table__cell quality-table__measure" scope="row">
                  <strong className="quality-table__label">{measure.label}</strong>
                  <small className="quality-table__direction">{measure.direction}</small>
                </th>
                {comparison.rows.map((row) => (
                  <td
                    key={row.variantId}
                    className={`quality-table__cell quality-table__value${row.optimal ? ' quality-value--best' : ''}`}
                  >
                    {measure.format(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function AllPairsSection({
  comparison,
  isMeasuring,
}: {
  comparison: AllPairsComparison | null
  isMeasuring: boolean
}) {
  if (comparison === null) {
    return (
      <div className="all-pairs-loading" role="status">
        {isMeasuring ? 'Benchmarking every route…' : 'Preparing the all-routes benchmark…'}
      </div>
    )
  }

  const focus = comparison.rows.find((row) => row.variantId === comparison.focusVariantId)
  const baseline = comparison.rows.find((row) => row.variantId === comparison.baselineVariantId)
  if (focus === undefined || baseline === undefined) {
    return <div className="all-pairs-loading">The benchmark result is incomplete.</div>
  }

  const searchWorkMetrics = [
    {
      label: 'Nodes expanded',
      focusValue: focus.averageNodesExpanded,
      baselineValue: baseline.averageNodesExpanded,
      format: (value: number) => value.toFixed(2),
    },
    {
      label: 'Nodes generated',
      focusValue: focus.averageNodesGenerated,
      baselineValue: baseline.averageNodesGenerated,
      format: (value: number) => value.toFixed(2),
    },
    {
      label: 'Roads examined',
      focusValue: focus.averageEdgesExamined,
      baselineValue: baseline.averageEdgesExamined,
      format: (value: number) => value.toFixed(2),
    },
  ]
  const memoryParts = [
    {
      key: 'frontier',
      label: 'Peak frontier',
      focusValue: focus.averagePeakFrontierEntries,
      baselineValue: baseline.averagePeakFrontierEntries,
    },
    {
      key: 'closed',
      label: 'Closed set',
      focusValue: focus.averageClosedSetEntries,
      baselineValue: baseline.averageClosedSetEntries,
    },
    {
      key: 'cost',
      label: 'Cost table',
      focusValue: focus.averageCostTableEntries,
      baselineValue: baseline.averageCostTableEntries,
    },
  ]
  const focusMemoryTotal = memoryParts.reduce((sum, part) => sum + part.focusValue, 0)
  const baselineMemoryTotal = memoryParts.reduce((sum, part) => sum + part.baselineValue, 0)
  const memoryMax = Math.max(focusMemoryTotal, baselineMemoryTotal)
  const suiteTimeMax = Math.max(focus.medianSuiteTimeUs, baseline.medianSuiteTimeUs)
  const suiteTimeDifference = percentageReduction(
    focus.medianSuiteTimeUs,
    baseline.medianSuiteTimeUs,
  )
  const qualityRows = [
    {
      label: 'Average path cost',
      direction: 'Lower is better',
      value: (row: AllPairsVariantComparison) => row.averagePathCost,
      format: (value: number) => value.toFixed(2),
      better: 'lower' as const,
    },
    {
      label: 'Optimal routes',
      direction: 'Higher is better',
      value: (row: AllPairsVariantComparison) => row.optimalRoutes,
      format: (value: number) => `${value}/${comparison.pairCount}`,
      better: 'higher' as const,
    },
    {
      label: 'Average cost overrun',
      direction: 'Lower is better',
      value: (row: AllPairsVariantComparison) => row.averageCostOverrunPercent,
      format: (value: number) => `${value.toFixed(2)}%`,
      better: 'lower' as const,
    },
    {
      label: 'Worst cost overrun',
      direction: 'Lower is better',
      value: (row: AllPairsVariantComparison) => row.worstCostOverrunPercent,
      format: (value: number) => `${value.toFixed(2)}%`,
      better: 'lower' as const,
    },
  ]

  return (
    <div className="all-pairs-section">
      <section className="all-pairs-overview" aria-labelledby="benchmark-scope-title">
        <div className="all-pairs-scope">
          <span id="benchmark-scope-title">Benchmark scope</span>
          <strong>{comparison.pairCount}</strong>
          <p>ordered routes covering every start and destination pair</p>
        </div>
        <div className="all-pairs-coverage">
          <div className="all-pairs-coverage__heading">
            <div>
              <strong>Result coverage</strong>
              <span>Routes that returned a valid path</span>
            </div>
            <span>higher is better</span>
          </div>
          {comparison.rows.map((row) => (
            <QualityProgress
              key={row.variantId}
              name={row.name}
              value={row.validRoutes}
              total={comparison.pairCount}
              variant={methodRole(row.variantId)}
            />
          ))}
        </div>
      </section>

      <section className="report-card" aria-labelledby="execution-title">
        <ReportHeading
          id="execution-title"
          title="Execution performance"
          description={`Time for one complete ${comparison.pairCount}-route benchmark pass`}
        />
        <div className="suite-time-heading">
          <strong>Median total time</strong>
          <span>
            {shortName(focus)} is {Math.abs(suiteTimeDifference).toFixed(1)}%{' '}
            {suiteTimeDifference >= 0 ? 'faster' : 'slower'}
          </span>
        </div>
        <div className="suite-time-comparison">
          {[
            { name: focus.name, variant: 'focus', row: focus },
            { name: baseline.name, variant: 'baseline', row: baseline },
          ].map(({ name, variant, row }) => (
            <div className="suite-time-row" key={variant}>
              <strong className="suite-time-method">{name}</strong>
              <div className="suite-time-track">
                <span
                  className={`suite-time-fill suite-time-fill--${variant}`}
                  style={{
                    width: `${suiteTimeMax === 0 ? 0 : (row.medianSuiteTimeUs / suiteTimeMax) * 100}%`,
                  }}
                />
              </div>
              <div className="suite-time-value">
                <strong className="suite-time-value__total">
                  {(row.medianSuiteTimeUs / 1_000).toFixed(2)} ms
                </strong>
                <small className="suite-time-value__route">
                  {row.averageTimeUs.toFixed(2)} µs/route
                </small>
              </div>
            </div>
          ))}
        </div>
        <SearchWorkComparison
          title="Average search work per route"
          metrics={searchWorkMetrics}
          focusName={shortName(focus)}
          baselineName={shortName(baseline)}
        />
      </section>

      <section className="report-card" aria-labelledby="memory-title">
        <ReportHeading
          id="memory-title"
          title="Memory usage"
          description="Average tracked entries per route; shorter total bars are better"
        />
        <div className="memory-legend">
          {memoryParts.map((part) => (
            <span key={part.key}>
              <i className={`memory-key memory-key--${part.key}`} />
              {part.label}
            </span>
          ))}
        </div>
        <div className="memory-comparison">
          {[
            { name: focus.name, variant: 'focus', total: focusMemoryTotal, useFocus: true },
            {
              name: baseline.name,
              variant: 'baseline',
              total: baselineMemoryTotal,
              useFocus: false,
            },
          ].map(({ name, variant, total, useFocus }) => (
            <div className="memory-row" key={variant}>
              <div className="memory-row__heading">
                <strong>{name}</strong>
                <span>{total.toFixed(2)} total entries</span>
              </div>
              <div className="memory-track">
                {memoryParts.map((part) => {
                  const value = useFocus ? part.focusValue : part.baselineValue
                  return (
                    <span
                      className={`memory-segment memory-segment--${part.key}`}
                      key={part.key}
                      style={{ width: `${memoryMax === 0 ? 0 : (value / memoryMax) * 100}%` }}
                      title={`${part.label}: ${value.toFixed(2)}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="report-card" aria-labelledby="solution-quality-title">
        <ReportHeading
          id="solution-quality-title"
          title="Solution quality (path cost)"
          description="Returned path costs compared with the minimum cost found by Dijkstra"
        />
        <table className="quality-table">
          <thead>
            <tr className="quality-table__heading-row">
              <th className="quality-table__cell quality-table__measure" scope="col">
                Measure
              </th>
              {comparison.rows.map((row) => (
                <th
                  key={row.variantId}
                  className="quality-table__cell quality-table__method"
                  scope="col"
                >
                  <i className={`method-dot method-dot--${methodRole(row.variantId)}`} />
                  {row.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qualityRows.map((measure) => {
              const values = comparison.rows.map(measure.value)
              const best = measure.better === 'lower' ? Math.min(...values) : Math.max(...values)
              return (
                <tr className="quality-table__row" key={measure.label}>
                  <th className="quality-table__cell quality-table__measure" scope="row">
                    <strong className="quality-table__label">{measure.label}</strong>
                    <small className="quality-table__direction">{measure.direction}</small>
                  </th>
                  {comparison.rows.map((row) => {
                    const value = measure.value(row)
                    return (
                      <td
                        key={row.variantId}
                        className={`quality-table__cell quality-table__value${value === best ? ' quality-value--best' : ''}`}
                      >
                        {measure.format(value)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="quality-reference-note">
          Optimal means the returned path cost matches the Dijkstra reference.
        </p>
      </section>

      <section className="report-card all-pairs-details" aria-labelledby="all-pairs-details-title">
        <ReportHeading
          id="all-pairs-details-title"
          title="Complete benchmark"
          description={`Exact averages across all ${comparison.pairCount} routes`}
        />
        <div className="comparison-scroll">
          <table className="comparison-table all-pairs-table">
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">
                  Valid
                  <span className="comparison-unit">routes</span>
                </th>
                <th scope="col">
                  Optimal
                  <span className="comparison-unit">routes</span>
                </th>
                <th scope="col">
                  Path cost
                  <span className="comparison-unit">average</span>
                </th>
                <th scope="col">
                  Cost overrun
                  <span className="comparison-unit">average</span>
                </th>
                <th scope="col">
                  Expanded
                  <span className="comparison-unit">average</span>
                </th>
                <th scope="col">
                  Generated
                  <span className="comparison-unit">average</span>
                </th>
                <th scope="col">
                  Roads examined
                  <span className="comparison-unit">average</span>
                </th>
                <th scope="col">
                  Peak frontier
                  <span className="comparison-unit">average entries</span>
                </th>
                <th scope="col">
                  Closed set
                  <span className="comparison-unit">average entries</span>
                </th>
                <th scope="col">
                  Cost table
                  <span className="comparison-unit">average entries</span>
                </th>
                <th scope="col">
                  All {comparison.pairCount} routes
                  <span className="comparison-unit">ms, median</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.variantId}>
                  <th scope="row">
                    <span className="comparison-method-name">{row.name}</span>
                    <span className="comparison-method-kind">
                      {row.heuristicName === null ? 'Blind' : 'Heuristic'}
                    </span>
                  </th>
                  <td>
                    <span className="comparison-value">
                      {row.validRoutes}/{comparison.pairCount}
                    </span>
                  </td>
                  <td>
                    <span className="comparison-value">
                      {row.optimalRoutes}/{comparison.pairCount}
                    </span>
                  </td>
                  <td>
                    <span className="comparison-value">{row.averagePathCost.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className="comparison-value">
                      {row.averageCostOverrunPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td>
                    <span className="comparison-value">{row.averageNodesExpanded.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className="comparison-value">{row.averageNodesGenerated.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className="comparison-value">{row.averageEdgesExamined.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className="comparison-value">
                      {row.averagePeakFrontierEntries.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className="comparison-value">
                      {row.averageClosedSetEntries.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className="comparison-value">
                      {row.averageCostTableEntries.toFixed(2)}
                    </span>
                  </td>
                  <td title={`${row.averageTimeUs.toFixed(2)} µs average per route`}>
                    <span className="comparison-value">
                      {(row.medianSuiteTimeUs / 1_000).toFixed(2)}
                    </span>
                    <span className="all-pairs-per-route">
                      {row.averageTimeUs.toFixed(2)} µs/route
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="all-pairs-note">
        One timing pass runs all {comparison.pairCount} routes. The benchmark repeats that pass and
        reports its median; average time per route is the median divided by {comparison.pairCount}.
        Every method uses the same warm-up and trial settings. Timing excludes the one-time NTB
        lookup-table preprocessing, which runs when the comparison worker loads. Browser timing can
        vary slightly between runs.
      </p>
    </div>
  )
}

function percentageReduction(focus: number, baseline: number): number {
  return baseline === 0 ? 0 : ((baseline - focus) / baseline) * 100
}

interface SearchWorkMetric {
  readonly label: string
  readonly focusValue: number
  readonly baselineValue: number
  readonly format: (value: number) => string
}

function SearchWorkComparison({
  title,
  metrics,
  focusName,
  baselineName,
}: {
  title: string
  metrics: readonly SearchWorkMetric[]
  focusName: string
  baselineName: string
}) {
  return (
    <>
      <div className="search-work-heading">
        <strong>{title}</strong>
        <span>Lower is better</span>
      </div>
      <div className="search-work-grid">
        {metrics.map((metric) => {
          const max = Math.max(metric.focusValue, metric.baselineValue)
          const reduction = percentageReduction(metric.focusValue, metric.baselineValue)
          const columns = [
            { name: focusName, value: metric.focusValue, variant: 'focus' },
            { name: baselineName, value: metric.baselineValue, variant: 'baseline' },
          ]
          return (
            <figure className="search-work-item" key={metric.label}>
              <figcaption>{metric.label}</figcaption>
              <div className="search-work-chart">
                {columns.map((column) => (
                  <div className="search-work-column" key={column.variant}>
                    <strong>{metric.format(column.value)}</strong>
                    <div className="search-work-bar-track">
                      <span
                        className={`search-work-bar search-work-bar--${column.variant}`}
                        style={{ height: `${max === 0 ? 0 : (column.value / max) * 100}%` }}
                      />
                    </div>
                    <span>{column.name}</span>
                  </div>
                ))}
              </div>
              <small className="search-work-difference">
                {Math.abs(reduction).toFixed(1)}% {reduction >= 0 ? 'fewer' : 'more'} with{' '}
                {focusName}
              </small>
            </figure>
          )
        })}
      </div>
    </>
  )
}

function ReportHeading({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <div className="all-pairs-section-heading">
      <h3 id={id}>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function QualityProgress({
  name,
  value,
  total,
  variant,
}: {
  name: string
  value: number
  total: number
  variant: MethodRole
}) {
  const percent = total === 0 ? 0 : (value / total) * 100
  return (
    <div className="quality-row">
      <div className="quality-row__label">
        <span>{name}</span>
        <strong>
          {value}/{total} ({percent.toFixed(1)}%)
        </strong>
      </div>
      <div className="quality-track">
        <span
          className={`quality-fill quality-fill--${variant}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
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
