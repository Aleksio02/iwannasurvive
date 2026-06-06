import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/hooks/useTheme'
import './ThemeToggle.scss'

function ThemeToggle({ className = '', showLabel = true, onClick, ...rest }) {
    const { isDark, toggleTheme } = useTheme()
    const classes = ['theme-toggle', !showLabel ? 'theme-toggle--icon' : '', className]
        .filter(Boolean)
        .join(' ')

    const handleClick = (event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
            toggleTheme()
        }
    }

    return (
        <button
            type="button"
            className={classes}
            onClick={handleClick}
            aria-pressed={isDark}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            {...rest}
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
