/**
 * ReplayControls — playback bar over the map while a search replays.
 */

import { cities } from '../data/cities'

export const REPLAY_SPEEDS = [0.5, 1, 2] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

interface ReplayControlsProps {
  revealed: number
  total: number
  current: string | null
  playing: boolean
  speed: ReplaySpeed
  onTogglePlay: () => void
  onStepBack: () => void
  onStepForward: () => void
  onSkip: () => void
  onSpeed: (speed: ReplaySpeed) => void
}

export default function ReplayControls({
  revealed,
  total,
  current,
  playing,
  speed,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onSkip,
  onSpeed,
}: ReplayControlsProps) {
  return (
    <div className="replay-bar" role="toolbar" aria-label="Search replay">
      <span className="replay-status">
        Step {revealed} / {total}
        {current && (
          <>
            <span className="replay-sep" />
            Expanding <strong>{cities[current]?.name ?? current}</strong>
          </>
        )}
      </span>
      <div className="replay-buttons">
        <button
          type="button"
          onClick={onStepBack}
          disabled={revealed <= 1}
          aria-label="Previous step"
        >
          ◀
        </button>
        <button type="button" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={onStepForward} aria-label="Next step">
          ▶❘
        </button>
        <button type="button" onClick={onSkip} aria-label="Skip to route">
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
  )
}
