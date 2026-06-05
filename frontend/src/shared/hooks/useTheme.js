import { useCallback, useEffect, useState } from 'react'
import {
    THEME_STORAGE_KEY,
    THEMES,
    getCurrentTheme,
    setStoredTheme,
} from '@/shared/lib/theme'

export function useTheme() {
    const [theme, setThemeState] = useState(() => getCurrentTheme())

    useEffect(() => {
        const syncTheme = (event) => {
            setThemeState(event.detail?.theme || getCurrentTheme())
        }

        const syncStorageTheme = (event) => {
            if (event.key === THEME_STORAGE_KEY) {
                setThemeState(setStoredTheme(event.newValue))
            }
        }

        window.addEventListener('themechange', syncTheme)
        window.addEventListener('storage', syncStorageTheme)

        return () => {
            window.removeEventListener('themechange', syncTheme)
            window.removeEventListener('storage', syncStorageTheme)
        }
    }, [])

    const setTheme = useCallback((nextTheme) => {
        setThemeState(setStoredTheme(nextTheme))
    }, [])

    const toggleTheme = useCallback(() => {
        setThemeState((currentTheme) =>
            setStoredTheme(currentTheme === THEMES.dark ? THEMES.light : THEMES.dark)
        )
    }, [])

    return {
        theme,
        isDark: theme === THEMES.dark,
        setTheme,
        toggleTheme,
    }
}
