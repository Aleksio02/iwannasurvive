import { httpJson, toQuery } from './http'

const API_BASE = '/api/chats'

export function ensureChatByResponse(responseId) {
    return httpJson(`${API_BASE}/by-response/${responseId}/ensure`, {
        method: 'POST',
    })
}

export function getChatDialogs(params = {}) {
    const query = toQuery({
        limit: params.limit ?? 20,
        opportunityId: params.opportunityId,
        unreadOnly: params.unreadOnly,
        archived: params.archived,
        cursor: params.cursor,
    })

    return httpJson(`${API_BASE}${query ? `?${query}` : ''}`)
}

export function getChatDialog(dialogId) {
    return httpJson(`${API_BASE}/${dialogId}`)
}

export function getChatMessages(dialogId, params = {}) {
    const query = toQuery({
        beforeMessageId: params.beforeMessageId,
        afterMessageId: params.afterMessageId,
        limit: params.limit ?? 50,
    })

    return httpJson(`${API_BASE}/${dialogId}/messages${query ? `?${query}` : ''}`)
}

export function sendChatMessageRest(dialogId, payload) {
    return httpJson(`${API_BASE}/${dialogId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export function markChatRead(dialogId, lastReadMessageId) {
    return httpJson(`${API_BASE}/${dialogId}/read`, {
        method: 'POST',
        body: JSON.stringify({ lastReadMessageId }),
    })
}

export function archiveChat(dialogId) {
    return httpJson(`${API_BASE}/${dialogId}/archive`, {
        method: 'POST',
    })
}

export function unarchiveChat(dialogId) {
    return httpJson(`${API_BASE}/${dialogId}/archive`, {
        method: 'DELETE',
    })
}
