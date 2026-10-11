/**
 * RingDiagram — the NTB heuristic drawn as nested rings around the goal.
 *
 * Each city sits on the ring for its number of roads to the goal, at its real
 * compass direction from the goal. The highlighted roads are the cheapest way
 * out of each ring for the selected city; their sum is h.
 */

import { useMemo, useState } from 'react'
import { cities } from '../../data/cities'
import type { CityId } from '../../data/cityIds'
import { edges, romaniaGraph } from '../../data/graph'
import { ringColor, STATUS_COLOR } from '../../lib/theme'
import { explainNtb } from '../../search/heuristics/ntbBreakdown'

interface RingDiagramProps {
  start: CityId
  goal: CityId
}

const SIZE = 560
const CENTER = SIZE / 2
const OUTER = SIZE / 2 - 40
const INNER = 78

function ringRadius(ring: number, maxRing: number): number {
  if (ring === 0) return 0
  return maxRing === 1 ? OUTER : INNER + ((ring - 1) / (maxRing - 1)) * (OUTER - INNER)
}
const cityName = (id: string) => cities[id]?.name ?? id

/**
 * Even spacing around one ring, kept in compass order and rotated to sit as close
 * as possible to the real directions. Real directions alone pile up in the west,
 * where most of the map lies.
 */
function angularGap(a: number, b: number): number {
  const d = Math.abs(((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)
  return d
}

/** Rotates a ring by up to half a step so its cities fall between the inner ring's. */
function stagger(angles: readonly number[], inner: readonly number[]): number[] {
  if (angles.length <= 1 || inner.length === 0) return [...angles]
  const step = (2 * Math.PI) / angles.length
  let best = [...angles]
  let bestScore = -Infinity
  for (const shift of [0, -0.25, 0.25, -0.5, 0.5]) {
    const moved = angles.map((a) => a + shift * step)
    const clearance = Math.min(...moved.flatMap((a) => inner.map((b) => angularGap(a, b))))
    // Prefer clearance, then staying close to the real directions.
    const score = Math.min(clearance, 0.35) - Math.abs(shift) * 0.02
    if (score > bestScore) {
      bestScore = score
      best = moved
    }
  }
  return best
}

function evenAngles(real: readonly number[]): number[] {
  const n = real.length
  if (n <= 1) return [...real]
  const order = real.map((a, i) => ({ a, i })).sort((x, y) => x.a - y.a)
  const step = (2 * Math.PI) / n
  // Circular mean of (real − even) gives the best rotation.
  let sx = 0
  let sy = 0
  order.forEach(({ a }, k) => {
    sx += Math.cos(a - k * step)
    sy += Math.sin(a - k * step)
  })
  const offset = Math.atan2(sy, sx)
  const out = [...real]
  order.forEach(({ i }, k) => {
    out[i] = offset + k * step
  })
  return out
}

/** Middle of the widest empty arc on a ring, for its label. */
function labelAngle(angles: readonly number[]): number {
  if (angles.length === 0) return -Math.PI / 2
  const sorted = [...angles].map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
  sorted.sort((a, b) => a - b)
  let best = -Math.PI / 2
  let widest = -1
  sorted.forEach((a, k) => {
    const next = k === sorted.length - 1 ? (sorted[0] ?? a) + 2 * Math.PI : (sorted[k + 1] ?? a)
    if (next - a > widest) {
      widest = next - a
      best = (a + next) / 2
    }
  })
  return best
}

/** Toll labels sit beside their road, on the side away from the goal. */
function tollOffset(a: [number, number], b: [number, number]): [number, number] {
  const mx = (a[0] + b[0]) / 2 - CENTER
  const my = (a[1] + b[1]) / 2 - CENTER
  let nx = -(b[1] - a[1])
  let ny = b[0] - a[0]
  const len = Math.hypot(nx, ny) || 1
  nx /= len
  ny /= len
  if (nx * mx + ny * my < 0) {
    nx = -nx
    ny = -ny
  }
  return [nx * 12, ny * 12]
}

/** Labels sit just outside each dot, pointing away from the goal. */
function CityLabel({ x, y, name }: { x: number; y: number; name: string }) {
  const dx = x - CENTER
  const dy = y - CENTER
  const len = Math.hypot(dx, dy)
  if (len < 1) {
    return (
      <text x={x} y={y + 24} className="ring-city" textAnchor="middle">
        {name}
      </text>
    )
  }
  const ux = dx / len
  const uy = dy / len
  const anchor = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle'
  return (
    <text
      x={x + ux * 13}
      y={y + uy * 13 + (uy > 0.35 ? 9 : uy < -0.35 ? -2 : 4)}
      className="ring-city"
      textAnchor={anchor}
    >
      {name}
    </text>
  )
}

export default function RingDiagram({ start, goal }: RingDiagramProps) {
  const [selected, setSelected] = useState<CityId>(start)
  const city = selected === goal ? start : selected

  const breakdown = useMemo(() => explainNtb(romaniaGraph, city, goal), [city, goal])

  const layout = useMemo(() => {
    const { hops } = breakdown
    const maxRing = Math.max(1, ...hops.values())
    const goalPos = cities[goal]?.position ?? [0, 0, 0]
    const points = new Map<CityId, [number, number]>()
    const labels = new Map<number, number>()
    let innerAngles: number[] = []

    for (let ring = 0; ring <= maxRing; ring += 1) {
      const members = [...hops].filter(([, h]) => h === ring).map(([id]) => id)
      const raw = members.map((id) => {
        const p = cities[id]?.position ?? goalPos
        return Math.atan2(p[2] - goalPos[2], p[0] - goalPos[0])
      })
      const radius = ringRadius(ring, maxRing)
      const angles = stagger(evenAngles(raw), innerAngles)
      innerAngles = angles
      labels.set(ring, labelAngle(angles))
      members.forEach((id, i) => {
        const a = angles[i] ?? 0
        points.set(id, [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)])
      })
    }
    return { maxRing, points, labels }
  }, [breakdown, goal])

  const tollKeys = new Set(breakdown.tolls.map((t) => `${t.road.from}-${t.road.to}`))
  const displayedTolls = [...breakdown.tolls].sort(
    (left, right) => left.threshold - right.threshold,
  )
  const at = (id: CityId) => layout.points.get(id)

  return (
    <section className="ring-diagram">
      <div className="ring-diagram-head">
        <h2>The NTB rings around {cityName(goal)}</h2>
        <p>
          Each ring holds the cities that many roads from {cityName(goal)}. Every route inward has
          to cross each ring boundary once, and each crossing costs at least the cheapest road
          across it. Click any city to see its tolls.
        </p>
      </div>

      <div className="ring-diagram-body">
        <svg className="ring-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-labelledby="ring-svg-title">
          <title id="ring-svg-title">NTB rings around {cityName(goal)}</title>
          {Array.from({ length: layout.maxRing }, (_, i) => layout.maxRing - i).map((ring) => (
            <g key={ring}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={ringRadius(ring, layout.maxRing)}
                fill="none"
                stroke={ringColor(ring)}
                strokeOpacity={0.35}
                strokeWidth={ring <= (breakdown.hops.get(city) ?? 0) ? 2 : 1}
                strokeDasharray={ring <= (breakdown.hops.get(city) ?? 0) ? undefined : '4 4'}
              />
              <text
                x={
                  CENTER + ringRadius(ring, layout.maxRing) * Math.cos(layout.labels.get(ring) ?? 0)
                }
                y={
                  CENTER +
                  ringRadius(ring, layout.maxRing) * Math.sin(layout.labels.get(ring) ?? 0) +
                  4
                }
                className="ring-label"
                textAnchor="middle"
              >
                {ring} {ring === 1 ? 'road' : 'roads'}
              </text>
            </g>
          ))}

          {edges.map(({ from, to, distance }) => {
            const a = at(from)
            const b = at(to)
            if (!a || !b) return null
            const toll = tollKeys.has(`${from}-${to}`)
            return (
              <g key={`${from}-${to}`}>
                <line
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={toll ? STATUS_COLOR.goal : '#d6cdb2'}
                  strokeWidth={toll ? 3 : 1}
                />
                {toll && (
                  <text
                    x={(a[0] + b[0]) / 2 + tollOffset(a, b)[0]}
                    y={(a[1] + b[1]) / 2 + tollOffset(a, b)[1] + 4}
                    className="ring-toll"
                    textAnchor="middle"
                  >
                    {distance}
                  </text>
                )}
              </g>
            )
          })}

          {[...layout.points].map(([id, [x, y]]) => {
            const ring = breakdown.hops.get(id) ?? 0
            const isGoal = id === goal
            const isCity = id === city
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG node cannot be a <button>
              <g
                key={id}
                className="ring-node"
                role="button"
                tabIndex={0}
                aria-label={`Show tolls for ${cityName(id)}`}
                onClick={() => setSelected(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelected(id)
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isGoal || isCity ? 9 : 6.5}
                  fill={isGoal ? STATUS_COLOR.goal : isCity ? STATUS_COLOR.start : ringColor(ring)}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <CityLabel x={x} y={y} name={cityName(id)} />
              </g>
            )
          })}
        </svg>

        <div className="ring-ladder">
          <h3>
            h({cityName(city)}) = {breakdown.total}
          </h3>
          <ol>
            {displayedTolls.map((toll) => (
              <li key={toll.threshold}>
                <span
                  className="ring-swatch"
                  style={{ background: ringColor(toll.threshold) }}
                  aria-hidden="true"
                />
                Leave ring {toll.threshold}: {toll.road.distance} ({''}
                <strong>
                  {cityName(toll.road.from)}–{cityName(toll.road.to)}
                </strong>
                )
              </li>
            ))}
          </ol>
          <p className="ring-sum">
            {displayedTolls.map((t) => t.road.distance).join(' + ')} = {breakdown.total}
          </p>
          <p className="ring-note">
            A real route may use different roads, but it must cross every one of these boundaries,
            and no crossing is cheaper than the toll shown. So h never overestimates, and A* stays
            optimal.
          </p>
        </div>
      </div>
    </section>
  )
}
