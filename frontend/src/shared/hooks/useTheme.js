import { useCallback, useEffect, useState } from 'react'
import {
    THEME_STORAGE_KEY,
    THEMES,
    applyTheme,
    getCurrentTheme,
    normalizeTheme,
    setStoredTheme,
} from '@/shared/lib/theme'

export function useTheme() {
    const [theme, setThemeState] = useState(() => getCurrentTheme())

    useEffect(() => {
        const syncTheme = (event) => {
            setThemeState(event.detail?.theme || getCurrentTheme())
        }

        const syncStorageTheme = (event) => {
            if (event.key !== THEME_STORAGE_KEY) return
            const nextTheme = normalizeTheme(event.newValue)
            applyTheme(nextTheme, { disableTransitions: true })
            setThemeState(nextTheme)
        }

        window.addEventListener('themechange', syncTheme)
        window.addEventListener('storage', syncStorageTheme)

        return () => {
            window.removeEventListener('themechange', syncTheme)
            window.removeEventListener('storage', syncStorageTheme)
        }
    }, [])

    const setTheme = useCallback((nextTheme) => {
        setStoredTheme(nextTheme)
    }, [])

    const toggleTheme = useCallback(() => {
        const nextTheme = getCurrentTheme() === THEMES.dark ? THEMES.light : THEMES.dark
        setStoredTheme(nextTheme)
    }, [])

    return {
        theme,
        isDark: theme === THEMES.dark,
        setTheme,
        toggleTheme,
    }
}
