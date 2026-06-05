import { createElement, useEffect } from 'react'
import { Link } from 'wouter'
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
    Network,
    Search,
    Sparkles,
    UserRound,
    Users,
} from 'lucide-react'
import brandMark from '@/assets/icons/brand-mark.png'
import { useTheme } from '@/shared/hooks/useTheme'
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
    const { isDark } = useTheme()

    useEffect(() => {
        const sectionId = window.location.hash.replace('#', '')
        if (!sectionId) return undefined

        const timerIds = [80, 360, 900].map((delay) =>
            window.setTimeout(() => scrollToSection(sectionId, 'auto'), delay)
        )

        return () => timerIds.forEach((timerId) => window.clearTimeout(timerId))
    }, [])

    const handleAnchorClick = (event, sectionId) => {
        event.preventDefault()
        window.history.pushState(null, '', `#${sectionId}`)
        scrollToSection(sectionId)
    }

    return (
        <div className={`about-page ${isDark ? 'about-page--dark' : ''}`}>
            <div className="about-page__ambient" aria-hidden="true">
                <span className="about-page__blob about-page__blob--one" />
                <span className="about-page__blob about-page__blob--two" />
            </div>

            <header className="about-page__topbar">
                <Link href="/" className="about-page__brand">
                    <img src={brandMark} alt="Трамплин" />
                    <span>Трамплин</span>
                </Link>

                <nav className="about-page__nav" aria-label="Навигация страницы">
                    <a href="#audience" onClick={(event) => handleAnchorClick(event, 'audience')}>Кому подходит</a>
                    <a href="#inside" onClick={(event) => handleAnchorClick(event, 'inside')}>Возможности</a>
                    <a href="#start" onClick={(event) => handleAnchorClick(event, 'start')}>Как начать</a>
                    <a href="#partners" onClick={(event) => handleAnchorClick(event, 'partners')}>Партнёры</a>
                </nav>

                <div className="about-page__top-actions">
                    <Link href="/login" className="about-page__login">
                        <LogIn size={17} />
                        <span>Войти</span>
                    </Link>
                    <ThemeToggle className="about-page__theme-toggle" showLabel={false} />
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
                                Найти возможность
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

            <footer className="about-footer">
                <div className="about-footer__brand">
                    <img src={brandMark} alt="" />
                    <span>Трамплин</span>
                </div>
                <p>Карьерная платформа для студентов, выпускников, вузов и IT-работодателей.</p>
                <nav aria-label="Контакты">
                    <a href="mailto:tramplin.support@gmail.com">tramplin.support@gmail.com</a>
                    <a href="/opportunities">Возможности</a>
                    <a href="/register">Регистрация</a>
                </nav>
            </footer>
        </div>
    )
}

export default AboutPage
