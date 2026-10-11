import type { CityId } from '@/data/cityIds'
import type { ReplayCandidate, ReplayStep, RouteRun } from '@/search/presentation'
import type { SearchVariant } from '@/search/variant'

/** How a variant orders its frontier: A* by f, UCS by g, BFS first-in first-out. */
export type QueueOrder = 'f' | 'g' | 'fifo'

export interface QueueEntry {
  readonly city: CityId
  readonly g: number
  readonly h: number | null
  /** The value the queue is ordered by (f, g, or arrival order). */
  readonly priority: number
  readonly parent: CityId | null
  readonly picked: boolean
}

export type CandidateOutcome = 'added' | 'updated' | 'no gain' | 'already reached'

export interface ExplainedCandidate extends ReplayCandidate {
  readonly outcome: CandidateOutcome
}

export interface ExplainedStep {
  readonly index: number
  readonly step: ReplayStep
  /** The queue just before this step's city was taken from it, best first. */
  readonly queue: readonly QueueEntry[]
  readonly candidates: readonly ExplainedCandidate[]
  /** Cities expanded before this step. */
  readonly expandedBefore: readonly CityId[]
  /** Cities waiting in the queue after this step. */
  readonly frontierAfter: readonly CityId[]
}

export function queueOrderOf(variant: SearchVariant): QueueOrder {
  if (variant.heuristic !== undefined) return 'f'
  return variant.algorithmName === 'Breadth-First Search' ? 'fifo' : 'g'
}

interface Waiting {
  readonly g: number
  readonly h: number | null
  readonly parent: CityId | null
  readonly arrival: number
}

function priorityOf(order: QueueOrder, entry: Waiting): number {
  if (order === 'fifo') return entry.arrival
  return order === 'f' ? entry.g + (entry.h ?? 0) : entry.g
}

/** Rebuilds the queue at every step of a recorded run so each choice can be explained. */
export function explainRun(run: RouteRun): ExplainedStep[] {
  const order = queueOrderOf(run.variant)
  const start = run.path[0]
  const first = run.steps[0]
  if (start === undefined || first === undefined) return []

  const waiting = new Map<CityId, Waiting>([
    [start, { g: 0, h: first.h, parent: null, arrival: 0 }],
  ])
  const expanded: CityId[] = []
  let arrivals = 1

  return run.steps.map((step, index) => {
    const queue = [...waiting.entries()]
      .map(([city, entry]) => ({ city, entry, priority: priorityOf(order, entry) }))
      // Ties go to the lower g, as in the A* comparator.
      .sort((a, b) => a.priority - b.priority || a.entry.g - b.entry.g)
      .map(
        ({ city, entry, priority }): QueueEntry => ({
          city,
          g: entry.g,
          h: entry.h,
          priority,
          parent: entry.parent,
          picked: city === step.city,
        }),
      )

    const expandedBefore = [...expanded]
    waiting.delete(step.city)
    expanded.push(step.city)

    const candidates = step.candidates.map((candidate): ExplainedCandidate => {
      if (!candidate.improved) {
        return { ...candidate, outcome: order === 'fifo' ? 'already reached' : 'no gain' }
      }
      const outcome = waiting.has(candidate.city) ? 'updated' : 'added'
      waiting.set(candidate.city, {
        g: candidate.g,
        h: candidate.h,
        parent: step.city,
        arrival: arrivals++,
      })
      return { ...candidate, outcome }
    })

    return {
      index,
      step,
      queue,
      candidates,
      expandedBefore,
      frontierAfter: [...waiting.keys()],
    }
  })
}
