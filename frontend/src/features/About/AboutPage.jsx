import { createElement, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    GraduationCap,
    LogIn,
    MapPinned,
    Menu,
    Network,
    Search,
    Sparkles,
    UserRound,
    Users,
    X,
} from 'lucide-react'
import brandMark from '@/assets/icons/brand-mark.png'
import { getSessionUser, subscribeSessionChange } from '@/shared/lib/utils/sessionStore'
import AppFooter from '@/shared/layouts/AppFooter'
import ThemeToggle from '@/shared/ui/ThemeToggle'
import './AboutPage.scss'

const audienceCards = [
    { title: 'Студент', text: 'Ищи стажировку, ментора и события по своему направлению.', icon: GraduationCap },
    { title: 'Выпускник', text: 'Находи первую работу в IT и отслеживай отклики.', icon: UserRound },
    { title: 'Работодатель', text: 'Публикуй вакансии и находи мотивированных молодых специалистов.', icon: Building2 },
    { title: 'Вуз', text: 'Помогай студентам видеть карьерные маршруты и партнёров.', icon: Users },
]

const features = [
    {
        title: 'Возможности на карте',
        text: 'Стажировки, вакансии и мероприятия удобно искать по городам, адресам и формату.',
        icon: MapPinned,
    },
    {
        title: 'Фильтры по навыкам',
        text: 'Python, Java, SQL, формат работы и зарплата помогают быстро сузить выдачу.',
        icon: Search,
    },
    {
        title: 'Менторы и события',
        text: 'Хакатоны, лекции и карьерные программы помогают увереннее входить в профессию.',
        icon: CalendarDays,
    },
    {
        title: 'Отклики и контакты',
        text: 'Можно сохранять компании, общаться с работодателями и следить за статусами.',
        icon: Network,
    },
]

const steps = [
    {
        title: 'Зарегистрируйся',
        text: 'Выбери роль: соискатель или работодатель.',
    },
    {
        title: 'Заполни профиль',
        text: 'Добавь навыки, резюме или информацию о компании.',
    },
    {
        title: 'Начни работу',
        text: 'Откликайся на возможности или публикуй вакансии.',
    },
]

const stats = [
    { value: '500+', label: 'вакансий и стажировок' },
    { value: '120+', label: 'компаний-партнёров' },
    { value: '50+', label: 'мероприятий в год' },
]

const partners = ['Яндекс', 'VK', 'Т-Банк', 'Сбер', 'Ozon', 'Selectel', 'МТС', 'Авито']

function scrollToSection(sectionId, behavior = 'smooth') {
    const section = document.getElementById(sectionId)
    if (!section) return

    section.scrollIntoView({ block: 'start', behavior })
}

function AboutPage() {
    const [, navigate] = useLocation()
    const [sessionUser, setSessionUser] = useState(() => getSessionUser())
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const topbarRef = useRef(null)

    useEffect(() => {
        const sectionId = window.location.hash.replace('#', '')
        if (!sectionId) return undefined

        const timerIds = [80, 360, 900].map((delay) =>
            window.setTimeout(() => scrollToSection(sectionId, 'auto'), delay)
        )

        return () => timerIds.forEach((timerId) => window.clearTimeout(timerId))
    }, [])

    useEffect(() => subscribeSessionChange(setSessionUser), [])

    useEffect(() => {
        if (!isMenuOpen) return undefined

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false)
            }
        }

        const handlePointerDown = (event) => {
            const target = event.target
            if (target.closest?.('.about-page__theme-toggle, .theme-toggle')) return
            if (topbarRef.current?.contains(target)) return
            setIsMenuOpen(false)
        }

        window.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [isMenuOpen])

    const handleAnchorClick = (event, sectionId) => {
        event.preventDefault()
        setIsMenuOpen(false)
        window.history.pushState(null, '', `#${sectionId}`)
        scrollToSection(sectionId)
    }

    const isLoggedIn = Boolean(sessionUser)

    const closeMenu = () => setIsMenuOpen(false)

    return (
        <div className="about-page">
            <div className="about-page__ambient" aria-hidden="true">
                <span className="about-page__blob about-page__blob--one" />
                <span className="about-page__blob about-page__blob--two" />
            </div>

            {isMenuOpen && (
                <button
                    type="button"
                    className="about-page__menu-backdrop"
                    aria-label="Закрыть меню"
                    onClick={closeMenu}
                />
            )}

            <header
                ref={topbarRef}
                className={`about-page__topbar ${isMenuOpen ? 'is-menu-open' : ''}`}
            >
                <Link href="/" className="about-page__brand">
                    <img src={brandMark} alt="Трамплин" />
                    <span>Трамплин</span>
                </Link>

                <div className="about-page__header-tools">
                    <ThemeToggle
                        className="about-page__theme-toggle"
                        showLabel={false}
                        onPointerDown={(event) => event.stopPropagation()}
                    />

                    <button
                        type="button"
                        className="about-page__menu-toggle"
                        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                        aria-controls="about-page-menu"
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                    >
                        {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
                    </button>
                </div>

                <div
                    className="about-page__menu"
                    id="about-page-menu"
                    onClick={(event) => event.stopPropagation()}
                >
                    <nav className="about-page__nav" aria-label="Навигация страницы">
                        <a href="#audience" onClick={(event) => handleAnchorClick(event, 'audience')}>Кому подходит</a>
                        <a href="#inside" onClick={(event) => handleAnchorClick(event, 'inside')}>Что внутри</a>
                        <a href="#start" onClick={(event) => handleAnchorClick(event, 'start')}>Как начать</a>
                        <a href="#partners" onClick={(event) => handleAnchorClick(event, 'partners')}>Партнёры</a>
                    </nav>

                    <div className="about-page__top-actions">
                        <Link
                            href={isLoggedIn ? '/opportunities' : '/login'}
                            className="about-page__login"
                            onClick={() => {
                                closeMenu()
                            }}
                        >
                            {isLoggedIn ? <ArrowRight size={17} /> : <LogIn size={17} />}
                            <span>{isLoggedIn ? 'К возможностям' : 'Войти'}</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="about-hero">
                    <div className="about-hero__content about-reveal">
                        <div className="about-page__eyebrow">
                            <Sparkles size={16} />
                            Как работает Трамплин
                        </div>
                        <h1>Трамплин — твой старт в IT-карьере</h1>
                        <p>
                            Стажировки, вакансии, менторы и карьерные мероприятия на одной
                            платформе для студентов, выпускников и работодателей.
                        </p>

                        <div className="about-hero__actions">
                            <Link href="/opportunities" className="about-page__button about-page__button--primary">
                                К возможностям
                                <ArrowRight size={18} />
                            </Link>
                            <Link href="/register" className="about-page__button about-page__button--secondary">
                                Стать работодателем
                            </Link>
                        </div>

                        <div className="about-hero__summary" aria-label="Кратко о платформе">
                            <span>стажировки</span>
                            <span>вакансии</span>
                            <span>менторы</span>
                            <span>мероприятия</span>
                        </div>
                    </div>

                    <aside className="about-hero__preview about-reveal" aria-label="Пример карьерного маршрута">
                        <div className="about-hero__preview-head">
                            <span className="about-hero__status-dot" />
                            Персональный карьерный маршрут
                        </div>

                        <div className="about-hero__path">
                            <div className="about-hero__path-item is-active">
                                <CheckCircle2 size={18} />
                                <span>Профиль заполнен</span>
                            </div>
                            <div className="about-hero__path-item">
                                <Search size={18} />
                                <span>Подборка по навыкам</span>
                            </div>
                            <div className="about-hero__path-item">
                                <BriefcaseBusiness size={18} />
                                <span>Первый отклик</span>
                            </div>
                        </div>

                        <div className="about-hero__opportunity">
                            <div>
                                <span>Стажировка</span>
                                <strong>Junior Python Developer</strong>
                            </div>
                            <p>Москва · гибрид · SQL, FastAPI</p>
                        </div>

                        <div className="about-hero__filters" aria-hidden="true">
                            <span>Python</span>
                            <span>Java</span>
                            <span>SQL</span>
                            <span>от 60 000 ₽</span>
                        </div>
                    </aside>
                </section>

                <section className="about-section" id="audience">
                    <div className="about-section__head about-reveal">
                        <span>Кому подходит</span>
                        <h2>Платформа соединяет тех, кто ищет старт, и тех, кто готов его дать</h2>
                    </div>

                    <div className="about-grid about-grid--audience">
                        {audienceCards.map(({ title, text, icon }) => (
                            <article className="about-card about-card--audience about-reveal" key={title}>
                                <div className="about-card__icon">
                                    {createElement(icon, { size: 26 })}
                                </div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-section" id="inside">
                    <div className="about-section__head about-reveal">
                        <span>Что внутри</span>
                        <h2>Всё, что нужно для осознанного поиска первой IT-возможности</h2>
                    </div>

                    <div className="about-grid about-grid--features">
                        {features.map(({ title, text, icon }) => (
                            <article className="about-card about-card--feature about-reveal" key={title}>
                                <div className="about-card__icon">
                                    {createElement(icon, { size: 26 })}
                                </div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-section" id="start">
                    <div className="about-section__head about-reveal">
                        <span>Как начать</span>
                        <h2>Три понятных шага без лишней сложности</h2>
                    </div>

                    <div className="about-steps">
                        {steps.map((step, index) => (
                            <article className="about-step about-reveal" key={step.title}>
                                <div className="about-step__number">{index + 1}</div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-stats about-reveal" aria-label="Статистика платформы">
                    {stats.map((item) => (
                        <div className="about-stat" key={item.label}>
                            <strong>{item.value}</strong>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </section>

                <section className="about-section" id="partners">
                    <div className="about-section__head about-reveal">
                        <span>Партнёры</span>
                        <h2>Работодатели, с которыми проще сделать первый уверенный шаг</h2>
                    </div>

                    <div className="about-partners about-reveal" aria-label="Логотипы работодателей">
                        <div className="about-partners__track">
                            {[...partners, ...partners].map((partner, index) => (
                                <span key={`${partner}-${index}`}>{partner}</span>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="about-cta about-reveal" aria-label="Призыв к действию">
                    <div>
                        <ClipboardCheck size={28} />
                        <h2>Начни с одной возможности</h2>
                        <p>Открой подборку, выбери формат и посмотри, какие компании ищут начинающих специалистов.</p>
                    </div>
                    <Link href="/opportunities" className="about-page__button about-page__button--primary">
                        Перейти к возможностям
                        <ArrowRight size={18} />
                    </Link>
                </section>
            </main>

            <AppFooter className="about-page__app-footer" />
        </div>
    )
}

export default AboutPage