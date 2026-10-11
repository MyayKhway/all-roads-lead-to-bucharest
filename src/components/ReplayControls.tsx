/**
 * ReplayControls — playback bar over the map for the current search.
 *
 * It stays visible after the replay so any step can be revisited:
 * stepping back or scrubbing returns the map to that point of the search.
 */

import { cities } from '../data/cities'
import type { Phase } from '../lib/searchView'

export const REPLAY_SPEEDS = [0.5, 1, 2] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

interface ReplayControlsProps {
  phase: Phase
  revealed: number
  total: number
  current: string | null
  playing: boolean
  speed: ReplaySpeed
  onTogglePlay: () => void
  onStepBack: () => void
  onStepForward: () => void
  onSkip: () => void
  onSeek: (step: number) => void
  onSpeed: (speed: ReplaySpeed) => void
}

export default function ReplayControls({
  phase,
  revealed,
  total,
  current,
  playing,
  speed,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onSkip,
  onSeek,
  onSpeed,
}: ReplayControlsProps) {
  const searching = phase === 'searching'
  const finished = phase === 'done'
  const playLabel = finished ? 'Replay search' : searching && playing ? 'Pause' : 'Play'

  return (
    <div className="replay-bar" role="toolbar" aria-label="Search replay">
      <div className="replay-row">
        <span className="replay-status">
          Step {revealed} / {total}
          <span className="replay-sep" />
          {searching && current ? (
            <>
              Expanding <strong>{cities[current]?.name ?? current}</strong>
            </>
          ) : phase === 'navigating' ? (
            'Drawing route…'
          ) : (
            'Search finished'
          )}
        </span>
        <div className="replay-buttons">
          <button
            type="button"
            onClick={onStepBack}
            disabled={revealed <= 1 || phase === 'navigating'}
            aria-label="Previous step"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={phase === 'navigating'}
            aria-label={playLabel}
          >
            {finished ? '↺' : searching && playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            onClick={onStepForward}
            disabled={!searching}
            aria-label="Next step"
          >
            ▶❘
          </button>
          <button type="button" onClick={onSkip} disabled={!searching} aria-label="Skip to route">
            ⏭
          </button>
          <select
            value={speed}
            onChange={(e) => onSpeed(Number(e.target.value) as ReplaySpeed)}
            aria-label="Replay speed"
          >
            {REPLAY_SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      </div>
      <input
        className="replay-scrub"
        type="range"
        min={1}
        max={Math.max(1, total)}
        value={revealed}
        onChange={(e) => onSeek(Number(e.target.value))}
        disabled={phase === 'navigating'}
        aria-label="Replay step"
      />
    </div>
  )
}
