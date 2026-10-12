/**
 * HelpPanel — a modal explaining how to use the map and the controls.
 */

import { useEffect, useRef } from 'react'

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
      {
        term: 'Click a city',
        description:
          'The first click sets the start, after that it sets the destination. Clicking the start again clears it.',
      },
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
        term: 'See Comparison Results',
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
  const dialogRef = useRef<HTMLDialogElement>(null)

  // showModal() puts the panel in the top layer: it traps focus, closes on Escape,
  // and hands focus back to the ? button when it closes.
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function close() {
    dialogRef.current?.close()
  }

  return (
    // The content fills the dialog, so a click landing on the dialog itself is on its backdrop.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog
    <dialog
      ref={dialogRef}
      className="help-panel"
      aria-labelledby="help-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="help-content">
        <header className="help-header">
          <h2 id="help-title" className="help-title">
            How to use this map
          </h2>
          <button type="button" className="help-close" onClick={close} aria-label="Close">
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
      </div>
    </dialog>
  )
}
