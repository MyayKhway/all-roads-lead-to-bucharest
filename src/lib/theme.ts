/**
 * theme — single source of truth for color.
 * Shared between the 3D scene (raw hex, consumed by three.js materials)
 * and the DOM UI (inline swatches, CSS custom properties in App.css).
 */

import type { ThemeName } from './useTheme'

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
export const SCENE_COLOR_LIGHT = {
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
  roadLabel: '#5a5242',
  roadLabelOutline: '#f5efe1',
  routeLabel: '#1b5e20',
  routeLabelOutline: '#ffffff',
} as const

/**
 * Moonlit night palette for the 3D map — deep navy sky, dark moss land, a
 * cool moon light instead of a warm sun. Same keys as SCENE_COLOR_LIGHT so
 * every consumer can switch with one lookup.
 */
export const SCENE_COLOR_DARK = {
  sky: '#0b1220',
  fog: '#121a2b',
  land: '#62795a',
  landSide: '#7d6a52',
  plain: '#232b38',
  river: '#4a7a94',
  roadCasing: '#4a443a',
  road: '#4b4538',
  platform: '#3a4046',
  sun: '#aebfe0',
  hemiSky: '#1b2740',
  hemiGround: '#425339',
  roadLabel: '#c9c1ae',
  roadLabelOutline: '#1d2733',
  routeLabel: COLOR.emerald,
  routeLabelOutline: '#0b1220',
} as const

export type SceneColor = Record<keyof typeof SCENE_COLOR_LIGHT, string>

export function sceneColorFor(theme: ThemeName): SceneColor {
  return theme === 'dark' ? SCENE_COLOR_DARK : SCENE_COLOR_LIGHT
}

export interface SceneLightIntensity {
  hemi: number
  ambient: number
  directional: number
}

/**
 * Light intensities tuned per theme. The daylight sun can run bright without
 * washing out the pastel palette, but that same intensity over-lights the
 * dark palette's deeper colours into a flat, saturated glare — so the
 * moonlit theme gets a softer hemisphere/ambient/directional mix instead.
 */
const LIGHT_INTENSITY_LIGHT: SceneLightIntensity = { hemi: 1.15, ambient: 0.22, directional: 2.5 }
const LIGHT_INTENSITY_DARK: SceneLightIntensity = { hemi: 1.35, ambient: 0.42, directional: 1.7 }

export function lightIntensityFor(theme: ThemeName): SceneLightIntensity {
  return theme === 'dark' ? LIGHT_INTENSITY_DARK : LIGHT_INTENSITY_LIGHT
}

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
