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

    return httpJson(`${API_BASE}${query ? `?${query}` : ''}`, {
        dedupe: true,
        cacheTtlMs: Number(params.cacheTtlMs) || 0,
    })
}

export function getChatDialog(dialogId) {
    return httpJson(`${API_BASE}/${dialogId}`, {
        dedupe: true,
        cacheTtlMs: 10_000,
    })
}

export function getChatOpportunityFilters() {
    return httpJson(`${API_BASE}/filter-options/opportunities`, {
        dedupe: true,
        cacheTtlMs: 10_000,
    })
}

export function getChatMessages(dialogId, params = {}) {
    const query = toQuery({
        beforeMessageId: params.beforeMessageId,
        afterMessageId: params.afterMessageId,
        limit: params.limit ?? 50,
    })

    return httpJson(`${API_BASE}/${dialogId}/messages${query ? `?${query}` : ''}`, {
        dedupe: true,
        cacheTtlMs: params.afterMessageId ? 0 : 8_000,
    })
}

export function sendChatMessageRest(dialogId, payload) {
    return httpJson(`${API_BASE}/${dialogId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

async function parseResponseBody(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        try {
            return await response.json()
        } catch {
            return null
        }
    }

    return response.text()
}

export async function sendChatAttachment(dialogId, { clientMessageId, body, file, files = [], replyToMessageId }) {
    const formData = new FormData()
    const normalizedBody = (body || '').trim()
    const normalizedFiles = files.length > 0 ? files : (file ? [file] : [])
    formData.append('clientMessageId', clientMessageId)
    if (normalizedBody) formData.append('body', normalizedBody)
    if (replyToMessageId) formData.append('replyToMessageId', String(replyToMessageId))
    normalizedFiles.forEach((item) => formData.append('files', item))

    let response
    try {
        response = await fetch(`${API_BASE}/${dialogId}/attachments`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        })
    } catch {
        throw new Error('Сервер недоступен. Попробуйте позже.')
    }

    const data = await parseResponseBody(response)
    if (!response.ok) {
        throw new Error(
            (typeof data === 'object' && (data?.message || data?.error)) ||
            (typeof data === 'string' && data) ||
            'Не удалось отправить файл'
        )
    }

    return data
}

export function getChatAttachmentDownloadUrl(dialogId, attachmentId) {
    return httpJson(`${API_BASE}/${dialogId}/attachments/${attachmentId}/download-url`, {
        dedupe: true,
        cacheTtlMs: 60_000,
    })
}

export function markChatRead(dialogId, lastReadMessageId) {
    return httpJson(`${API_BASE}/${dialogId}/read`, {
        method: 'POST',
        body: JSON.stringify({ lastReadMessageId }),
    })
}

export function markChatUnread(dialogId, fromMessageId) {
    return httpJson(`${API_BASE}/${dialogId}/unread`, {
        method: 'POST',
        body: JSON.stringify({ fromMessageId: fromMessageId || null }),
    })
}

export function editChatMessage(dialogId, messageId, body) {
    return httpJson(`${API_BASE}/${dialogId}/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
    })
}

export async function updateChatMessageContent(dialogId, messageId, { body = '', removeAttachmentIds = [], file = null, files = [] }) {
    const formData = new FormData()
    const normalizedBody = (body || '').trim()
    const normalizedFiles = files.length > 0 ? files : (file ? [file] : [])
    if (normalizedBody) formData.append('body', normalizedBody)
    removeAttachmentIds.forEach((attachmentId) => formData.append('removeAttachmentIds', String(attachmentId)))
    normalizedFiles.forEach((item) => formData.append('files', item))

    let response
    try {
        response = await fetch(`${API_BASE}/${dialogId}/messages/${messageId}/content`, {
            method: 'PATCH',
            credentials: 'include',
            body: formData,
        })
    } catch {
        throw new Error('Сервер недоступен. Попробуйте позже.')
    }

    const data = await parseResponseBody(response)
    if (!response.ok) {
        throw new Error(
            (typeof data === 'object' && (data?.message || data?.error)) ||
            (typeof data === 'string' && data) ||
            'Не удалось изменить сообщение'
        )
    }

    return data
}

export function deleteChatMessageForMe(dialogId, messageId) {
    return httpJson(`${API_BASE}/${dialogId}/messages/${messageId}/delete-for-me`, {
        method: 'POST',
    })
}

export function deleteChatMessageForEveryone(dialogId, messageId) {
    return httpJson(`${API_BASE}/${dialogId}/messages/${messageId}/delete-for-everyone`, {
        method: 'POST',
    })
}

export function setChatMessageReaction(dialogId, messageId, reaction) {
    return httpJson(`${API_BASE}/${dialogId}/messages/${messageId}/reaction`, {
        method: 'PUT',
        body: JSON.stringify({ reaction }),
    })
}

export function deleteChatMessageReaction(dialogId, messageId) {
    return httpJson(`${API_BASE}/${dialogId}/messages/${messageId}/reaction`, {
        method: 'DELETE',
    })
}

export function pinChatMessage(dialogId, messageId) {
    return httpJson(`${API_BASE}/${dialogId}/messages/${messageId}/pin`, {
        method: 'POST',
    })
}

export function unpinChatMessage(dialogId) {
    return httpJson(`${API_BASE}/${dialogId}/pinned-message`, {
        method: 'DELETE',
    })
}

export function forwardChatMessage(sourceDialogId, messageId, payload) {
    return httpJson(`${API_BASE}/${sourceDialogId}/messages/${messageId}/forward`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export function searchChatMessages(dialogId, params = {}) {
    const query = toQuery({
        query: params.query,
        limit: params.limit ?? 20,
        cursor: params.cursor,
    })
    return httpJson(`${API_BASE}/${dialogId}/messages/search?${query}`, {
        dedupe: true,
    })
}

export function getChatMessageContext(dialogId, params = {}) {
    const query = toQuery({
        messageId: params.messageId,
        before: params.before ?? 25,
        after: params.after ?? 25,
    })
    return httpJson(`${API_BASE}/${dialogId}/messages/context?${query}`, {
        dedupe: true,
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
