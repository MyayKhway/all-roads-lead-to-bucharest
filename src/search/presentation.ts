import type { CityId } from '@/data/cityIds'
import { romaniaGraph } from '@/data/graph'
import { executeSearch } from '@/search/evaluation/execution'
import type { SearchMetrics } from '@/search/evaluation/metrics'
import type { SearchVariant } from '@/search/variant'

/** One neighbour checked while its parent was expanded. */
export interface ReplayCandidate {
  readonly city: CityId
  readonly g: number
  /** Null for blind searches and for roads that offered no better route. */
  readonly h: number | null
  readonly f: number | null
  /** False when the road was examined but gave no cheaper (or first) route. */
  readonly improved: boolean
}

/** One expansion, in the order the search performed it. */
export interface ReplayStep {
  readonly city: CityId
  readonly g: number
  readonly h: number | null
  readonly candidates: readonly ReplayCandidate[]
}

/** One variant's answer for the UI: the route plus how much work finding it took. */
export interface RouteRun {
  readonly variant: SearchVariant
  readonly path: readonly CityId[]
  readonly pathCost: number
  /** Cities in the order the search expanded them. */
  readonly expandedOrder: readonly CityId[]
  readonly steps: readonly ReplayStep[]
  readonly metrics: SearchMetrics
}

interface MutableStep {
  readonly city: CityId
  readonly g: number
  readonly h: number | null
  readonly improved: ReplayCandidate[]
}

/** Adds the roads each step examined without improving, in adjacency order. */
function completeSteps(steps: readonly MutableStep[]): ReplayStep[] {
  return steps.map((step, index) => {
    const improvedByCity = new Map(step.improved.map((c) => [c.city, c]))
    const roads = romaniaGraph.adjacency[step.city] ?? []
    // A search that stops on generation (BFS) never looks past the goal's road.
    const lastImproved = step.improved.at(-1)?.city
    const examined =
      index === steps.length - 1 && lastImproved !== undefined
        ? roads.slice(0, roads.findIndex((road) => road.city === lastImproved) + 1)
        : roads

    const candidates = examined.map(
      (road): ReplayCandidate =>
        improvedByCity.get(road.city) ?? {
          city: road.city,
          g: step.g + road.distance,
          h: null,
          f: null,
          improved: false,
        },
    )
    return { city: step.city, g: step.g, h: step.h, candidates }
  })
}

/** Runs one registered variant on the Romania map; null when the goal is unreachable. */
export function runRoute(variant: SearchVariant, start: CityId, goal: CityId): RouteRun | null {
  const estimates = new Map<CityId, number>()
  const steps: MutableStep[] = []

  const { result, metrics } = executeSearch({
    problem: { graph: romaniaGraph, start, goal },
    algorithm: variant.algorithm,
    ...(variant.heuristic === undefined ? {} : { heuristic: variant.heuristic }),
    eventListener: (event) => {
      if (event.type === 'heuristic-evaluated') {
        estimates.set(event.city, event.heuristicValue)
      } else if (event.type === 'node-expanded') {
        steps.push({
          city: event.city,
          g: event.pathCost,
          h: estimates.get(event.city) ?? null,
          improved: [],
        })
      } else if (
        (event.type === 'node-discovered' || event.type === 'node-updated') &&
        event.parent !== null
      ) {
        const h = estimates.get(event.city) ?? null
        steps.at(-1)?.improved.push({
          city: event.city,
          g: event.pathCost,
          h,
          f: h === null ? null : event.pathCost + h,
          improved: true,
        })
      }
    },
  })

  if (result.status !== 'success') return null
  const replaySteps = completeSteps(steps)
  return {
    variant,
    path: result.path,
    pathCost: result.pathCost,
    expandedOrder: replaySteps.map((step) => step.city),
    steps: replaySteps,
    metrics,
  }
}
