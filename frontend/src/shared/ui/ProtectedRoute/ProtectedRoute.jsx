import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { getCurrentUserInfo } from '@/shared/api/auth'
import { getSessionUser, subscribeSessionChange } from '@/shared/lib/utils/sessionStore'

function ProtectedRoute({ children, allowedRoles = [] }) {
    const [, navigate] = useLocation()
    const [user, setUser] = useState(getSessionUser())
    const [isChecking, setIsChecking] = useState(!getSessionUser())
    const allowedRoleKey = useMemo(() => allowedRoles.join('|'), [allowedRoles])
    const normalizedAllowedRoles = useMemo(
        () => allowedRoleKey.split('|').filter(Boolean),
        [allowedRoleKey]
    )

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
            if (!nextUser) {
                setIsChecking(false)
            }
        })

        const checkSession = async () => {
            const localUser = getSessionUser()

            if (!localUser) {
                setUser(null)
                setIsChecking(false)
                navigate('/login')
                return
            }

            setUser(localUser)
            setIsChecking(false)

            if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(localUser.role)) {
                navigate('/')
                return
            }

            try {
                const session = await getCurrentUserInfo()
                const nextUser = session?.user || session || null

                if (!nextUser) {
                    setUser(null)
                    navigate('/login')
                    return
                }

                setUser(nextUser)

                if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(nextUser.role)) {
                    navigate('/')
                }
            } catch {
                setUser(null)
                navigate('/login')
            } finally {
                setIsChecking(false)
            }
        }

        checkSession()

        return unsubscribe
    }, [navigate, normalizedAllowedRoles])

    if (isChecking) return null
    if (!user) return null
    if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(user.role)) return null

    return children
}

export default ProtectedRoute
