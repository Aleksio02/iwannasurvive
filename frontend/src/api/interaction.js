import { httpJson, toQuery } from './http'
import { getSessionUser } from '../utils/sessionStore'

const API_BASE = '/api/interaction'

function getCurrentUserQueryValue() {
    const user = getSessionUser()
    if (!user?.id || !user?.email || !user?.role) return null

    return JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
    })
}

export async function getContacts() {
    return httpJson(`${API_BASE}/contacts`)
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
    return httpJson(`${API_BASE}/responses/my`)
}

export async function getEmployerResponses(params = {}) {
    const currentUser = getCurrentUserQueryValue()

    const query = toQuery({
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        sortBy: params.sortBy || 'CREATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        opportunityId: params.opportunityId,
        status: params.status,
        search: params.search,
        currentUser,
    })

    return httpJson(`/api/employer/responses${query ? `?${query}` : ''}`)
}

export async function createResponse(opportunityId, applicantComment = '', coverLetter = '') {
    return httpJson(`${API_BASE}/responses`, {
        method: 'POST',
        body: JSON.stringify({
            opportunityId,
            applicantComment,
            coverLetter,
        }),
    })
}

export async function updateResponseStatus(responseId, status, employerComment = '') {
    return httpJson(`${API_BASE}/responses/${responseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, employerComment }),
    })
}

export async function getFavorites() {
    return httpJson(`${API_BASE}/favorites`)
}

export async function addToFavorites(opportunityId) {
    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}`, {
        method: 'POST',
    })
}

export async function removeFromFavorites(opportunityId) {
    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}`, {
        method: 'DELETE',
    })
}