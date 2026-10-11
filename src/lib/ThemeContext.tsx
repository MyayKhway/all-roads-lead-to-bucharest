/**
 * ThemeContext — makes the active theme available inside the R3F scene tree,
 * where prop-drilling through RomaniaMap → Terrain/CityNode would otherwise
 * be needed just to pick a palette.
 */

import { createContext, useContext } from 'react'
import type { ThemeName } from './useTheme'

export const ThemeContext = createContext<ThemeName>('light')

export function useAppTheme(): ThemeName {
  return useContext(ThemeContext)
}
