import {
    httpJson,
    toQuery,
    getSessionUserFromApi,
    getSessionUserIdFromApi,
    getRequiredCurrentUserPayload,
    clearHttpGetCache,
} from './http'

const API_BASE = '/api/interaction'

async function getCurrentUser() {
    const user = await getSessionUserFromApi()
    if (!user?.id || !user?.email || !user?.role) return null

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    }
}

async function getRequiredUserId() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return userId
}

async function getCurrentUserQueryValue() {
    const currentUser = await getCurrentUser()
    return currentUser ? JSON.stringify(currentUser) : null
}

async function getRequiredCurrentUser() {
    const currentUser = JSON.stringify(await getRequiredCurrentUserPayload())
    if (!currentUser) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return currentUser
}

export async function getContacts() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    return httpJson(`${API_BASE}/contacts`, { dedupe: true, cacheTtlMs: 15_000 })
}

export async function addContact(contactUserId) {
    return httpJson(`${API_BASE}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactUserId }),
    })
}

export async function acceptContactRequest(contactUserId) {
    return httpJson(`${API_BASE}/contacts/${contactUserId}/accept`, {
        method: 'PATCH',
    })
}

export async function declineContactRequest(contactUserId) {
    return httpJson(`${API_BASE}/contacts/${contactUserId}/decline`, {
        method: 'PATCH',
    })
}

export async function removeContact(contactUserId) {
    return httpJson(`${API_BASE}/contacts/${contactUserId}`, {
        method: 'DELETE',
    })
}

export async function getMyResponses() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    try {
        return await httpJson(`${API_BASE}/responses/my`, { dedupe: true, cacheTtlMs: 15_000 })
    } catch (error) {
        if (error?.status !== 404) {
            throw error
        }

        clearHttpGetCache('/api/interaction/responses')
        throw error
    }
}

export async function getEmployerResponses(params = {}) {
    const currentUser = await getCurrentUserQueryValue()
    const user = await getSessionUserFromApi()

    const fullQuery = toQuery({
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        sortBy: params.sortBy || 'CREATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        opportunityId: params.opportunityId,
        status: params.status,
        search: params.search,
        currentUser,
    })

    try {
        return await httpJson(`/api/employer/responses${fullQuery ? `?${fullQuery}` : ''}`)
    } catch (error) {
        console.warn('[interaction] employer responses with currentUser failed, retrying with currentUserId:', error)

        if (!user?.id) {
            throw error
        }

        const fallbackQuery = toQuery({
            limit: params.limit ?? 20,
            offset: params.offset ?? 0,
            sortBy: params.sortBy || 'CREATED_AT',
            sortDirection: params.sortDirection || 'DESC',
            opportunityId: params.opportunityId,
            status: params.status,
            search: params.search,
            currentUserId: user.id,
        })

        return httpJson(`/api/employer/responses${fallbackQuery ? `?${fallbackQuery}` : ''}`)
    }
}

export async function createResponse(opportunityId, applicantComment = '', coverLetter = '') {
    const result = await httpJson(`${API_BASE}/responses`, {
        method: 'POST',
        body: JSON.stringify({
            opportunityId,
            applicantComment,
            coverLetter,
        }),
    })
    clearHttpGetCache('/api/interaction/responses')
    return result
}

export async function updateResponseStatus(responseId, status, employerComment = '') {
    const result = await httpJson(`${API_BASE}/responses/${responseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, employerComment }),
    })
    clearHttpGetCache('/api/interaction/responses')
    return result
}

export async function getFavorites() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    return httpJson(`${API_BASE}/favorites`, {
        dedupe: true,
        cacheTtlMs: 15_000,
    })
}

export async function addToFavorites(opportunityId) {
    const result = await httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}`, {
        method: 'POST',
    })
    clearHttpGetCache('/api/interaction/favorites')
    return result
}

export async function removeFromFavorites(opportunityId) {
    const result = await httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}`, {
        method: 'DELETE',
    })
    clearHttpGetCache('/api/interaction/favorites')
    return result
}

export async function addEmployerToFavorites(employerUserId) {
    const result = await httpJson(`${API_BASE}/favorites/employers/${employerUserId}`, {
        method: 'POST',
    })
    clearHttpGetCache('/api/interaction/favorites')
    return result
}

export async function removeEmployerFromFavorites(employerUserId) {
    const result = await httpJson(`${API_BASE}/favorites/employers/${employerUserId}`, {
        method: 'DELETE',
    })
    clearHttpGetCache('/api/interaction/favorites')
    return result
}

export async function createRecommendation({ opportunityId, toApplicantUserId, message = '' }) {
    const result = await httpJson(`${API_BASE}/recommendations`, {
        method: 'POST',
        body: JSON.stringify({
            opportunityId,
            toApplicantUserId,
            message,
        }),
    })
    clearHttpGetCache('/api/interaction/recommendations')
    return result
}

export async function getIncomingRecommendations() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    return httpJson(`${API_BASE}/recommendations/incoming`, { dedupe: true, cacheTtlMs: 15_000 })
}

export async function getOutgoingRecommendations() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    return httpJson(`${API_BASE}/recommendations/outgoing`, { dedupe: true, cacheTtlMs: 15_000 })
}

export async function updateRecommendationStatus(recommendationId, status) {
    const result = await httpJson(`${API_BASE}/recommendations/${recommendationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    })
    clearHttpGetCache('/api/interaction/recommendations')
    return result
}

export async function deleteRecommendation(recommendationId) {
    const result = await httpJson(`${API_BASE}/recommendations/${recommendationId}`, {
        method: 'DELETE',
    })
    clearHttpGetCache('/api/interaction/recommendations')
    return result
}
