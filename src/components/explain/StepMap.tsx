/**
 * StepMap — a small top-down map of what the search has seen at one step.
 */

import { cities } from '../../data/cities'
import type { CityId } from '../../data/cityIds'
import { edges } from '../../data/graph'
import { STATUS_COLOR } from '../../lib/theme'

interface StepMapProps {
  current: CityId
  parent: CityId | null
  expanded: readonly string[]
  frontier: readonly string[]
  start: CityId
  goal: CityId
}

const PAD = 1
const xs = Object.values(cities).map((c) => c.position[0])
const zs = Object.values(cities).map((c) => c.position[2])
const minX = Math.min(...xs) - PAD
const minZ = Math.min(...zs) - PAD
const width = Math.max(...xs) + PAD - minX
const height = Math.max(...zs) + PAD - minZ

function point(id: string): [number, number] {
  const p = cities[id]?.position ?? [0, 0, 0]
  return [p[0] - minX, p[2] - minZ]
}

export default function StepMap({
  current,
  parent,
  expanded,
  frontier,
  start,
  goal,
}: StepMapProps) {
  const colorOf = (id: string): string => {
    if (id === current) return STATUS_COLOR.current
    if (id === start) return STATUS_COLOR.start
    if (id === goal) return STATUS_COLOR.goal
    if (frontier.includes(id)) return STATUS_COLOR.frontier
    if (expanded.includes(id)) return STATUS_COLOR.explored
    return '#d9d2bd'
  }

  return (
    <svg
      className="step-map"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Map at this step: expanding ${cities[current]?.name ?? current}`}
    >
      {edges.map(({ from, to }) => {
        const [x1, y1] = point(from)
        const [x2, y2] = point(to)
        const reached = (from === current && to === parent) || (to === current && from === parent)
        return (
          <line
            key={`${from}-${to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={reached ? STATUS_COLOR.current : '#cfc6aa'}
            strokeWidth={reached ? 0.14 : 0.07}
          />
        )
      })}
      {Object.values(cities).map((city) => {
        const [x, y] = point(city.id)
        const isCurrent = city.id === current
        return (
          <g key={city.id}>
            <circle
              cx={x}
              cy={y}
              r={isCurrent ? 0.36 : 0.24}
              fill={colorOf(city.id)}
              stroke="#ffffff"
              strokeWidth={0.06}
            />
            {(isCurrent || city.id === start || city.id === goal) && (
              <text x={x} y={y - 0.5} className="step-map-label" textAnchor="middle">
                {city.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
