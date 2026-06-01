import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useRoute } from 'wouter'
import DashboardLayout from '@/features/Dashboard/DashboardLayout'
import Button from '@/shared/ui/Button'
import Textarea from '@/shared/ui/Textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { getSessionUser } from '@/shared/lib/utils/sessionStore'
import {
    archiveChat,
    getChatDialog,
    getChatDialogs,
    getChatMessages,
    markChatRead,
    unarchiveChat,
} from '@/shared/api/chats'
import { useChatRealtime } from './useChatRealtime'
import './ChatsPage.scss'

const MESSAGE_LIMIT = 50
const INITIAL_STATE = {
    dialogs: [],
    nextCursor: null,
    dialogsLoading: true,
    dialogsError: '',
    activeDialog: null,
    messagesByDialogId: {},
    hasOlderByDialogId: {},
    messagesLoading: false,
    messagesError: '',
}

function mergeMessages(current = [], incoming = []) {
    const byKey = new Map()

    current.forEach((message) => {
        byKey.set(message.id ? `id:${message.id}` : `client:${message.clientMessageId}`, message)
    })

    incoming.forEach((message) => {
        const optimisticKey = `client:${message.clientMessageId}`
        const serverKey = message.id ? `id:${message.id}` : optimisticKey

        if (message.id) byKey.delete(optimisticKey)
        byKey.set(serverKey, message.id
            ? { ...byKey.get(serverKey), ...message, pending: false, failed: false }
            : { ...byKey.get(serverKey), ...message }
        )
    })

    return Array.from(byKey.values()).sort((a, b) => {
        if (a.id && b.id) return a.id - b.id
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    })
}

function upsertDialog(dialogs, incoming) {
    const next = dialogs.filter((dialog) => dialog.dialogId !== incoming.dialogId)
    return [incoming, ...next].sort((a, b) =>
        String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || ''))
    )
}

function reducer(state, action) {
    switch (action.type) {
        case 'DIALOGS_LOADING':
            return { ...state, dialogsLoading: true, dialogsError: '' }
        case 'DIALOGS_LOADED':
            return {
                ...state,
                dialogs: action.append ? [...state.dialogs, ...action.page.items] : action.page.items,
                nextCursor: action.page.nextCursor || null,
                dialogsLoading: false,
            }
        case 'DIALOGS_ERROR':
            return { ...state, dialogsLoading: false, dialogsError: action.message }
        case 'DIALOG_UPSERT':
            return { ...state, dialogs: upsertDialog(state.dialogs, action.dialog) }
        case 'ACTIVE_DIALOG_LOADING':
            return { ...state, activeDialog: null }
        case 'ACTIVE_DIALOG_LOADED':
            return { ...state, activeDialog: action.dialog }
        case 'MESSAGES_LOADING':
            return { ...state, messagesLoading: true, messagesError: '' }
        case 'MESSAGES_LOADED':
            return {
                ...state,
                messagesLoading: false,
                messagesByDialogId: {
                    ...state.messagesByDialogId,
                    [action.dialogId]: action.prepend
                        ? mergeMessages(action.messages, state.messagesByDialogId[action.dialogId])
                        : mergeMessages(state.messagesByDialogId[action.dialogId], action.messages),
                },
                hasOlderByDialogId: action.trackOlder
                    ? {
                        ...state.hasOlderByDialogId,
                        [action.dialogId]: action.messages.length === MESSAGE_LIMIT,
                    }
                    : state.hasOlderByDialogId,
            }
        case 'MESSAGES_ERROR':
            return { ...state, messagesLoading: false, messagesError: action.message }
        case 'MESSAGE_OPTIMISTIC':
            return {
                ...state,
                messagesByDialogId: {
                    ...state.messagesByDialogId,
                    [action.dialogId]: mergeMessages(state.messagesByDialogId[action.dialogId], [action.message]),
                },
            }
        case 'MESSAGE_FAILED':
            return {
                ...state,
                messagesByDialogId: {
                    ...state.messagesByDialogId,
                    [action.dialogId]: (state.messagesByDialogId[action.dialogId] || []).map((message) =>
                        message.clientMessageId === action.clientMessageId
                            ? { ...message, pending: false, failed: true }
                            : message
                    ),
                },
            }
        default:
            return state
    }
}

function formatTime(value) {
    if (!value) return ''

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

function createClientMessageId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getLastServerMessageId(messages) {
    return messages.reduce((max, message) => Math.max(max, message.id || 0), 0)
}

function ChatsPage() {
    const [, routeParams] = useRoute('/chats/:dialogId')
    const [, navigate] = useLocation()
    const currentUser = getSessionUser()
    const routeDialogId = Number(routeParams?.dialogId) || null
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
    const [filter, setFilter] = useState('all')
    const [draft, setDraft] = useState('')
    const [showJumpToNew, setShowJumpToNew] = useState(false)
    const messageListRef = useRef(null)
    const shouldStickToBottomRef = useRef(true)
    const previousScrollMetricsRef = useRef(null)
    const olderMessagesLoadingRef = useRef(false)
    const lastMarkedReadByDialogRef = useRef(new Map())
    const reconcileTimersRef = useRef(new Map())
    const handledEventSequenceRef = useRef(0)
    const stateRef = useRef(state)
    const { toast } = useToast()
    const { connectionStatus, events, publishMessage, publishRead } = useChatRealtime()

    const messages = useMemo(
        () => state.messagesByDialogId[routeDialogId] || [],
        [routeDialogId, state.messagesByDialogId]
    )

    useEffect(() => {
        stateRef.current = state
    }, [state])

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        const list = messageListRef.current
        if (!list) return
        list.scrollTo({ top: list.scrollHeight, behavior })
        setShowJumpToNew(false)
    }, [])

    const loadDialogs = useCallback(async ({ append = false } = {}) => {
        dispatch({ type: 'DIALOGS_LOADING' })

        try {
            const page = await getChatDialogs({
                limit: 20,
                unreadOnly: filter === 'unread',
                archived: filter === 'archive',
                cursor: append ? state.nextCursor : null,
            })
            dispatch({ type: 'DIALOGS_LOADED', page, append })
        } catch (error) {
            dispatch({ type: 'DIALOGS_ERROR', message: error.message || 'Не удалось загрузить диалоги' })
        }
    }, [filter, state.nextCursor])

    const markLatestAsRead = useCallback(async (dialogId, nextMessages) => {
        const incomingMessages = nextMessages.filter((message) =>
            message.id && message.senderUserId !== currentUser?.id
        )
        const lastIncoming = incomingMessages[incomingMessages.length - 1]

        if (!lastIncoming) return
        if (lastMarkedReadByDialogRef.current.get(dialogId) === lastIncoming.id) return

        lastMarkedReadByDialogRef.current.set(dialogId, lastIncoming.id)
        if (!publishRead(dialogId, lastIncoming.id)) {
            try {
                await markChatRead(dialogId, lastIncoming.id)
            } catch {
                lastMarkedReadByDialogRef.current.delete(dialogId)
                return
            }
        }
    }, [currentUser?.id, publishRead])

    const loadActiveDialog = useCallback(async (dialogId) => {
        if (!dialogId) return

        dispatch({ type: 'ACTIVE_DIALOG_LOADING' })
        dispatch({ type: 'MESSAGES_LOADING' })

        try {
            const [dialog, loadedMessages] = await Promise.all([
                getChatDialog(dialogId),
                getChatMessages(dialogId, { limit: MESSAGE_LIMIT }),
            ])
            dispatch({ type: 'ACTIVE_DIALOG_LOADED', dialog })
            dispatch({ type: 'MESSAGES_LOADED', dialogId, messages: loadedMessages, trackOlder: true })
            await markLatestAsRead(dialogId, loadedMessages)
            requestAnimationFrame(() => scrollToBottom('auto'))
        } catch (error) {
            dispatch({ type: 'MESSAGES_ERROR', message: error.message || 'Не удалось загрузить сообщения' })
        }
    }, [markLatestAsRead, scrollToBottom])

    const reconcileDialog = useCallback(async (dialogId) => {
        const existing = state.messagesByDialogId[dialogId] || []
        const afterMessageId = getLastServerMessageId(existing)

        try {
            const fresh = await getChatMessages(dialogId, {
                afterMessageId: afterMessageId || undefined,
                limit: MESSAGE_LIMIT,
            })
            dispatch({ type: 'MESSAGES_LOADED', dialogId, messages: fresh })
            return fresh
        } catch {
            return []
        }
    }, [state.messagesByDialogId])

    const scheduleReconciliation = useCallback((dialogId, clientMessageId) => {
        const existingTimer = reconcileTimersRef.current.get(clientMessageId)
        if (existingTimer) clearTimeout(existingTimer)

        const timer = setTimeout(async () => {
            const fresh = await reconcileDialog(dialogId)
            const currentMessages = stateRef.current.messagesByDialogId[dialogId] || []
            const confirmed = [...currentMessages, ...fresh].some((message) =>
                message.id && message.clientMessageId === clientMessageId
            )
            if (!confirmed) {
                dispatch({ type: 'MESSAGE_FAILED', dialogId, clientMessageId })
            }
            reconcileTimersRef.current.delete(clientMessageId)
        }, 1500)

        reconcileTimersRef.current.set(clientMessageId, timer)
    }, [reconcileDialog])

    const sendMessage = useCallback((body, clientMessageId = createClientMessageId()) => {
        const normalizedBody = body.trim()
        if (!routeDialogId || !normalizedBody || normalizedBody.length > 4000) return
        if (connectionStatus !== 'connected') {
            toast({
                title: 'Нет подключения',
                description: 'Дождитесь восстановления соединения и повторите отправку.',
                variant: 'destructive',
            })
            return
        }

        const payload = { clientMessageId, body: normalizedBody }
        dispatch({
            type: 'MESSAGE_OPTIMISTIC',
            dialogId: routeDialogId,
            message: {
                ...payload,
                dialogId: routeDialogId,
                senderUserId: currentUser?.id,
                createdAt: new Date().toISOString(),
                pending: true,
                failed: false,
            },
        })
        setDraft('')
        requestAnimationFrame(() => scrollToBottom())

        if (!publishMessage(routeDialogId, payload)) {
            dispatch({ type: 'MESSAGE_FAILED', dialogId: routeDialogId, clientMessageId })
            toast({
                title: 'Сообщение не отправлено',
                description: 'Соединение прервалось. Повторите отправку после переподключения.',
                variant: 'destructive',
            })
            return
        }

        scheduleReconciliation(routeDialogId, clientMessageId)
    }, [connectionStatus, currentUser?.id, publishMessage, routeDialogId, scheduleReconciliation, scrollToBottom, toast])

    const loadOlderMessages = useCallback(async () => {
        if (
            !routeDialogId ||
            olderMessagesLoadingRef.current ||
            state.messagesLoading ||
            !state.hasOlderByDialogId[routeDialogId]
        ) return

        const firstServerMessage = messages.find((message) => message.id)
        if (!firstServerMessage) return

        const list = messageListRef.current
        previousScrollMetricsRef.current = list
            ? { scrollHeight: list.scrollHeight, scrollTop: list.scrollTop }
            : null
        olderMessagesLoadingRef.current = true
        dispatch({ type: 'MESSAGES_LOADING' })

        try {
            const older = await getChatMessages(routeDialogId, {
                beforeMessageId: firstServerMessage.id,
                limit: MESSAGE_LIMIT,
            })
            dispatch({ type: 'MESSAGES_LOADED', dialogId: routeDialogId, messages: older, prepend: true, trackOlder: true })
        } catch (error) {
            dispatch({ type: 'MESSAGES_ERROR', message: error.message || 'Не удалось загрузить старые сообщения' })
        } finally {
            olderMessagesLoadingRef.current = false
        }
    }, [messages, routeDialogId, state.hasOlderByDialogId, state.messagesLoading])

    useEffect(() => {
        void loadDialogs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])

    useEffect(() => {
        void loadActiveDialog(routeDialogId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeDialogId])

    useEffect(() => {
        events.forEach(({ sequence, event }) => {
            if (sequence <= handledEventSequenceRef.current) return
            handledEventSequenceRef.current = sequence

            if (event.type === 'MESSAGE_CREATED') {
                const timer = reconcileTimersRef.current.get(event.payload.clientMessageId)
                if (timer) {
                    clearTimeout(timer)
                    reconcileTimersRef.current.delete(event.payload.clientMessageId)
                }
                dispatch({ type: 'MESSAGES_LOADED', dialogId: event.dialogId, messages: [event.payload] })

                if (event.dialogId === routeDialogId) {
                    const isIncoming = event.payload.senderUserId !== currentUser?.id
                    if (!isIncoming || shouldStickToBottomRef.current) {
                        requestAnimationFrame(() => scrollToBottom())
                    } else {
                        requestAnimationFrame(() => setShowJumpToNew(true))
                    }
                    if (isIncoming && shouldStickToBottomRef.current) {
                        void markLatestAsRead(routeDialogId, [event.payload])
                    }
                }
                return
            }

            if (event.type === 'DIALOG_UPDATED') {
                dispatch({ type: 'DIALOG_UPSERT', dialog: event.payload })
                if (event.dialogId === routeDialogId) {
                    dispatch({ type: 'ACTIVE_DIALOG_LOADED', dialog: event.payload })
                }
            }
        })
    }, [currentUser?.id, events, markLatestAsRead, routeDialogId, scrollToBottom])

    useEffect(() => {
        if (connectionStatus === 'connected' && routeDialogId) {
            void reconcileDialog(routeDialogId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionStatus])

    useEffect(() => {
        if (!routeDialogId) return undefined

        const reconcileVisibleDialog = () => {
            if (document.visibilityState === 'visible') {
                void reconcileDialog(routeDialogId)
            }
        }

        document.addEventListener('visibilitychange', reconcileVisibleDialog)
        window.addEventListener('focus', reconcileVisibleDialog)

        return () => {
            document.removeEventListener('visibilitychange', reconcileVisibleDialog)
            window.removeEventListener('focus', reconcileVisibleDialog)
        }
    }, [reconcileDialog, routeDialogId])

    useLayoutEffect(() => {
        const list = messageListRef.current
        const previousMetrics = previousScrollMetricsRef.current
        if (!list || !previousMetrics) return

        list.scrollTop = previousMetrics.scrollTop + list.scrollHeight - previousMetrics.scrollHeight
        previousScrollMetricsRef.current = null
    }, [messages.length])

    useEffect(() => () => {
        reconcileTimersRef.current.forEach(clearTimeout)
    }, [])

    const handleArchive = async () => {
        if (!routeDialogId || !state.activeDialog) return

        try {
            if (state.activeDialog.archived) {
                await unarchiveChat(routeDialogId)
            } else {
                await archiveChat(routeDialogId)
            }
            navigate('/chats')
            void loadDialogs()
        } catch (error) {
            toast({ title: 'Не удалось обновить архив', description: error.message, variant: 'destructive' })
        }
    }

    const connectionLabel = {
        connecting: 'Подключение...',
        reconnecting: 'Переподключение...',
        error: 'Нет подключения. Отправка станет доступна после переподключения.',
        idle: 'Нет подключения. Обновите страницу или войдите заново.',
    }[connectionStatus]
    const canCompose = state.activeDialog?.canSend && connectionStatus === 'connected'
    const composerPlaceholder = !state.activeDialog?.canSend
        ? 'Отправка недоступна для этого диалога'
        : connectionStatus !== 'connected'
            ? 'Ожидаем подключения...'
            : 'Введите сообщение'

    return (
        <DashboardLayout title="Сообщения" subtitle="Общайтесь по вашим откликам">
            <div className={`chats ${routeDialogId ? 'chats--thread-open' : ''}`}>
                <aside className="chats__sidebar">
                    <div className="chats__filters">
                        {[
                            ['all', 'Все'],
                            ['unread', 'Непрочитанные'],
                            ['archive', 'Архив'],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                className={`chats__filter ${filter === key ? 'is-active' : ''}`}
                                onClick={() => setFilter(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {state.dialogsError && <p className="chats__state chats__state--error">{state.dialogsError}</p>}
                    {!state.dialogsLoading && state.dialogs.length === 0 && (
                        <p className="chats__state">Здесь пока нет диалогов</p>
                    )}

                    <div className="chats__dialog-list">
                        {state.dialogs.map((dialog) => (
                            <button
                                key={dialog.dialogId}
                                className={`chats__dialog ${routeDialogId === dialog.dialogId ? 'is-active' : ''}`}
                                onClick={() => navigate(`/chats/${dialog.dialogId}`)}
                            >
                                <span className="chats__dialog-name">{dialog.counterpart.displayName}</span>
                                <span className="chats__dialog-time">{formatTime(dialog.lastMessageAt)}</span>
                                <span className="chats__dialog-opportunity">{dialog.opportunityTitle}</span>
                                <span className="chats__dialog-preview">{dialog.lastMessagePreview || 'Начните общение'}</span>
                                {dialog.unreadCount > 0 && <span className="chats__badge">{dialog.unreadCount}</span>}
                            </button>
                        ))}
                    </div>

                    {state.nextCursor && (
                        <button className="chats__load-more" onClick={() => void loadDialogs({ append: true })}>
                            Показать ещё
                        </button>
                    )}
                </aside>

                <section className="chats__thread">
                    {!routeDialogId ? (
                        <div className="chats__placeholder">Выберите диалог, чтобы открыть переписку</div>
                    ) : (
                        <>
                            <header className="chats__thread-header">
                                <button className="chats__back" onClick={() => navigate('/chats')}>Назад</button>
                                <div>
                                    <h2>{state.activeDialog?.counterpart?.displayName || 'Диалог'}</h2>
                                    <p>{state.activeDialog?.opportunityTitle || ''}</p>
                                </div>
                                <button className="chats__archive" onClick={handleArchive}>
                                    {state.activeDialog?.archived ? 'Восстановить' : 'В архив'}
                                </button>
                            </header>

                            {connectionLabel && <p className="chats__connection">{connectionLabel}</p>}
                            {state.messagesError && <p className="chats__state chats__state--error">{state.messagesError}</p>}

                            <div
                                ref={messageListRef}
                                className="chats__messages"
                                onScroll={(event) => {
                                    const list = event.currentTarget
                                    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80
                                    shouldStickToBottomRef.current = isNearBottom
                                    if (isNearBottom) {
                                        setShowJumpToNew(false)
                                        void markLatestAsRead(routeDialogId, messages)
                                    }
                                    if (list.scrollTop < 60) void loadOlderMessages()
                                }}
                            >
                                {state.messagesLoading && messages.length > 0 && (
                                    <p className="chats__history-loading">Загружаем историю...</p>
                                )}
                                {!state.messagesLoading && messages.length === 0 && (
                                    <p className="chats__empty-thread">В диалоге пока нет сообщений</p>
                                )}
                                {messages.map((message) => {
                                    const isOwn = message.senderUserId === currentUser?.id
                                    return (
                                        <div
                                            key={message.id || message.clientMessageId}
                                            className={`chats__message ${isOwn ? 'chats__message--own' : ''}`}
                                        >
                                            <p>{message.body}</p>
                                            <span>
                                                {formatTime(message.createdAt)}
                                                {message.pending && ' · отправляется'}
                                                {message.failed && ' · не отправлено'}
                                            </span>
                                            {message.failed && (
                                                <button
                                                    disabled={connectionStatus !== 'connected'}
                                                    onClick={() => void sendMessage(message.body, message.clientMessageId)}
                                                >
                                                    Повторить
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {showJumpToNew && (
                                <button
                                    className="chats__jump"
                                    onClick={() => {
                                        scrollToBottom()
                                        void markLatestAsRead(routeDialogId, messages)
                                    }}
                                >
                                    Новые сообщения
                                </button>
                            )}

                            <form
                                className="chats__composer"
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    void sendMessage(draft)
                                }}
                            >
                                <Textarea
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder={composerPlaceholder}
                                    rows={2}
                                    maxLength={4000}
                                    disabled={!canCompose}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault()
                                            void sendMessage(draft)
                                        }
                                    }}
                                />
                                <div className="chats__composer-footer">
                                    <span>{draft.length}/4000</span>
                                    <Button
                                        type="submit"
                                        disabled={!canCompose || !draft.trim()}
                                    >
                                        Отправить
                                    </Button>
                                </div>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </DashboardLayout>
    )
}

export default ChatsPage
