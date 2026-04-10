
function createHttpError(message, status = 0, extra = {}) {
    const error = new Error(message)
    error.status = status
    error.code = extra.code || null
    error.details = extra.details || {}
    error.payload = extra.payload || null
    return error
}

async function parseResponseBody(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (isJson) {
        try {
            return await response.json()
        } catch {
            return null
        }
    }

    try {
        const text = await response.text()
        return text || null
    } catch {
        return null
    }
}

let sessionUserCache = null
let sessionUserCacheAt = 0
const SESSION_CACHE_TTL_MS = 15_000

export function clearSessionUserCache() {
    sessionUserCache = null
    sessionUserCacheAt = 0
}

export async function httpJson(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : url
    console.log('[HTTP]', options.method || 'GET', fullUrl)

    let response
    try {
        response = await fetch(fullUrl, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        })
    } catch {
        throw createHttpError('Сервер недоступен. Попробуйте позже.', 0)
    }

    const data = await parseResponseBody(response)

    if (!response.ok) {
        const message =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Ошибка запроса'

        if (response.status === 401) {
            clearSessionUserCache()
        }

        throw createHttpError(message, response.status, {
            code: typeof data === 'object' ? data?.code : null,
            details: typeof data === 'object' ? data?.details : {},
            payload: data,
        })
    }

    return data
}

export function toQuery(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return

        if (Array.isArray(value)) {
            if (value.length === 0) return
            query.set(key, value.join(','))
            return
        }

        query.set(key, String(value))
    })

    return query.toString()
}

function mapSessionUser(response) {
    if (!response?.user) return null

    return {
        id: response.user.id,
        userId: response.user.id,
        displayName: response.user.displayName || '',
        email: response.user.email || '',
        role: response.user.role || '',
        twoFactorEnabled: Boolean(response.user.twoFactorEnabled),
    }
}

export async function getSessionUserFromApi({ force = false } = {}) {
    const isFresh =
        sessionUserCache &&
        Date.now() - sessionUserCacheAt < SESSION_CACHE_TTL_MS

    if (!force && isFresh) {
        return sessionUserCache
    }

    try {
        const data = await httpJson('/api/auth/me')
        const mapped = mapSessionUser(data)
        sessionUserCache = mapped
        sessionUserCacheAt = Date.now()
        return mapped
    } catch (error) {
        if (error?.status === 401) {
            clearSessionUserCache()
            return null
        }

        throw error
    }
}

export async function getSessionUserIdFromApi(options = {}) {
    const user = await getSessionUserFromApi(options)
    return user?.id || null
}

export async function getRequiredCurrentUserPayload() {
    const user = await getSessionUserFromApi()
    if (!user?.id || !user?.email || !user?.role) {
        throw createHttpError('Пользователь не авторизован', 401)
    }

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    }
}