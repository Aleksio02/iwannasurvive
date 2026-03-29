import { Link, useLocation } from 'wouter'
import { useState, useEffect } from 'react'
import brandMark from '../../assets/icons/brand-mark.svg'
import { getCurrentUserInfo, logoutUser } from '../../api/auth'
import { getApplicantProfile, getEmployerProfile } from '../../api/profile'
import {
    clearSessionUser,
    getSessionUser,
    setSessionUser,
    subscribeSessionChange,
} from '../../utils/sessionStore'
import './Navbar.scss'

function Navbar() {
    const [location] = useLocation()
    const [user, setUser] = useState(getSessionUser())
    const [displayName, setDisplayName] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const loadUserData = async () => {
        setIsLoading(true)
        try {
            const sessionData = await getCurrentUserInfo()
            const userData = sessionData?.user || sessionData || null

            setUser(userData)
            if (userData) {
                setSessionUser(userData)
            } else {
                clearSessionUser()
                setDisplayName('')
                return
            }

            if (userData.role === 'APPLICANT') {
                try {
                    const profile = await getApplicantProfile()
                    if (profile && (profile.firstName || profile.lastName)) {
                        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                        setDisplayName(fullName || userData.displayName || userData.email?.split('@')[0])
                    } else {
                        setDisplayName(userData.displayName || userData.email?.split('@')[0])
                    }
                } catch {
                    setDisplayName(userData.displayName || userData.email?.split('@')[0])
                }
            } else if (userData.role === 'EMPLOYER') {
                try {
                    const profile = await getEmployerProfile()
                    setDisplayName(profile?.companyName || userData.displayName || userData.email?.split('@')[0])
                } catch {
                    setDisplayName(userData.displayName || userData.email?.split('@')[0])
                }
            } else {
                setDisplayName(userData.displayName || userData.email?.split('@')[0])
            }
        } catch (error) {
            console.error('Failed to load user data:', error)
            clearSessionUser()
            setUser(null)
            setDisplayName('')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadUserData()

        const handleProfileUpdate = (event) => {
            const { firstName, lastName, companyName, role } = event.detail || {}

            if (role === 'APPLICANT' && (firstName || lastName)) {
                const fullName = `${firstName || ''} ${lastName || ''}`.trim()
                if (fullName) {
                    setDisplayName(fullName)
                    const localUser = getSessionUser()
                    if (localUser) setSessionUser({ ...localUser, displayName: fullName })
                }
            } else if (role === 'EMPLOYER' && companyName) {
                setDisplayName(companyName)
                const localUser = getSessionUser()
                if (localUser) setSessionUser({ ...localUser, displayName: companyName })
            } else {
                loadUserData()
            }
        }

        const unsubscribeSession = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
            if (!nextUser) setDisplayName('')
        })

        window.addEventListener('profile-updated', handleProfileUpdate)

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
            unsubscribeSession()
        }
    }, [])

    const handleLogout = async () => {
        setUser(null)
        setDisplayName('')
        clearSessionUser()

        try {
            await logoutUser()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            window.location.href = '/'
        }
    }

    const isActive = (path) => location === path

    const getDashboardLink = () => {
        if (user?.role === 'EMPLOYER') return '/employer'
        if (user?.role === 'CURATOR' || user?.role === 'ADMIN') return '/curator'
        return '/seeker'
    }

    if (isLoading) {
        return (
            <nav className="navbar">
                <div className="navbar__container container">
                    <Link href="/" className="navbar__logo">
                        <img src={brandMark} alt="Трамплин" className="navbar__logo-icon" />
                        <span className="navbar__logo-text">Трамплин</span>
                    </Link>
                    <div className="navbar__links">
                        <Link href="/" className="navbar__link">Главная</Link>
                    </div>
                </div>
            </nav>
        )
    }

    return (
        <nav className="navbar">
            <div className="navbar__container container">
                <Link href="/" className="navbar__logo">
                    <img src={brandMark} alt="Трамплин" className="navbar__logo-icon" />
                    <span className="navbar__logo-text">Трамплин</span>
                </Link>

                <div className="navbar__links">
                    <Link href="/" className={`navbar__link ${isActive('/') ? 'is-active' : ''}`}>
                        Главная
                    </Link>

                    {user ? (
                        <>
                            <Link
                                href={getDashboardLink()}
                                className={`navbar__link ${isActive(getDashboardLink()) ? 'is-active' : ''}`}
                            >
                                Личный кабинет
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="navbar__link navbar__link--logout"
                            >
                                Выйти
                            </button>
                            <span className="navbar__user">
                                {displayName || user.displayName || user.email?.split('@')[0]}
                            </span>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className={`navbar__link ${isActive('/login') ? 'is-active' : ''}`}>
                                Войти
                            </Link>
                            <Link href="/register" className={`navbar__link navbar__link--register ${isActive('/register') ? 'is-active' : ''}`}>
                                Регистрация
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar