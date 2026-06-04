import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import {
    getProfileOnboardingCachedStatus,
    getProfileOnboardingStatus,
    invalidateProfileOnboardingStatusCache,
} from '@/shared/api/profile'
import {
    getSessionUser,
    subscribeSessionChange,
} from '@/shared/lib/utils/sessionStore'
import {
    isOnboardingAllowedPath,
    isOnboardingRole,
    shouldEnforceOnboardingPath,
} from '@/shared/lib/utils/onboardingRoutes'

function getCurrentPathWithSearch(location) {
    const pathname = String(location || window.location.pathname || '/')
    const search = window.location.search || ''
    return pathname.includes('?') ? pathname : `${pathname}${search}`
}

function normalizeReturnTo(path, role) {
    const fallback = role === 'EMPLOYER' ? '/employer' : '/seeker'
    const value = String(path || '').trim()

    if (!value || !value.startsWith('/') || value.startsWith('//')) {
        return fallback
    }

    if (isOnboardingAllowedPath(value)) {
        return fallback
    }

    return value
}

function ProfileOnboardingGuard({ children }) {
    const [location, navigate] = useLocation()
    const [user, setUser] = useState(() => getSessionUser())
    const [isChecking, setIsChecking] = useState(false)
    const [redirectPath, setRedirectPath] = useState('')
    const lastUserKeyRef = useRef(user ? `${user.id || user.userId || ''}:${user.role || ''}` : 'guest')

    const shouldCheck = useMemo(() => isOnboardingRole(user?.role), [user?.role])
    const currentPath = getCurrentPathWithSearch(location)
    const isAllowedCurrentPath = isOnboardingAllowedPath(currentPath)
    const shouldEnforceCurrentPath = shouldEnforceOnboardingPath(currentPath)

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            const nextKey = nextUser ? `${nextUser.id || nextUser.userId || ''}:${nextUser.role || ''}` : 'guest'
            if (nextKey !== lastUserKeyRef.current) {
                invalidateProfileOnboardingStatusCache()
                lastUserKeyRef.current = nextKey
            }
            setUser(nextUser)
        })

        return unsubscribe
    }, [])

    useEffect(() => {
        let isCancelled = false

        if (!shouldCheck || !shouldEnforceCurrentPath) {
            setIsChecking(false)
            setRedirectPath('')
            return () => {
                isCancelled = true
            }
        }

        const cachedStatus = getProfileOnboardingCachedStatus(user)
        if (cachedStatus?.completed === false) {
            const returnTo = normalizeReturnTo(currentPath, user?.role)
            const target = `${cachedStatus.requiredPath || '/profile/edit'}?returnTo=${encodeURIComponent(returnTo)}`
            navigate(target)
            return () => {
                isCancelled = true
            }
        }

        const shouldBlockWhileChecking = !cachedStatus?.completed
        const checkingTimer = shouldBlockWhileChecking
            ? window.setTimeout(() => {
                if (!isCancelled) {
                    setIsChecking(true)
                }
            }, 180)
            : null

        const finishChecking = () => {
            if (checkingTimer) {
                window.clearTimeout(checkingTimer)
            }

            if (!isCancelled && shouldBlockWhileChecking) {
                setIsChecking(false)
            }
        }

        getProfileOnboardingStatus({ force: Boolean(cachedStatus?.completed) })
            .then((status) => {
                if (isCancelled) return

                if (status?.completed === false) {
                    const returnTo = normalizeReturnTo(currentPath, user?.role)
                    const target = `${status.requiredPath || '/profile/edit'}?returnTo=${encodeURIComponent(returnTo)}`
                    setRedirectPath(target)
                    navigate(target)
                    return
                }

                setRedirectPath('')
            })
            .catch((error) => {
                if (isCancelled) return

                if ([401, 403].includes(error?.status)) {
                    setRedirectPath('')
                }
            })
            .finally(finishChecking)

        return () => {
            isCancelled = true
            if (checkingTimer) {
                window.clearTimeout(checkingTimer)
            }
        }
    }, [currentPath, navigate, shouldCheck, shouldEnforceCurrentPath, user])

    if (isChecking || (redirectPath && !isAllowedCurrentPath)) {
        return (
            <div className="app-loading-screen" role="status" aria-live="polite">
                <div className="app-loading-screen__card">
                    <div className="app-loading-screen__spinner" aria-hidden="true" />
                    <p>Проверяем профиль...</p>
                </div>
            </div>
        )
    }

    return children
}

export default ProfileOnboardingGuard
