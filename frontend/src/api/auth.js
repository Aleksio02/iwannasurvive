import { clearSessionUser, setSessionUser } from '../utils/sessionStore'

const API_BASE = '/api/auth'

function createError(message, status = 0) {
    const error = new Error(message)
    error.status = status
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

async function request(url, options = {}) {
    let response

    try {
        response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        })
    } catch {
        throw createError('Сервер недоступен. Проверьте подключение и попробуйте снова.', 0)
    }

    const data = await parseResponseBody(response)

    if (!response.ok) {
        const message =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Произошла ошибка запроса'

        if (response.status === 401 || response.status === 403) {
            clearSessionUser()
        }

        throw createError(message, response.status)
    }

    return data
}

export async function registerUser(payload) {
    const response = await request(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })

    if (response?.user) {
        setSessionUser(response.user)
    }

    return response
}

export async function loginUser(payload) {
    const response = await request(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })

    if (response?.user) {
        setSessionUser(response.user)
    }

    return response
}

export async function requestPasswordReset(payload) {
    return request(`${API_BASE}/password-reset/request`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function verifyPasswordResetCode(payload) {
    return request(`${API_BASE}/password-reset/verify`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function confirmPasswordReset(payload) {
    return request(`${API_BASE}/password-reset/confirm`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function validateSession() {
    return request(`${API_BASE}/validateSession`, {
        method: 'GET',
    })
}

export async function getCurrentUserInfo() {
    try {
        const response = await request(`${API_BASE}/me`, {
            method: 'GET',
        })

        const user = response?.user || response || null

        if (user) {
            setSessionUser(user)
        } else {
            clearSessionUser()
        }

        return response
    } catch (error) {
        if ([401, 403, 404, 500, 502, 503].includes(error.status)) {
            clearSessionUser()
            return null
        }

        throw error
    }
}

export async function logoutUser() {
    try {
        await request(`${API_BASE}/logout`, {
            method: 'POST',
        })
    } finally {
        clearSessionUser()
    }

    return null
}