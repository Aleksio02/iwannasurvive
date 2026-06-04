import { Client, ReconnectionTimeMode } from '@stomp/stompjs'

const CHAT_EVENTS_DESTINATION = '/user/queue/chat-events'
const eventListeners = new Set()
const statusListeners = new Set()

let client = null
let activeUserId = null
let retainCount = 0
let connectionStatus = 'idle'

const isDevMode = import.meta.env.DEV

function setConnectionStatus(status) {
    connectionStatus = status
    statusListeners.forEach((listener) => listener(status))
}

function isPositiveNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isMessagePayload(payload) {
    return isObject(payload) &&
        isPositiveNumber(payload.id) &&
        isPositiveNumber(payload.dialogId) &&
        isPositiveNumber(payload.senderUserId) &&
        typeof payload.clientMessageId === 'string' &&
        (payload.body === null || typeof payload.body === 'string') &&
        (payload.attachments === undefined || (
            Array.isArray(payload.attachments) &&
            payload.attachments.every(isAttachmentPayload)
        ))
}

function isAttachmentPayload(payload) {
    return isObject(payload) &&
        isPositiveNumber(payload.id) &&
        isPositiveNumber(payload.fileId) &&
        typeof payload.originalFileName === 'string' &&
        typeof payload.mediaType === 'string' &&
        isPositiveNumber(payload.sizeBytes) &&
        ['IMAGE', 'FILE'].includes(payload.attachmentKind)
}

function isReadPayload(payload) {
    return isObject(payload) &&
        isPositiveNumber(payload.readerUserId) &&
        (payload.lastReadMessageId === null || isPositiveNumber(payload.lastReadMessageId))
}

function isDialogPayload(payload) {
    return isObject(payload) &&
        isPositiveNumber(payload.dialogId) &&
        isPositiveNumber(payload.opportunityResponseId) &&
        isObject(payload.counterpart) &&
        isPositiveNumber(payload.counterpart.userId) &&
        typeof payload.counterpart.displayName === 'string'
}

function isHiddenPayload(payload) {
    return isObject(payload) && isPositiveNumber(payload.messageId)
}

function isTypingPayload(payload) {
    return isObject(payload) &&
        isPositiveNumber(payload.userId) &&
        typeof payload.typing === 'boolean' &&
        typeof payload.expiresAt === 'string'
}

function parseEvent(body) {
    let event

    try {
        event = JSON.parse(body)
    } catch {
        return null
    }

    if (!isObject(event) || typeof event.type !== 'string' || !isPositiveNumber(event.dialogId)) {
        return null
    }

    if ([
        'MESSAGE_CREATED',
        'MESSAGE_UPDATED',
        'MESSAGE_DELETED',
        'MESSAGE_REACTIONS_UPDATED',
    ].includes(event.type) && isMessagePayload(event.payload)) {
        return {
            ...event,
            payload: {
                ...event.payload,
                attachments: event.payload.attachments || [],
                reactions: event.payload.reactions || [],
            },
        }
    }
    if (['READ_UPDATED', 'READ_STATE_UPDATED'].includes(event.type) && isReadPayload(event.payload)) return event
    if (event.type === 'MESSAGE_HIDDEN' && isHiddenPayload(event.payload)) return event
    if (event.type === 'TYPING_UPDATED' && isTypingPayload(event.payload)) return event
    if (event.type === 'DIALOG_UPDATED' && isDialogPayload(event.payload)) return event
    if (event.type === 'DIALOG_CLOSED') return event

    return null
}

function emitEvent(event) {
    eventListeners.forEach((listener) => listener(event))
}

function createClient() {
    let stompClient

    stompClient = new Client({
        brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
        connectionTimeout: 8000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => {},
        onConnect: () => {
            if (client !== stompClient) return
            setConnectionStatus('connected')
            stompClient.subscribe(CHAT_EVENTS_DESTINATION, (message) => {
                const event = parseEvent(message.body)
                if (event) emitEvent(event)
            })
        },
        onWebSocketClose: (event) => {
            if (isDevMode) {
                console.warn('[chatRealtime] WebSocket closed', {
                    code: event?.code,
                    reason: event?.reason,
                })
            }
            if (client === stompClient && stompClient.active) setConnectionStatus('reconnecting')
        },
        onWebSocketError: (event) => {
            if (isDevMode) {
                console.warn('[chatRealtime] WebSocket error', event)
            }
            if (client === stompClient) setConnectionStatus('error')
        },
        onStompError: (frame) => {
            if (isDevMode) {
                console.warn('[chatRealtime] STOMP error', frame?.headers?.message || frame)
            }
            if (client === stompClient) setConnectionStatus('error')
        },
    })

    return stompClient
}

function activate(userId) {
    if (client?.active && activeUserId === userId) return

    if (client) {
        void client.deactivate()
    }

    activeUserId = userId
    client = createClient()
    setConnectionStatus('connecting')
    client.activate()
}

export function retainChatRealtime(userId) {
    retainCount += 1
    activate(userId)
}

export function releaseChatRealtime() {
    retainCount = Math.max(0, retainCount - 1)

    queueMicrotask(() => {
        if (retainCount !== 0 || !client) return

        const clientToDeactivate = client
        client = null
        activeUserId = null
        setConnectionStatus('idle')
        void clientToDeactivate.deactivate()
    })
}

export function subscribeChatEvents(listener) {
    eventListeners.add(listener)
    return () => eventListeners.delete(listener)
}

export function subscribeChatConnectionStatus(listener) {
    statusListeners.add(listener)
    listener(connectionStatus)
    return () => statusListeners.delete(listener)
}

export function publishChatMessage(dialogId, payload) {
    if (!client?.connected) return false

    client.publish({
        destination: `/app/chats/${dialogId}/send`,
        body: JSON.stringify(payload),
    })
    return true
}

export function publishChatRead(dialogId, lastReadMessageId) {
    if (!client?.connected) return false

    client.publish({
        destination: `/app/chats/${dialogId}/read`,
        body: JSON.stringify({ lastReadMessageId }),
    })
    return true
}

export function publishChatTyping(dialogId, typing) {
    if (!client?.connected) return false

    client.publish({
        destination: `/app/chats/${dialogId}/typing`,
        body: JSON.stringify({ typing }),
    })
    return true
}
