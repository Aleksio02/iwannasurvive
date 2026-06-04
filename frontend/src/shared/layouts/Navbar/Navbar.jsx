import { Link, useLocation } from 'wouter'
import { useState, useEffect, useRef } from 'react'
import brandMark from '@/assets/icons/brand-mark.png'
import { getCurrentUserInfo, logoutUser } from '@/shared/api/auth'
import {
    getApplicantProfile,
    getEmployerProfile,
    getProfileOnboardingCachedStatus,
    getProfileOnboardingStatus,
} from '@/shared/api/profile'
import { getChatDialogs } from '@/shared/api/chats'
import { useChatRealtime } from '@/features/Chats/useChatRealtime'
import {
    isOnboardingRole,
    isPublicGuestPath,
} from '@/shared/lib/utils/onboardingRoutes'
import {
    clearSessionUser,
    getSessionUser,
    setSessionUser,
    subscribeSessionChange,
} from '@/shared/lib/utils/sessionStore'
import './Navbar.scss'

function Navbar() {
    const [location, navigate] = useLocation()
    const [user, setUser] = useState(getSessionUser())
    const [displayName, setDisplayName] = useState('')
    const [isCheckingSession, setIsCheckingSession] = useState(!!getSessionUser())
    const [onboardingStatus, setOnboardingStatus] = useState(() => {
        const localUser = getSessionUser()
        return isOnboardingRole(localUser?.role)
            ? getProfileOnboardingCachedStatus(localUser)
            : null
    })
    const [unreadChatCount, setUnreadChatCount] = useState(0)
    const { eventVersion } = useChatRealtime()
    const lastUnreadRefreshAtRef = useRef(0)

    const loadUserData = async () => {
        const localUser = getSessionUser()

        if (!localUser) {
            setUser(null)
            setDisplayName('')
            setOnboardingStatus(null)
            setIsCheckingSession(false)
            return
        }

        const cachedStatus = isOnboardingRole(localUser?.role)
            ? getProfileOnboardingCachedStatus(localUser)
            : null

        if (
            isPublicGuestPath(location) &&
            isOnboardingRole(localUser?.role) &&
            cachedStatus?.completed !== true
        ) {
            setUser(localUser)
            setDisplayName('')
            setOnboardingStatus(cachedStatus)
            setIsCheckingSession(false)
            return
        }

        setIsCheckingSession(true)

        try {
            const sessionData = await getCurrentUserInfo()
            const userData = sessionData?.user || sessionData || null

            if (!userData) {
                clearSessionUser()
                setUser(null)
                setDisplayName('')
                setOnboardingStatus(null)
                return
            }

            setUser(userData)
            setSessionUser(userData)

            const fallbackName =
                userData.displayName ||
                userData.email?.split('@')[0] ||
                'Пользователь'

            if (userData.role === 'APPLICANT') {
                try {
                    const profile = await getApplicantProfile()
                    const firstName = profile?.firstName || ''
                    const lastName = profile?.lastName || ''
                    // Фамилия + Имя
                    const fullName = `${lastName} ${firstName}`.trim()
                    setDisplayName(fullName || fallbackName)
                } catch {
                    setDisplayName(fallbackName)
                }
                return
            }

            if (userData.role === 'EMPLOYER') {
                try {
                    const profile = await getEmployerProfile()
                    setDisplayName(profile?.companyName || fallbackName)
                } catch {
                    setDisplayName(fallbackName)
                }
                return
            }

            setDisplayName(fallbackName)
        } catch (error) {
            console.error('Failed to load user data:', error)
            clearSessionUser()
            setUser(null)
            setDisplayName('')
            setOnboardingStatus(null)
        } finally {
            setIsCheckingSession(false)
        }
    }

    useEffect(() => {
        loadUserData()

        const handleProfileUpdate = (event) => {
            const { firstName, lastName, companyName, role } = event.detail || {}

            if (role === 'APPLICANT') {
                // Фамилия + Имя
                const fullName = `${lastName || ''} ${firstName || ''}`.trim()
                if (fullName) {
                    setDisplayName(fullName)
                    const localUser = getSessionUser()
                    if (localUser) {
                        setSessionUser({ ...localUser, firstName, lastName, displayName: fullName })
                    }
                } else {
                    loadUserData()
                }
                return
            }

            if (role === 'EMPLOYER' && companyName) {
                setDisplayName(companyName)
                const localUser = getSessionUser()
                if (localUser) setSessionUser({ ...localUser, displayName: companyName })
                return
            }

            loadUserData()
        }

        const unsubscribeSession = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
            setOnboardingStatus(
                isOnboardingRole(nextUser?.role)
                    ? getProfileOnboardingCachedStatus(nextUser)
                    : null
            )

            if (!nextUser) {
                setDisplayName('')
                setIsCheckingSession(false)
            }
        })

        window.addEventListener('profile-updated', handleProfileUpdate)

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
            unsubscribeSession()
        }
    }, [])

    useEffect(() => {
        if (!isOnboardingRole(user?.role)) {
            setOnboardingStatus(null)
            return undefined
        }

        let isCancelled = false
        const cachedStatus = getProfileOnboardingCachedStatus(user)
        setOnboardingStatus(cachedStatus)

        getProfileOnboardingStatus()
            .then((status) => {
                if (!isCancelled) {
                    setOnboardingStatus(status)
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setOnboardingStatus(cachedStatus)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [user?.id, user?.role])

    const isGuestMode = isPublicGuestPath(location) &&
        isOnboardingRole(user?.role) &&
        onboardingStatus?.completed !== true
    const visibleUser = isGuestMode ? null : user

    useEffect(() => {
        if (!['APPLICANT', 'EMPLOYER'].includes(visibleUser?.role)) {
            setUnreadChatCount(0)
            return
        }

        let isActive = true
        let refreshTimer = null

        const refreshUnreadCount = () => {
            const now = Date.now()
            if (now - lastUnreadRefreshAtRef.current < 1500) {
                return
            }
            lastUnreadRefreshAtRef.current = now

            getChatDialogs({ unreadOnly: true, limit: 100, cacheTtlMs: 4_000 })
                .then((page) => {
                    if (!isActive) return
                    const total = (page?.items || []).reduce((sum, dialog) => sum + (dialog.unreadCount || 0), 0)
                    setUnreadChatCount(total)
                })
                .catch(() => {
                    if (isActive) setUnreadChatCount(0)
                })
        }

        if (eventVersion > 0) {
            refreshTimer = setTimeout(refreshUnreadCount, 250)
        } else {
            refreshUnreadCount()
        }

        return () => {
            isActive = false
            if (refreshTimer) clearTimeout(refreshTimer)
        }
    }, [eventVersion, visibleUser?.id, visibleUser?.role])

    const handleLogout = async () => {
        setUser(null)
        setDisplayName('')
        clearSessionUser()

        try {
            await logoutUser()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            navigate('/login')
        }
    }

    const isActive = (path) => location === path
    const isChatsActive = location.startsWith('/chats')

    const getDashboardLink = () => {
        if (visibleUser?.role === 'EMPLOYER') return '/employer'
        if (visibleUser?.role === 'CURATOR' || visibleUser?.role === 'ADMIN') return '/curator'
        return '/seeker'
    }

    const getUserShortName = () => {
        if (displayName) {
            return displayName
        }

        const firstName = visibleUser?.firstName || ''
        const lastName = visibleUser?.lastName || ''

        if (lastName && firstName) {
            return `${lastName} ${firstName}`
        }
        if (lastName) return lastName
        if (firstName) return firstName

        return visibleUser?.displayName || visibleUser?.email?.split('@')[0] || 'Пользователь'
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

                    {visibleUser ? (
                        <>
                            <Link
                                href={getDashboardLink()}
                                className={`navbar__link ${isActive(getDashboardLink()) ? 'is-active' : ''}`}
                            >
                                Личный кабинет
                            </Link>

                            {['APPLICANT', 'EMPLOYER'].includes(visibleUser.role) && (
                                <Link
                                    href="/chats"
                                    className={`navbar__link navbar__chat-link ${isChatsActive ? 'is-active' : ''}`}
                                >
                                    Сообщения
                                    {unreadChatCount > 0 && (
                                        <span className="navbar__chat-badge">{unreadChatCount > 99 ? '99+' : unreadChatCount}</span>
                                    )}
                                </Link>
                            )}

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="navbar__link navbar__link--logout"
                            >
                                Выйти
                            </button>

                            <span className="navbar__user">
                                {getUserShortName()}
                            </span>
                        </>
                    ) : (
                        <>
                            {!isCheckingSession && (
                                <>
                                    <Link href="/login" className={`navbar__link ${isActive('/login') ? 'is-active' : ''}`}>
                                        Войти
                                    </Link>
                                    <Link
                                        href="/register"
                                        className={`navbar__link navbar__link--register ${isActive('/register') ? 'is-active' : ''}`}
                                    >
                                        Регистрация
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
