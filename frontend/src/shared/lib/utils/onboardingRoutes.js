export const ONBOARDING_ROLES = new Set(['APPLICANT', 'EMPLOYER'])

const ONBOARDING_ALLOWED_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/profile/edit',
    '/settings/security',
]

const PUBLIC_GUEST_PATH_MATCHERS = [
    /^\/$/,
    /^\/opportunities\/[^/]+$/,
    /^\/seekers\/[^/]+$/,
    /^\/employers\/[^/]+$/,
]

export function getPathname(path) {
    return String(path || '').split('?')[0] || '/'
}

export function isOnboardingRole(role) {
    return ONBOARDING_ROLES.has(role)
}

export function isOnboardingAllowedPath(path) {
    const pathname = getPathname(path)
    return ONBOARDING_ALLOWED_PATHS.some((allowed) => pathname === allowed)
}

export function isPublicGuestPath(path) {
    const pathname = getPathname(path)
    return PUBLIC_GUEST_PATH_MATCHERS.some((matcher) => matcher.test(pathname))
}

export function shouldEnforceOnboardingPath(path) {
    return !isOnboardingAllowedPath(path) && !isPublicGuestPath(path)
}
