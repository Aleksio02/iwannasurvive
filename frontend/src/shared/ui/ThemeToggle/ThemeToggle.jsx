import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/hooks/useTheme'
import './ThemeToggle.scss'

function ThemeToggle({ className = '', showLabel = true }) {
    const { isDark, toggleTheme } = useTheme()
    const classes = ['theme-toggle', !showLabel ? 'theme-toggle--icon' : '', className]
        .filter(Boolean)
        .join(' ')

    return (
        <button
            type="button"
            className={classes}
            onClick={toggleTheme}
            aria-pressed={isDark}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
        >
            <span className="theme-toggle__icon" aria-hidden="true">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            {showLabel && (
                <span className="theme-toggle__label">
                    {isDark ? 'Светлая' : 'Тёмная'}
                </span>
            )}
        </button>
    )
}

export default ThemeToggle
