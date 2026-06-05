import { Link } from 'wouter'
import { Mail } from 'lucide-react'
import brandMark from '@/assets/icons/brand-mark.png'
import './AppFooter.scss'

function AppFooter({ className = '', compact = false }) {
    const year = new Date().getFullYear()
    const footerClasses = [
        'app-footer',
        compact ? 'app-footer--compact' : '',
        className,
    ].filter(Boolean).join(' ')

    if (compact) {
        return (
            <footer className={footerClasses}>
                <div className="app-footer__compact-container container">
                    <Link href="/" className="app-footer__compact-brand">
                        <img src={brandMark} alt="" className="app-footer__compact-logo" />
                        <span>Трамплин</span>
                    </Link>

                    <nav className="app-footer__compact-links" aria-label="Нижняя навигация">
                        <Link href="/about">О платформе</Link>
                        <Link href="/opportunities">Возможности</Link>
                        <a href="mailto:tramplin.support@gmail.com">Поддержка</a>
                    </nav>
                </div>
            </footer>
        )
    }

    return (
        <footer className={footerClasses}>
            <div className="app-footer__container container">
                <div className="app-footer__top">
                    <div className="app-footer__brand">
                        <Link href="/" className="app-footer__logo">
                            <img src={brandMark} alt="" className="app-footer__logo-icon" />
                            <span>Трамплин</span>
                        </Link>
                        <p>Карьерная платформа для поиска стажировок, вакансий, мероприятий и первых IT-команд.</p>
                    </div>

                    <div className="app-footer__groups">
                        <nav className="app-footer__group" aria-label="Платформа">
                            <h2>Платформа</h2>
                            <Link href="/about">О платформе</Link>
                            <Link href="/opportunities">Возможности</Link>
                        </nav>

                        <nav className="app-footer__group" aria-label="Аккаунт">
                            <h2>Аккаунт</h2>
                            <Link href="/login">Войти</Link>
                            <Link href="/register">Регистрация</Link>
                        </nav>

                        <nav className="app-footer__group" aria-label="Связь">
                            <h2>Связь</h2>
                            <a href="mailto:tramplin.support@gmail.com">
                                <Mail size={15} />
                                <span>Поддержка</span>
                            </a>
                        </nav>
                    </div>
                </div>

                <div className="app-footer__bottom">
                    <span>© {year} Трамплин</span>
                    <span>Платформа для студентов, выпускников и работодателей</span>
                </div>
            </div>
        </footer>
    )
}

export default AppFooter
