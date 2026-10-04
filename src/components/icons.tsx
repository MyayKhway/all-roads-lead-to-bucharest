/**
 * icons — minimal stroke icon set, replaces emoji throughout the UI.
 */

type IconProps = { className?: string }

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconRoute({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.3 18 15.7 6" />
    </svg>
  )
}

export function IconFlagStart({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconFlagGoal({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5 21V4" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  )
}

export function IconLayers({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  )
}

export function IconCompass({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5 13 13l-3.5 1.5L11 11l3.5-1.5Z" />
    </svg>
  )
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" className={className} aria-hidden="true">
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  )
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M20 11A8 8 0 1 0 18.5 15.5" />
      <path d="M20 5v6h-6" />
    </svg>
  )
}

export function IconAlertTriangle({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.5" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconCheckCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  )
}

export function IconHeartPulse({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-9.8-9.3C.8 7.8 2.5 4.5 6 4.5c2 0 3.4 1.1 4 2.3.6-1.2 2-2.3 4-2.3 3.5 0 5.2 3.3 3.8 6.7-1.9 4.1-5.8 7.3-5.8 7.3Z" />
      <path d="M4 12h2.5l1.5-3 2 6 1.5-3H17" />
    </svg>
  )
}

export function IconSpinner({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}
