import { Link } from 'wouter'
import brandMark from '@/assets/icons/brand-mark.png'
import AppFooter from '@/shared/layouts/AppFooter'
import ThemeToggle from '@/shared/ui/ThemeToggle'
import './AuthLayout.scss'

function AuthLayout({ children }) {
    return (
        <div className="auth-layout">
            <div className="auth-layout__background" />
            <ThemeToggle className="auth-layout__theme-toggle" showLabel={false} />

            <div className="auth-layout__inner">
                <Link href="/" className="auth-layout__logo-link">
                    <img
                        src={brandMark}
                        alt="Логотип Трамплин"
                        className="auth-layout__logo-image"
                    />
                    <span className="auth-layout__logo-text">Трамплин</span>
                </Link>

                {children}
            </div>

            <AppFooter compact className="auth-layout__footer" />
        </div>
    )
}

export default AuthLayout
