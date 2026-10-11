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
  'normal' | 'start' | 'goal' | 'path' | 'explored' | 'frontier' | 'current' | 'hover',
  string
> = {
  normal: '#efe9dc',
  start: COLOR.amber,
  goal: COLOR.crimson,
  path: COLOR.emerald,
  explored: COLOR.slateBlue,
  frontier: '#f2c46b',
  current: '#3b82f6',
  hover: COLOR.amberHover,
}

export const ROAD_COLOR = {
  normal: '#f5efe1',
  explored: '#5c85bd',
  path: COLOR.emerald,
  pathEmissive: COLOR.emeraldDeep,
} as const

/**
 * Daylight pastel palette for the 3D map itself — soft sky, sage land, muted
 * water — so the saturated navigation green always stands out on top of it.
 */
export const SCENE_COLOR = {
  sky: '#dbe9ef',
  fog: '#dde9ee',
  land: '#c4dca6',
  landSide: '#d6c4a0',
  plain: '#e3eadb',
  river: '#8fc7dc',
  roadCasing: '#b8ad98',
  road: '#f5efe1',
  platform: '#efe9dc',
  sun: '#fff2dc',
  hemiSky: '#eef6ff',
  hemiGround: '#b9c99c',
} as const

/** Navigation route colours — deeper than the UI emerald to read on green land. */
export const ROUTE_COLOR = {
  line: '#10b86a',
  glow: '#0a8f52',
  casing: '#ffffff',
} as const

/**
 * NTB ring colours, nearest the goal first: indigo → violet → fuchsia → pink,
 * each step shifting hue as well as lightness so adjacent rings stay
 * distinguishable at a glance (not just lightness within one hue, which read
 * too similar between the first two steps). Kept clear of the status colours
 * used on the map.
 */
export const RING_COLOR = ['#3730a3', '#7c3aed', '#c026d3', '#db2777', '#f472b6', '#fbcfe8']

export function ringColor(ring: number): string {
  return RING_COLOR[Math.min(Math.max(ring - 1, 0), RING_COLOR.length - 1)] ?? '#ddd0fc'
}
