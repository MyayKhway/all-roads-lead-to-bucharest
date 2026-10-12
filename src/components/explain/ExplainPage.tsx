/**
 * ExplainPage — a full page that walks through every expansion of one search:
 * the queue it chose from, why that city won, and what each road it checked did.
 */

import { useMemo, useState } from 'react'
import { cities } from '../../data/cities'
import { type CityId, isCityId } from '../../data/cityIds'
import { romaniaGraph } from '../../data/graph'
import {
  type ExplainedStep,
  explainRun,
  type QueueOrder,
  queueOrderOf,
} from '../../search/explanation'
import { explainNtb } from '../../search/heuristics/ntbBreakdown'
import { runRoute } from '../../search/presentation'
import { presentationVariants } from '../../search/registry'
import type { SearchVariant } from '../../search/variant'
import RingDiagram from './RingDiagram'
import StepMap from './StepMap'

interface ExplainPageProps {
  startCity: string
  goalCity: string
  initialVariantId: string
  onBack: () => void
}

const cityName = (id: string) => cities[id]?.name ?? id
const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

const HOW_IT_PICKS: Record<QueueOrder, string> = {
  f: 'A* keeps a priority queue ordered by f(n) = g(n) + h(n): the road distance travelled so far plus the heuristic estimate of what remains. It always expands the city with the lowest f. Because h never overestimates, the first time the goal is taken from the queue its route is the shortest.',
  g: 'Uniform-cost search orders its queue by g(n) alone, the road distance travelled so far. It always expands the cheapest city reached so far, so it finds the shortest route, but it has no sense of direction and spreads out evenly.',
  fifo: 'Breadth-first search uses a first-in, first-out queue and ignores road lengths. It expands cities in the order it found them, layer by layer, and stops as soon as it generates the goal. That gives the route with the fewest roads, which is not always the shortest.',
}

const HEURISTIC_NOTES: Record<string, string> = {
  'astar-alt':
    'ALT (landmarks and the triangle inequality): shortest distances from three far-apart landmark cities are computed once. For any landmark L, the triangle inequality gives d(n, goal) ≥ |d(L, goal) − d(L, n)|. h is the largest of these bounds, so it never overestimates.',
}

function priorityLabel(order: QueueOrder): string {
  return order === 'f' ? 'f = g + h' : order === 'g' ? 'g' : 'Arrival'
}

function whyPicked(explained: ExplainedStep, order: QueueOrder): string {
  const picked = explained.queue.find((e) => e.picked)
  const name = cityName(explained.step.city)
  if (!picked) return ''
  if (explained.index === 0) return `The search starts at ${name}, the only city in the queue.`
  const rivals = explained.queue.length - 1
  const others =
    rivals === 0
      ? 'It is the only city waiting.'
      : `It beats ${rivals} other waiting ${rivals === 1 ? 'city' : 'cities'}.`
  if (order === 'fifo')
    return `${name} was reached earliest among the waiting cities, so BFS takes it next. ${others}`
  const value =
    order === 'f'
      ? `f = ${fmt(picked.g)} + ${fmt(picked.h ?? 0)} = ${fmt(picked.priority)}`
      : `g = ${fmt(picked.g)}`
  return `${name} has the lowest ${order === 'f' ? 'f' : 'g'} in the queue (${value}). ${others}`
}

function outcomeText(outcome: string, order: QueueOrder): string {
  switch (outcome) {
    case 'added':
      return 'added to the queue'
    case 'updated':
      return 'cheaper route: replaces the queued one'
    case 'already reached':
      return 'already reached: BFS keeps the first route'
    default:
      return order === 'f' || order === 'g' ? 'no cheaper route' : 'skipped'
  }
}

function StepSection({
  explained,
  variant,
  start,
  goal,
  isLast,
}: {
  explained: ExplainedStep
  variant: SearchVariant
  start: CityId
  goal: CityId
  isLast: boolean
}) {
  const order = queueOrderOf(variant)
  const informed = order === 'f'
  const { step } = explained
  const parent = explained.queue.find((e) => e.picked)?.parent ?? null

  return (
    <section className="explain-step">
      <StepMap
        current={step.city}
        parent={parent}
        expanded={explained.expandedBefore}
        frontier={explained.frontierAfter}
        start={start}
        goal={goal}
      />
      <div className="explain-step-body">
        <h3>
          Step {explained.index + 1} — expand {cityName(step.city)}
        </h3>
        <p className="explain-why">{whyPicked(explained, order)}</p>
        {variant.id === 'astar-ntb' && step.city !== goal && (
          <p className="explain-why explain-ntb">
            Its h comes from the ring tolls: {(() => {
              const b = explainNtb(romaniaGraph, step.city, goal)
              return `h(${cityName(step.city)}) = ${b.tolls.map((t) => t.road.distance).join(' + ')} = ${b.total}`
            })()}.
          </p>
        )}

        <h4>Queue before this step</h4>
        <table className="explain-table">
          <thead>
            <tr>
              <th scope="col">City</th>
              <th scope="col">g</th>
              {informed && <th scope="col">h</th>}
              <th scope="col">{priorityLabel(order)}</th>
              <th scope="col">From</th>
              <th scope="col">Decision</th>
            </tr>
          </thead>
          <tbody>
            {explained.queue.map((entry) => (
              <tr key={entry.city} className={entry.picked ? 'is-picked' : undefined}>
                <td>{cityName(entry.city)}</td>
                <td>{fmt(entry.g)}</td>
                {informed && <td>{entry.h === null ? '—' : fmt(entry.h)}</td>}
                <td>{order === 'fifo' ? `#${entry.priority + 1}` : fmt(entry.priority)}</td>
                <td>{entry.parent ? cityName(entry.parent) : 'start'}</td>
                <td>{entry.picked ? 'expand next' : 'waits'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4>Roads from {cityName(step.city)}</h4>
        {explained.candidates.length === 0 ? (
          <p className="explain-why">
            {isLast && step.city === goal
              ? `${cityName(goal)} is the goal, so the search stops as soon as it is taken from the queue.`
              : 'No roads were checked.'}
          </p>
        ) : (
          <table className="explain-table">
            <thead>
              <tr>
                <th scope="col">Neighbour</th>
                <th scope="col">g = {fmt(step.g)} + road</th>
                {informed && <th scope="col">h</th>}
                {informed && <th scope="col">f</th>}
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {explained.candidates.map((c) => (
                <tr key={c.city} className={c.improved ? undefined : 'is-stale'}>
                  <td>{cityName(c.city)}</td>
                  <td>{fmt(c.g)}</td>
                  {informed && <td>{c.h === null ? '—' : fmt(c.h)}</td>}
                  {informed && <td>{c.f === null ? '—' : fmt(c.f)}</td>}
                  <td>
                    {isLast && c.city === goal && order === 'fifo'
                      ? 'goal generated: BFS stops here'
                      : outcomeText(c.outcome, order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isLast && step.city !== goal && (
          <p className="explain-why">
            {cityName(goal)} was generated here, and BFS tests for the goal as soon as a city is
            generated, so the search stops.
          </p>
        )}
      </div>
    </section>
  )
}

export default function ExplainPage({
  startCity,
  goalCity,
  initialVariantId,
  onBack,
}: ExplainPageProps) {
  const [variantId, setVariantId] = useState(initialVariantId)
  const variant = presentationVariants.find((v) => v.id === variantId) ?? presentationVariants[0]

  const pair = useMemo(
    () =>
      isCityId(startCity) && isCityId(goalCity) && startCity !== goalCity
        ? { start: startCity, goal: goalCity }
        : null,
    [startCity, goalCity],
  )
  const run = useMemo(
    () => (variant && pair ? runRoute(variant, pair.start, pair.goal) : null),
    [variant, pair],
  )
  const explained = useMemo(() => (run ? explainRun(run) : []), [run])

  return (
    <div className="explain-page">
      <header className="explain-header">
        <button type="button" className="btn btn-secondary explain-back" onClick={onBack}>
          ← Back to map
        </button>
        <div>
          <h1>How the search chose this route</h1>
          <p>
            {cityName(startCity)} → {cityName(goalCity)}
          </p>
        </div>
      </header>

      <nav className="explain-tabs" aria-label="Search method">
        {presentationVariants.map((v) => (
          <button
            key={v.id}
            type="button"
            className={v.id === variant?.id ? 'is-active' : undefined}
            aria-pressed={v.id === variant?.id}
            onClick={() => setVariantId(v.id)}
          >
            {v.name}
          </button>
        ))}
      </nav>

      {!run || !variant || !pair ? (
        <p className="explain-empty">Choose a start and a destination on the map first.</p>
      ) : (
        <main className="explain-main">
          <section className="explain-summary">
            <div>
              <span className="explain-summary-label">Route</span>
              <span>{run.path.map(cityName).join(' → ')}</span>
            </div>
            <div>
              <span className="explain-summary-label">Distance</span>
              <span>{run.pathCost}</span>
            </div>
            <div>
              <span className="explain-summary-label">Cities expanded</span>
              <span>{run.steps.length}</span>
            </div>
          </section>

          <section className="explain-how">
            <h2>How {variant.name} picks the next city</h2>
            {variant.id === 'astar-ntb' ? (
              <>
                <p>A* chooses the next city using:</p>
                <p className="explain-formula">
                  f(n) = g(n) + h<sub>NTB</sub>(n)
                </p>
                <ul className="explain-definitions">
                  <li>
                    <strong>g(n)</strong> = road cost already travelled
                  </li>
                  <li>
                    <strong>
                      h<sub>NTB</sub>(n)
                    </strong>{' '}
                    = estimated remaining cost to the goal
                  </li>
                  <li>
                    <strong>f(n)</strong> = estimated total path cost
                  </li>
                </ul>
                <p>
                  A* expands the city with the smallest <strong>f(n)</strong>.
                </p>
              </>
            ) : (
              <>
                <p>{HOW_IT_PICKS[queueOrderOf(variant)]}</p>
                {HEURISTIC_NOTES[variant.id] && <p>{HEURISTIC_NOTES[variant.id]}</p>}
              </>
            )}
            {variant.id === 'astar-ntb' && (
              <details className="explain-heuristic-details">
                <summary>Heuristics detail</summary>
                <div className="explain-process-part">
                  <h3>1. Build the rings</h3>
                  <p>First, NTB runs BFS from the goal.</p>
                  <p>For every city v, it calculates:</p>
                  <p className="explain-formula">
                    d<sub>t</sub>(v) = minimum road hops from v to goal t
                  </p>
                  <p>Cities with the same hop distance form nested rings around the goal:</p>
                  <ul>
                    <li>goal = hop 0</li>
                    <li>direct neighbors = hop 1</li>
                    <li>the next cities = hop 2, and so on</li>
                  </ul>
                </div>

                <div className="explain-process-part">
                  <h3>2. Find the toll for each ring</h3>
                  <p>For each ring:</p>
                  <ul>
                    <li>
                      Starting from the current city, use BFS to find its connected region without
                      crossing inward past that ring.
                    </li>
                    <li>Check the roads that cross from inside that region to outside.</li>
                    <li>Choose the cheapest crossing road.</li>
                  </ul>
                  <p>That cheapest crossing cost is the toll for the ring.</p>
                  <p className="explain-formula">
                    b<sub>k</sub>(n) = min w(u,v)
                  </p>
                  <p>where the road (u,v) crosses the boundary of ring k.</p>
                </div>

                <div className="explain-process-part">
                  <h3>3. Sum the tolls</h3>
                  <p>NTB adds the minimum toll for every required ring:</p>
                  <p className="explain-formula explain-sum-formula">
                    <span>
                      h<sub>NTB</sub>(n) =
                    </span>
                    <span className="explain-sum-operator">
                      <span className="explain-sum-limit explain-sum-limit--upper">
                        d<sub>t</sub>(n)
                      </span>
                      <span className="explain-sum-symbol">∑</span>
                      <span className="explain-sum-limit explain-sum-limit--lower">k = 1</span>
                    </span>
                    <span>
                      b<sub>k</sub>(n)
                    </span>
                  </p>
                  <p>This estimates the remaining cost from the current city to the goal.</p>
                </div>
              </details>
            )}
          </section>

          {variant.id === 'astar-ntb' && (
            <RingDiagram key={pair.goal} start={pair.start} goal={pair.goal} />
          )}

          {explained.map((step, index) => (
            <StepSection
              key={`${variant.id}-${step.index}`}
              explained={step}
              variant={variant}
              start={pair.start}
              goal={pair.goal}
              isLast={index === explained.length - 1}
            />
          ))}
        </main>
      )}
    </div>
  )
}
