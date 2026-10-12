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
  error: string | null
  allPairsComparison: AllPairsComparison | null
  isMeasuringAllPairs: boolean
  allPairsError: string | null
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
    title: (row) =>
      row.timeUs === null
        ? 'Not timed'
        : `${row.timeUs.toFixed(2)} µs median per search (IQR ${row.timeP25Us?.toFixed(2)}–${row.timeP75Us?.toFixed(2)} µs)`,
  },
  {
    key: 'memory',
    label: 'Entries held',
    unit: 'frontier + tables',
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

const MEMORY_EXPLANATION =
  'Entries held by the search: the frontier at its largest, plus the closed set and cost tables (best cost and parent per city) when it finishes. Shorter bars are better.'

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
  error,
  allPairsComparison,
  isMeasuringAllPairs,
  allPairsError,
  selectedVariantId,
  disabled,
  onSelect,
  onClose,
}: ComparisonPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [reportSection, setReportSection] = useState<'selected-route' | 'all-routes'>(
    'selected-route',
  )
  if (comparison === null && !isMeasuring && error === null) return null

  const routeStatus = isMeasuring
    ? 'Measuring every method…'
    : error !== null
      ? `The comparison failed: ${error}`
      : null

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
          <p className="comparison-subtitle" role="status">
            {expanded
              ? reportSection === 'selected-route'
                ? (routeStatus ??
                  (comparison
                    ? `${cityName(comparison.start)} → ${cityName(comparison.goal)}`
                    : 'Selected route'))
                : 'Performance across every ordered pair of distinct cities'
              : (routeStatus ?? 'Click a row to show its route.')}
          </p>
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
            <SelectedRouteSection comparison={comparison} isStale={isMeasuring} />
          )}
          {reportSection === 'all-routes' && (
            <AllPairsSection
              comparison={allPairsComparison}
              isMeasuring={isMeasuringAllPairs}
              error={allPairsError}
            />
          )}
        </>
      )}
    </section>
  )
}

// ── report data, shared by both report tabs ─────────────────────────────────────

interface Timing {
  readonly medianUs: number
  readonly p25Us: number
  readonly p75Us: number
}

/** One method's numbers in the report, whether for one route or averaged over all of them. */
interface ReportMethod {
  readonly name: string
  readonly shortName: string
  readonly role: MethodRole
  readonly timing: Timing | null
  readonly work: readonly number[]
  readonly memory: readonly number[]
}

const WORK_LABELS = ['Nodes expanded', 'Nodes generated', 'Roads examined']
const MEMORY_PARTS = [
  { key: 'frontier', label: 'Peak frontier' },
  { key: 'closed', label: 'Closed set' },
  { key: 'cost', label: 'Cost tables' },
]

function routeMethod(row: VariantComparison): ReportMethod {
  return {
    name: row.name,
    shortName: shortName(row),
    role: methodRole(row.variantId),
    timing:
      row.timeUs === null || row.timeP25Us === null || row.timeP75Us === null
        ? null
        : { medianUs: row.timeUs, p25Us: row.timeP25Us, p75Us: row.timeP75Us },
    work: [row.nodesExpanded, row.nodesGenerated, row.edgesExamined],
    memory: [row.peakFrontierEntries, row.closedSetEntries, row.costTableEntries],
  }
}

function allPairsMethod(row: AllPairsVariantComparison): ReportMethod {
  return {
    name: row.name,
    shortName: shortName(row),
    role: methodRole(row.variantId),
    timing: {
      medianUs: row.medianSuiteTimeUs,
      p25Us: row.p25SuiteTimeUs,
      p75Us: row.p75SuiteTimeUs,
    },
    work: [row.averageNodesExpanded, row.averageNodesGenerated, row.averageEdgesExamined],
    memory: [
      row.averagePeakFrontierEntries,
      row.averageClosedSetEntries,
      row.averageCostTableEntries,
    ],
  }
}

/** Calls a winner only when the middle halves of the two timing samples don't overlap. */
function timingVerdict(focus: ReportMethod, baseline: ReportMethod): string {
  if (focus.timing === null || baseline.timing === null) return ''
  const difference = Math.abs(percentageReduction(focus.timing.medianUs, baseline.timing.medianUs))
  if (focus.timing.p75Us < baseline.timing.p25Us) {
    return `${focus.shortName} is ${difference.toFixed(1)}% faster`
  }
  if (focus.timing.p25Us > baseline.timing.p75Us) {
    return `${focus.shortName} is ${difference.toFixed(1)}% slower`
  }
  return 'Within measurement noise'
}

function SelectedRouteSection({
  comparison,
  isStale,
}: {
  comparison: RouteComparison
  isStale: boolean
}) {
  const focus = comparison.rows.find((row) => row.variantId === COMPARISON_FOCUS.id)
  const baseline = comparison.rows.find((row) => row.variantId === COMPARISON_BASELINE.id)
  if (focus === undefined || baseline === undefined) {
    return <div className="all-pairs-loading">The selected-route result is incomplete.</div>
  }

  const costAboveMinimum = (row: VariantComparison) =>
    row.pathCost === null || comparison.optimalCost === null
      ? null
      : Math.max(0, row.pathCost - comparison.optimalCost)

  return (
    <div className={`selected-route-report${isStale ? ' report--stale' : ''}`}>
      <ReportCards
        idPrefix="selected"
        focus={routeMethod(focus)}
        baseline={routeMethod(baseline)}
        timeDescription="Measured after warm-up for this selected route"
        timeHeading="Median execution time"
        formatTime={(us) => ({ value: us.toFixed(2), unit: 'µs' })}
        workTitle="Search work"
        formatWork={(value) => value.toFixed(0)}
        memoryDescription={MEMORY_EXPLANATION}
        formatMemory={(value) => value.toFixed(0)}
      />

      <section className="report-card" aria-labelledby="selected-quality-title">
        <ReportHeading
          id="selected-quality-title"
          title="Solution quality (path cost)"
          description={`Dijkstra reference minimum: ${comparison.optimalCost ?? 'unavailable'}`}
        />
        <QualityTable
          className="quality-table selected-quality-table"
          rows={comparison.rows}
          measures={[
            {
              label: 'Returned path cost',
              direction: 'Lower is better',
              format: (row) => String(row.pathCost ?? '—'),
              isBest: (row) => row.optimal,
            },
            {
              label: 'Cost above minimum',
              direction: 'Zero means optimal',
              format: (row) => {
                const overrun = costAboveMinimum(row)
                return overrun === null ? '—' : overrun === 0 ? '0' : `+${overrun}`
              },
              isBest: (row) => row.optimal,
            },
            {
              label: 'Result',
              direction: 'Compared with the reference',
              format: (row) => (row.optimal ? 'Optimal' : 'Suboptimal'),
              isBest: (row) => row.optimal,
            },
          ]}
        />
      </section>
    </div>
  )
}

function AllPairsSection({
  comparison,
  isMeasuring,
  error,
}: {
  comparison: AllPairsComparison | null
  isMeasuring: boolean
  error: string | null
}) {
  if (comparison === null) {
    return (
      <div className="all-pairs-loading" role="status">
        {error !== null
          ? `The all-routes benchmark failed: ${error}`
          : isMeasuring
            ? 'Benchmarking every route…'
            : 'Preparing the all-routes benchmark…'}
      </div>
    )
  }

  const focus = comparison.rows.find((row) => row.variantId === comparison.focusVariantId)
  const baseline = comparison.rows.find((row) => row.variantId === comparison.baselineVariantId)
  if (focus === undefined || baseline === undefined) {
    return <div className="all-pairs-loading">The benchmark result is incomplete.</div>
  }

  /** Marks the best value of a measure across every method. */
  const bestOf = (
    value: (row: AllPairsVariantComparison) => number,
    better: 'lower' | 'higher',
  ) => {
    const values = comparison.rows.map(value)
    const best = better === 'lower' ? Math.min(...values) : Math.max(...values)
    return (row: AllPairsVariantComparison) => value(row) === best
  }
  const percent = (value: number) => `${value.toFixed(2)}%`

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

      <ReportCards
        idPrefix="all-pairs"
        focus={allPairsMethod(focus)}
        baseline={allPairsMethod(baseline)}
        timeDescription={`Time for one complete ${comparison.pairCount}-route benchmark pass`}
        timeHeading="Median total time"
        formatTime={(us) => ({
          value: (us / 1_000).toFixed(2),
          unit: 'ms',
          detail: `${(us / comparison.pairCount).toFixed(2)} µs/route`,
        })}
        workTitle="Average search work per route"
        formatWork={(value) => value.toFixed(2)}
        memoryDescription={`Averaged per route. ${MEMORY_EXPLANATION}`}
        formatMemory={(value) => value.toFixed(2)}
      />

      <section className="report-card" aria-labelledby="solution-quality-title">
        <ReportHeading
          id="solution-quality-title"
          title="Solution quality (path cost)"
          description="Returned path costs compared with the minimum cost found by Dijkstra"
        />
        <QualityTable
          className="quality-table"
          rows={comparison.rows}
          measures={[
            {
              label: 'Average path cost',
              direction: 'Lower is better',
              format: (row) => row.averagePathCost.toFixed(2),
              isBest: bestOf((row) => row.averagePathCost, 'lower'),
            },
            {
              label: 'Optimal routes',
              direction: 'Higher is better',
              format: (row) => `${row.optimalRoutes}/${comparison.pairCount}`,
              isBest: bestOf((row) => row.optimalRoutes, 'higher'),
            },
            {
              label: 'Average cost overrun',
              direction: 'Lower is better',
              format: (row) => percent(row.averageCostOverrunPercent),
              isBest: bestOf((row) => row.averageCostOverrunPercent, 'lower'),
            },
            {
              label: 'Worst cost overrun',
              direction: 'Lower is better',
              format: (row) => percent(row.worstCostOverrunPercent),
              isBest: bestOf((row) => row.worstCostOverrunPercent, 'lower'),
            },
          ]}
        />
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
                  Cost tables
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
                  {[
                    `${row.validRoutes}/${comparison.pairCount}`,
                    `${row.optimalRoutes}/${comparison.pairCount}`,
                    row.averagePathCost.toFixed(2),
                    percent(row.averageCostOverrunPercent),
                    row.averageNodesExpanded.toFixed(2),
                    row.averageNodesGenerated.toFixed(2),
                    row.averageEdgesExamined.toFixed(2),
                    row.averagePeakFrontierEntries.toFixed(2),
                    row.averageClosedSetEntries.toFixed(2),
                    row.averageCostTableEntries.toFixed(2),
                  ].map((value, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the columns are fixed
                    <td key={index}>
                      <span className="comparison-value">{value}</span>
                    </td>
                  ))}
                  <td
                    title={`IQR: ${(row.p25SuiteTimeUs / 1_000).toFixed(2)}–${(row.p75SuiteTimeUs / 1_000).toFixed(2)} ms`}
                  >
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
        One timing pass runs all {comparison.pairCount} routes. Each trial times every method once,
        rotating which goes first, and the report shows the median trial with the interquartile
        range (IQR, the middle half of trials) as its spread. A method is only called faster when
        those ranges don't overlap. Timing excludes the one-time NTB lookup-table preprocessing,
        which runs when the benchmark worker loads. Browser timing can vary between runs.
      </p>
    </div>
  )
}

function percentageReduction(focus: number, baseline: number): number {
  return baseline === 0 ? 0 : ((baseline - focus) / baseline) * 100
}

// ── report blocks ───────────────────────────────────────────────────────────────

function ReportCards({
  idPrefix,
  focus,
  baseline,
  timeDescription,
  timeHeading,
  formatTime,
  workTitle,
  formatWork,
  memoryDescription,
  formatMemory,
}: {
  idPrefix: string
  focus: ReportMethod
  baseline: ReportMethod
  timeDescription: string
  timeHeading: string
  formatTime: (us: number) => { value: string; unit: string; detail?: string }
  workTitle: string
  formatWork: (value: number) => string
  memoryDescription: string
  formatMemory: (value: number) => string
}) {
  const methods = [focus, baseline]
  const timeMax = Math.max(...methods.map((method) => method.timing?.medianUs ?? 0))
  const memoryTotals = methods.map((method) => method.memory.reduce((sum, value) => sum + value, 0))
  const memoryMax = Math.max(...memoryTotals)

  return (
    <>
      <section className="report-card" aria-labelledby={`${idPrefix}-execution-title`}>
        <ReportHeading
          id={`${idPrefix}-execution-title`}
          title="Execution performance"
          description={timeDescription}
        />
        <div className="suite-time-heading">
          <strong>{timeHeading}</strong>
          <span>{timingVerdict(focus, baseline)}</span>
        </div>
        <div className="suite-time-comparison">
          {methods.map((method) => {
            const timing = method.timing
            const median = timing === null ? null : formatTime(timing.medianUs)
            return (
              <div className="suite-time-row" key={method.role}>
                <strong className="suite-time-method">{method.name}</strong>
                <div className="suite-time-track">
                  <span
                    className={`suite-time-fill suite-time-fill--${method.role}`}
                    style={{
                      width: `${timing === null || timeMax === 0 ? 0 : (timing.medianUs / timeMax) * 100}%`,
                    }}
                  />
                </div>
                <div className="suite-time-value">
                  <strong className="suite-time-value__total">
                    {median === null ? '—' : `${median.value} ${median.unit}`}
                  </strong>
                  {median?.detail && (
                    <small className="suite-time-value__route">{median.detail}</small>
                  )}
                  {timing !== null && (
                    <small
                      className="suite-time-value__route"
                      title="Interquartile range: the middle half of the timing trials"
                    >
                      IQR {formatTime(timing.p25Us).value}–{formatTime(timing.p75Us).value}{' '}
                      {median?.unit}
                    </small>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <SearchWorkComparison
          title={workTitle}
          focus={focus}
          baseline={baseline}
          format={formatWork}
        />
      </section>

      <section className="report-card" aria-labelledby={`${idPrefix}-memory-title`}>
        <ReportHeading
          id={`${idPrefix}-memory-title`}
          title="Memory usage"
          description={memoryDescription}
        />
        <div className="memory-legend">
          {MEMORY_PARTS.map((part) => (
            <span key={part.key}>
              <i className={`memory-key memory-key--${part.key}`} />
              {part.label}
            </span>
          ))}
        </div>
        <div className="memory-comparison">
          {methods.map((method, index) => (
            <div className="memory-row" key={method.role}>
              <div className="memory-row__heading">
                <strong>{method.name}</strong>
                <span>{formatMemory(memoryTotals[index] ?? 0)} entries held</span>
              </div>
              <div className="memory-track">
                {MEMORY_PARTS.map((part, partIndex) => {
                  const value = method.memory[partIndex] ?? 0
                  return (
                    <span
                      className={`memory-segment memory-segment--${part.key}`}
                      key={part.key}
                      style={{ width: `${memoryMax === 0 ? 0 : (value / memoryMax) * 100}%` }}
                      title={`${part.label}: ${formatMemory(value)}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function SearchWorkComparison({
  title,
  focus,
  baseline,
  format,
}: {
  title: string
  focus: ReportMethod
  baseline: ReportMethod
  format: (value: number) => string
}) {
  return (
    <>
      <div className="search-work-heading">
        <strong>{title}</strong>
        <span>Lower is better</span>
      </div>
      <div className="search-work-grid">
        {WORK_LABELS.map((label, index) => {
          const focusValue = focus.work[index] ?? 0
          const baselineValue = baseline.work[index] ?? 0
          const max = Math.max(focusValue, baselineValue)
          const reduction = percentageReduction(focusValue, baselineValue)
          return (
            <figure className="search-work-item" key={label}>
              <figcaption>{label}</figcaption>
              <div className="search-work-chart">
                {[
                  { method: focus, value: focusValue },
                  { method: baseline, value: baselineValue },
                ].map(({ method, value }) => (
                  <div className="search-work-column" key={method.role}>
                    <strong>{format(value)}</strong>
                    <div className="search-work-bar-track">
                      <span
                        className={`search-work-bar search-work-bar--${method.role}`}
                        style={{ height: `${max === 0 ? 0 : (value / max) * 100}%` }}
                      />
                    </div>
                    <span>{method.shortName}</span>
                  </div>
                ))}
              </div>
              <small className="search-work-difference">
                {Math.abs(reduction).toFixed(1)}% {reduction >= 0 ? 'fewer' : 'more'} with{' '}
                {focus.shortName}
              </small>
            </figure>
          )
        })}
      </div>
    </>
  )
}

interface QualityMeasure<Row> {
  readonly label: string
  readonly direction: string
  readonly format: (row: Row) => string
  readonly isBest: (row: Row) => boolean
}

/** One column per method, so methods outside the focus pair still show their route quality. */
function QualityTable<Row extends { variantId: string; name: string }>({
  className,
  rows,
  measures,
}: {
  className: string
  rows: readonly Row[]
  measures: readonly QualityMeasure<Row>[]
}) {
  return (
    <table className={className}>
      <thead>
        <tr className="quality-table__heading-row">
          <th className="quality-table__cell quality-table__measure" scope="col">
            Measure
          </th>
          {rows.map((row) => (
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
        {measures.map((measure) => (
          <tr className="quality-table__row" key={measure.label}>
            <th className="quality-table__cell quality-table__measure" scope="row">
              <strong className="quality-table__label">{measure.label}</strong>
              <small className="quality-table__direction">{measure.direction}</small>
            </th>
            {rows.map((row) => (
              <td
                key={row.variantId}
                className={`quality-table__cell quality-table__value${measure.isBest(row) ? ' quality-value--best' : ''}`}
              >
                {measure.format(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
