/**
 * useTheme — light/dark preference, persisted and applied to the document.
 *
 * The value also drives the 3D scene's palette (see theme.ts's sceneColorFor
 * and components/CityNode.tsx, Terrain.tsx, RomaniaMap.tsx) via ThemeContext.
 */

import { useCallback, useEffect, useState } from 'react'

export type ThemeName = 'light' | 'dark'

const STORAGE_KEY = 'romania-map-theme'

function isThemeName(value: string | null): value is ThemeName {
  return value === 'light' || value === 'dark'
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function initialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isThemeName(stored)) return stored
  return systemPrefersDark() ? 'dark' : 'light'
}

export function useTheme(): [ThemeName, () => void] {
  const [theme, setTheme] = useState<ThemeName>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return [theme, toggleTheme]
}
