/**
 * HelpPanel — a modal explaining how to use the map and the controls.
 */

import { useEffect } from 'react'

interface HelpPanelProps {
  onClose: () => void
}

interface HelpSection {
  title: string
  items: { term: string; description: string }[]
}

const SECTIONS: HelpSection[] = [
  {
    title: 'Moving around the map',
    items: [
      { term: 'Left-click + drag', description: 'Rotate the camera around the map.' },
      { term: 'Right-click + drag', description: 'Pan the camera sideways.' },
      { term: 'Scroll', description: 'Zoom in or out.' },
    ],
  },
  {
    title: 'Choosing a route',
    items: [
      { term: 'Click a city', description: 'Set it as the destination.' },
      {
        term: 'Shift+click a city',
        description: 'Set it as a new start, without affecting the destination.',
      },
      {
        term: 'Start City / Destination',
        description: 'The dropdowns on the left always set either one directly.',
      },
    ],
  },
  {
    title: 'Running a search',
    items: [
      { term: 'Search Method', description: 'Pick the algorithm and heuristic to run.' },
      { term: 'Find Path', description: 'Runs the search and replays it step by step.' },
      {
        term: 'Replay bar',
        description: 'Pause, step back or forward, skip ahead, or change the playback speed.',
      },
    ],
  },
  {
    title: 'Digging deeper',
    items: [
      {
        term: 'Compare all methods',
        description: 'After a route is found, see every algorithm side by side.',
      },
      {
        term: 'Explain every step',
        description: 'Open the full step-by-step reasoning behind the search.',
      },
    ],
  },
]

export default function HelpPanel({ onClose }: HelpPanelProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close, not a control itself
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled globally above
    <div className="help-backdrop" onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: not a control, just stops propagation to the backdrop */}
      <section
        className="help-panel"
        aria-label="How to use this map"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-header">
          <h2 className="help-title">How to use this map</h2>
          <button type="button" className="help-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="help-sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="help-section">
              <h3 className="help-section-title">{section.title}</h3>
              <dl className="help-list">
                {section.items.map((item) => (
                  <div key={item.term} className="help-item">
                    <dt>{item.term}</dt>
                    <dd>{item.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
