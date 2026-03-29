import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { getSessionUser } from '../../utils/sessionStore'

function ProtectedRoute({ children, allowedRoles = [] }) {
    const [, navigate] = useLocation()
    const user = getSessionUser()

    useEffect(() => {
        if (!user) {
            navigate('/')
            return
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            navigate('/')
        }
    }, [user, navigate, allowedRoles])

    if (!user) return null
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null

    return children
}

export default ProtectedRoute