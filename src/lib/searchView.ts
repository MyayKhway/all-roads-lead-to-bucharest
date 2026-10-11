/**
 * searchView — what the map should show at a given point of the search replay.
 *
 * The search has already finished by the time anything is drawn; the replay
 * walks through its recorded steps so the user can watch how it explored the
 * graph. Everything here is derived from the trace.
 */

import type { ReplayStep, RouteRun } from '../search/presentation'

/**
 * idle        nothing running
 * searching   replaying the recorded expansions
 * navigating  green route drawing itself, camera following
 * done        route complete, results stay on screen
 */
export type Phase = 'idle' | 'searching' | 'navigating' | 'done'

export interface SearchView {
  /** Cities expanded so far, in order. */
  explored: readonly string[]
  /** Cities discovered but not yet expanded (the open set). */
  frontier: ReadonlySet<string>
  /** City being expanded at this step. */
  current: string | null
  /** Roads examined so far. */
  touchedRoads: ReadonlySet<string>
  step: ReplayStep | null
}

export function roadKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export const EMPTY_VIEW: SearchView = {
  explored: [],
  frontier: new Set(),
  current: null,
  touchedRoads: new Set(),
  step: null,
}

/** State of the search after the first `revealed` expansions. */
export function deriveSearchView(run: RouteRun | null, revealed: number): SearchView {
  if (run === null || revealed <= 0) return EMPTY_VIEW

  const shown = run.steps.slice(0, Math.min(revealed, run.steps.length))
  const explored = shown.map((step) => step.city)
  const expanded = new Set<string>(explored)
  const frontier = new Set<string>()
  const touchedRoads = new Set<string>()

  for (const step of shown) {
    for (const candidate of step.candidates) {
      touchedRoads.add(roadKey(step.city, candidate.city))
      if (candidate.improved && !expanded.has(candidate.city)) frontier.add(candidate.city)
    }
  }

  const step = shown.at(-1) ?? null
  return { explored, frontier, current: step?.city ?? null, touchedRoads, step }
}

/** Replay pacing at 1×: roughly four seconds in total, but never frantic or sluggish. */
export function stepDurationMs(stepCount: number): number {
  return Math.min(700, Math.max(320, 4200 / Math.max(1, stepCount)))
}
