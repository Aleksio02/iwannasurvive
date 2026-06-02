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

export async function sendChatAttachment(dialogId, { clientMessageId, body, file }) {
    const formData = new FormData()
    const normalizedBody = (body || '').trim()
    formData.append('clientMessageId', clientMessageId)
    if (normalizedBody) formData.append('body', normalizedBody)
    formData.append('file', file)

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
