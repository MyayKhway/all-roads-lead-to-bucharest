/**
 * theme — single source of truth for the "Midnight Atlas" palette.
 * Shared between the 3D scene (raw hex, consumed by three.js materials)
 * and the DOM UI (inline swatches, CSS custom properties in App.css).
 */

export const COLOR = {
  bgVoid: '#0a0d12',
  bgScene: '#263229',
  bgSceneFar: '#1c2620',
  panel: '#12161d',
  panelHeader: '#171c24',
  border: 'rgba(255,255,255,0.07)',
  textPrimary: '#e7eaee',
  textMuted: '#8b96a5',
  textFaint: '#6b7688',

  amber: '#e3a23c',
  amberHover: '#f0b457',
  amberSoft: 'rgba(227,162,60,0.14)',
  emerald: '#34d399',
  emeraldDeep: '#0f9d6b',
  emeraldSoft: 'rgba(52,211,153,0.14)',
  crimson: '#f0555a',
  crimsonSoft: 'rgba(240,85,90,0.14)',
  slateBlue: '#6b84a6',
} as const

export const STATUS_COLOR: Record<
  'normal' | 'start' | 'goal' | 'path' | 'explored' | 'hover',
  string
> = {
  normal: '#4a5b52',
  start: COLOR.amber,
  goal: COLOR.crimson,
  path: COLOR.emerald,
  explored: COLOR.slateBlue,
  hover: COLOR.amberHover,
}

export const ROAD_COLOR = {
  normal: '#5a6e64',
  explored: '#5c85bd',
  path: COLOR.emerald,
  pathEmissive: COLOR.emeraldDeep,
} as const
