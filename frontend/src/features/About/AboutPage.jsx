import { createElement, useEffect, useState, useRef } from 'react';
import { Link } from 'wouter';
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
} from 'lucide-react';
import brandMark from '@/assets/icons/brand-mark.png';
import { useTheme } from '@/shared/hooks/useTheme';
import { getSessionUser, subscribeSessionChange } from '@/shared/lib/utils/sessionStore';
import AppFooter from '@/shared/layouts/AppFooter';
import ThemeToggle from '@/shared/ui/ThemeToggle';
import './AboutPage.scss';

const audienceCards = [
    { title: 'Студент', text: 'Ищи стажировку, ментора и события по своему направлению.', icon: GraduationCap },
    { title: 'Выпускник', text: 'Находи первую работу в IT и отслеживай отклики.', icon: UserRound },
    { title: 'Работодатель', text: 'Публикуй вакансии и находи мотивированных молодых специалистов.', icon: Building2 },
    { title: 'Вуз', text: 'Помогай студентам видеть карьерные маршруты и партнёров.', icon: Users },
];

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
];

const steps = [
    { title: 'Зарегистрируйся', text: 'Выбери роль: соискатель или работодатель.' },
    { title: 'Заполни профиль', text: 'Добавь навыки, резюме или информацию о компании.' },
    { title: 'Начни работу', text: 'Откликайся на возможности или публикуй вакансии.' },
];

const stats = [
    { value: '500+', label: 'вакансий и стажировок' },
    { value: '120+', label: 'компаний-партнёров' },
    { value: '50+', label: 'мероприятий в год' },
];

const partners = ['Яндекс', 'VK', 'Т-Банк', 'Сбер', 'Ozon', 'Selectel', 'МТС', 'Авито'];

// Плавная прокрутка к секции с учётом высоты фиксированного хедера
function scrollToSection(sectionId, behavior = 'smooth') {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const header = document.querySelector('.about-page__topbar');
    const headerHeight = header ? header.offsetHeight + 20 : 100; // запас

    const elementPosition = section.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - headerHeight;

    window.scrollTo({
        top: offsetPosition,
        behavior,
    });
}

function AboutPage() {
    const { isDark, toggleTheme } = useTheme();
    const [sessionUser, setSessionUser] = useState(() => getSessionUser());
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);
    const menuButtonRef = useRef(null);

    // Обработка хэша при загрузке
    useEffect(() => {
        const sectionId = window.location.hash.replace('#', '');
        if (sectionId) {
            // Небольшая задержка для полной отрисовки
            setTimeout(() => scrollToSection(sectionId, 'auto'), 100);
        }
    }, []);

    // Подписка на изменение сессии
    useEffect(() => subscribeSessionChange(setSessionUser), []);

    // Закрытие меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isMobileMenuOpen &&
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target) &&
                menuButtonRef.current &&
                !menuButtonRef.current.contains(event.target)
            ) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside); // для мобильных
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

    // Блокировка скролла при открытом меню
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    const handleAnchorClick = (event, sectionId) => {
        event.preventDefault();
        // Закрываем мобильное меню, если оно открыто
        setIsMobileMenuOpen(false);
        // Обновляем URL без скачка
        window.history.pushState(null, '', `#${sectionId}`);
        // Плавная прокрутка
        scrollToSection(sectionId);
    };

    const isLoggedIn = Boolean(sessionUser);

    const navLinks = [
        { id: 'audience', label: 'Кому подходит' },
        { id: 'inside', label: 'Что внутри' },
        { id: 'start', label: 'Как начать' },
        { id: 'partners', label: 'Партнёры' },
    ];

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

                {/* Десктопная навигация */}
                <nav className="about-page__nav" aria-label="Навигация страницы">
                    {navLinks.map(({ id, label }) => (
                        <a key={id} href={`#${id}`} onClick={(e) => handleAnchorClick(e, id)}>
                            {label}
                        </a>
                    ))}
                </nav>

                <div className="about-page__top-actions">
                    <Link href={isLoggedIn ? '/opportunities' : '/login'} className="about-page__login">
                        {isLoggedIn ? <ArrowRight size={17} /> : <LogIn size={17} />}
                        <span>{isLoggedIn ? 'К возможностям' : 'Войти'}</span>
                    </Link>
                    <ThemeToggle
                        className="about-page__theme-toggle"
                        showLabel={false}
                        onToggle={toggleTheme}
                        isDark={isDark}
                    />
                    {/* Кнопка бургер-меню (только на мобильных) */}
                    <button
                        ref={menuButtonRef}
                        className="about-page__menu-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Мобильное выезжающее меню */}
            <div
                ref={mobileMenuRef}
                className={`about-page__mobile-menu ${isMobileMenuOpen ? 'about-page__mobile-menu--open' : ''}`}
            >
                <nav className="about-page__mobile-nav" aria-label="Мобильная навигация">
                    {navLinks.map(({ id, label }) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            onClick={(e) => handleAnchorClick(e, id)}
                            className="about-page__mobile-nav-link"
                        >
                            {label}
                        </a>
                    ))}
                    <div className="about-page__mobile-divider" />
                    <Link
                        href={isLoggedIn ? '/opportunities' : '/login'}
                        className="about-page__mobile-action"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        {isLoggedIn ? <ArrowRight size={18} /> : <LogIn size={18} />}
                        <span>{isLoggedIn ? 'К возможностям' : 'Войти'}</span>
                    </Link>
                </nav>
            </div>

            <main>
                {/* Hero секция (без изменений) */}
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

                {/* Секции (без изменений, только id для якорей) */}
                <section className="about-section" id="audience">
                    <div className="about-section__head about-reveal">
                        <span>Кому подходит</span>
                        <h2>Платформа соединяет тех, кто ищет старт, и тех, кто готов его дать</h2>
                    </div>
                    <div className="about-grid about-grid--audience">
                        {audienceCards.map(({ title, text, icon }) => (
                            <article className="about-card about-card--audience about-reveal" key={title}>
                                <div className="about-card__icon">{createElement(icon, { size: 26 })}</div>
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
                                <div className="about-card__icon">{createElement(icon, { size: 26 })}</div>
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
    );
}

export default AboutPage;