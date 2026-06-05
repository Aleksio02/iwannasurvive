export const THEME_STORAGE_KEY = 'tramplin-theme'

export const THEMES = {
    light: 'light',
    dark: 'dark',
}

export function normalizeTheme(theme) {
    return theme === THEMES.dark ? THEMES.dark : THEMES.light
}

export function getStoredTheme() {
    if (typeof window === 'undefined') return THEMES.light

    try {
        return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
        return THEMES.light
    }
}

export function getCurrentTheme() {
    if (typeof document === 'undefined') return THEMES.light

    return normalizeTheme(document.documentElement.dataset.theme || getStoredTheme())
}

export function applyTheme(theme) {
    if (typeof document === 'undefined') return normalizeTheme(theme)

    const nextTheme = normalizeTheme(theme)
    const root = document.documentElement
    const body = document.body

    root.dataset.theme = nextTheme
    root.style.colorScheme = nextTheme
    root.classList.toggle('theme-dark', nextTheme === THEMES.dark)
    root.classList.toggle('theme-light', nextTheme === THEMES.light)

    if (body) {
        body.dataset.theme = nextTheme
        body.classList.toggle('theme-dark', nextTheme === THEMES.dark)
        body.classList.toggle('theme-light', nextTheme === THEMES.light)
    }

    return nextTheme
}

export function setStoredTheme(theme) {
    const nextTheme = applyTheme(theme)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
        } catch {
            // Theme switching should keep working even when storage is unavailable.
        }

        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: nextTheme } }))
    }

    return nextTheme
}

export function initializeTheme() {
    return applyTheme(getStoredTheme())
}
