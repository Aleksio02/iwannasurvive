import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Download, FileText, LoaderCircle, Paperclip, RefreshCw, Send, SmilePlus, Trash2, X, ZoomIn } from 'lucide-react'
import { useLocation, useRoute } from 'wouter'
import DashboardLayout from '@/features/Dashboard/DashboardLayout'
import Textarea from '@/shared/ui/Textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { getSessionUser } from '@/shared/lib/utils/sessionStore'
import {
    archiveChat,
    getChatDialog,
    getChatDialogs,
    getChatAttachmentDownloadUrl,
    getChatMessages,
    markChatRead,
    sendChatAttachment,
    unarchiveChat,
} from '@/shared/api/chats'
import { useChatRealtime } from './useChatRealtime'
import ChatImageLightbox from './ChatImageLightbox'
import './ChatsPage.scss'

const MESSAGE_LIMIT = 50
const CHAT_TEXTAREA_MIN_HEIGHT = 58
const CHAT_TEXTAREA_MAX_HEIGHT = 160
const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024
const PDF_MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const EMOJI_GROUPS = [
    ['Эмоции', ['😊', '😂', '😍', '🥳', '😎', '🤔', '😢', '❤️']],
    ['Жесты', ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '👋']],
    ['Работа и учёба', ['💼', '📚', '✍️', '✅', '🚀', '🎯', '💡', '📌']],
    ['Объекты', ['📎', '📄', '📅', '📞', '💻', '☕', '🎁', '⭐']],
]
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
        case 'MESSAGE_REMOVE':
            return {
                ...state,
                messagesByDialogId: {
                    ...state.messagesByDialogId,
                    [action.dialogId]: (state.messagesByDialogId[action.dialogId] || []).filter((message) =>
                        message.clientMessageId !== action.clientMessageId
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

function formatFileSize(sizeBytes) {
    if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} КБ`
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
}

function validateAttachment(file) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        return 'Можно отправить JPG, PNG, WEBP или PDF'
    }

    const maxSize = file.type === 'application/pdf' ? PDF_MAX_SIZE_BYTES : IMAGE_MAX_SIZE_BYTES
    if (file.size > maxSize) {
        return file.type === 'application/pdf'
            ? 'Размер PDF не должен превышать 20 МБ'
            : 'Размер изображения не должен превышать 10 МБ'
    }

    return ''
}

function openDownloadUrl(url) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
}

function ChatAttachment({ dialogId, attachment, failed = false, pending = false }) {
    const [imageUrl, setImageUrl] = useState(attachment.localPreviewUrl || '')
    const [isThumbnailLoading, setIsThumbnailLoading] = useState(!attachment.localPreviewUrl)
    const [isFileOpening, setIsFileOpening] = useState(false)
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)
    const [fullImageUrl, setFullImageUrl] = useState('')
    const [isFullImageLoading, setIsFullImageLoading] = useState(false)
    const [fullImageError, setFullImageError] = useState('')
    const thumbnailRef = useRef(null)
    const isImage = attachment.attachmentKind === 'IMAGE'

    useEffect(() => {
        if (!isImage || attachment.localPreviewUrl || !attachment.id) return undefined

        let isActive = true
        getChatAttachmentDownloadUrl(dialogId, attachment.id)
            .then((response) => {
                if (isActive) {
                    setImageUrl(response.url)
                    setIsThumbnailLoading(false)
                }
            })
            .catch(() => {
                if (isActive) setIsThumbnailLoading(false)
            })

        return () => {
            isActive = false
        }
    }, [attachment.id, attachment.localPreviewUrl, dialogId, isImage])

    const closeLightbox = useCallback(() => {
        setIsLightboxOpen(false)
        setFullImageUrl('')
        setFullImageError('')
        requestAnimationFrame(() => thumbnailRef.current?.focus())
    }, [])

    const handleOpenImage = async () => {
        if (failed) return

        setIsLightboxOpen(true)
        setIsFullImageLoading(true)
        setFullImageError('')

        if (attachment.localPreviewUrl) {
            setFullImageUrl(attachment.localPreviewUrl)
            return
        }
        if (!attachment.id) {
            setIsFullImageLoading(false)
            setFullImageError('Изображение пока недоступно')
            return
        }

        try {
            const response = await getChatAttachmentDownloadUrl(dialogId, attachment.id)
            setFullImageUrl(response.url)
        } catch {
            setIsFullImageLoading(false)
            setFullImageError('Не удалось загрузить изображение')
        }
    }

    if (isImage) {
        return (
            <>
                <button
                    ref={thumbnailRef}
                    type="button"
                    className="chats__attachment-image"
                    aria-label={`Открыть изображение ${attachment.originalFileName}`}
                    disabled={failed}
                    onClick={handleOpenImage}
                >
                    {imageUrl && <img src={imageUrl} alt={attachment.originalFileName} loading="lazy" />}
                    {(isThumbnailLoading || pending) && (
                        <span className="chats__attachment-overlay">
                            <LoaderCircle className="chats__spinner" size={24} aria-hidden="true" />
                        </span>
                    )}
                    {failed && (
                        <span className="chats__attachment-overlay chats__attachment-overlay--error">
                            <X size={22} aria-hidden="true" />
                            <small>Не отправлено</small>
                        </span>
                    )}
                    {imageUrl && !isThumbnailLoading && !pending && !failed && (
                        <ZoomIn className="chats__attachment-zoom" size={22} aria-hidden="true" />
                    )}
                </button>
                {isLightboxOpen && (
                    <ChatImageLightbox
                        alt={attachment.originalFileName}
                        error={fullImageError}
                        imageUrl={fullImageUrl}
                        isLoading={isFullImageLoading}
                        onClose={closeLightbox}
                        onImageError={() => {
                            setIsFullImageLoading(false)
                            setFullImageError('Не удалось загрузить изображение')
                        }}
                        onImageLoad={() => setIsFullImageLoading(false)}
                    />
                )}
            </>
        )
    }

    const handleOpenFile = async () => {
        if (!attachment.id || isFileOpening || pending || failed) return

        setIsFileOpening(true)
        try {
            const response = await getChatAttachmentDownloadUrl(dialogId, attachment.id)
            openDownloadUrl(response.url)
        } catch {
            return
        } finally {
            setIsFileOpening(false)
        }
    }

    return (
        <button
            type="button"
            className="chats__attachment-file"
            disabled={pending || failed}
            onClick={handleOpenFile}
        >
            {pending || isFileOpening
                ? <LoaderCircle className="chats__spinner chats__attachment-file-icon" size={20} aria-hidden="true" />
                : <FileText className="chats__attachment-file-icon" size={20} aria-hidden="true" />}
            <span className="chats__attachment-file-info">
                <strong>{attachment.originalFileName}</strong>
                <small>{formatFileSize(attachment.sizeBytes)}</small>
            </span>
            {!pending && !isFileOpening && <Download size={17} aria-hidden="true" />}
        </button>
    )
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
    const [isEmojiOpen, setIsEmojiOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [selectedFilePreview, setSelectedFilePreview] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const messageListRef = useRef(null)
    const textareaRef = useRef(null)
    const fileInputRef = useRef(null)
    const emojiButtonRef = useRef(null)
    const emojiPickerRef = useRef(null)
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

    const resizeTextarea = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        textarea.style.height = 'auto'
        const nextHeight = Math.min(textarea.scrollHeight, CHAT_TEXTAREA_MAX_HEIGHT)
        textarea.style.height = `${Math.max(CHAT_TEXTAREA_MIN_HEIGHT, nextHeight)}px`
        textarea.style.overflowY = textarea.scrollHeight > CHAT_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden'
    }, [])

    useLayoutEffect(() => {
        resizeTextarea()
    }, [draft, resizeTextarea])

    useEffect(() => {
        if (!selectedFile || !selectedFile.type.startsWith('image/')) {
            setSelectedFilePreview('')
            return undefined
        }

        const previewUrl = URL.createObjectURL(selectedFile)
        setSelectedFilePreview(previewUrl)
        return () => URL.revokeObjectURL(previewUrl)
    }, [selectedFile])

    useEffect(() => {
        if (!isEmojiOpen) return undefined

        const handlePointerDown = (event) => {
            if (
                !emojiPickerRef.current?.contains(event.target) &&
                !emojiButtonRef.current?.contains(event.target)
            ) {
                setIsEmojiOpen(false)
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [isEmojiOpen])

    const insertEmoji = (emoji) => {
        const textarea = textareaRef.current
        const start = textarea?.selectionStart ?? draft.length
        const end = textarea?.selectionEnd ?? start
        const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`

        setDraft(nextDraft.slice(0, 4000))
        setIsEmojiOpen(false)
        requestAnimationFrame(() => {
            const nextCursor = Math.min(start + emoji.length, 4000)
            textareaRef.current?.focus()
            textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
        })
    }

    const handleFileSelect = (file) => {
        if (!file) return

        const validationError = validateAttachment(file)
        if (validationError) {
            toast({ title: 'Файл не выбран', description: validationError, variant: 'destructive' })
            return
        }

        setSelectedFile(file)
        setIsEmojiOpen(false)
    }

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

    const sendAttachmentMessage = useCallback(async (
        file,
        body,
        clientMessageId = createClientMessageId(),
        existingPreviewUrl = ''
    ) => {
        if (!routeDialogId || !file || !state.activeDialog?.canSend || isUploading) return

        const validationError = validateAttachment(file)
        if (validationError) {
            toast({ title: 'Файл не отправлен', description: validationError, variant: 'destructive' })
            return
        }

        const normalizedBody = body.trim()
        const localPreviewUrl = existingPreviewUrl || (file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
        dispatch({
            type: 'MESSAGE_OPTIMISTIC',
            dialogId: routeDialogId,
            message: {
                clientMessageId,
                body: normalizedBody || null,
                dialogId: routeDialogId,
                senderUserId: currentUser?.id,
                createdAt: new Date().toISOString(),
                messageType: normalizedBody ? 'MIXED' : 'ATTACHMENT',
                attachments: [{
                    originalFileName: file.name,
                    mediaType: file.type,
                    sizeBytes: file.size,
                    attachmentKind: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
                    localPreviewUrl,
                }],
                retryFile: file,
                pending: true,
                failed: false,
            },
        })
        setDraft('')
        setSelectedFile(null)
        setIsUploading(true)
        requestAnimationFrame(() => scrollToBottom())

        try {
            const saved = await sendChatAttachment(routeDialogId, {
                clientMessageId,
                body: normalizedBody,
                file,
            })
            dispatch({ type: 'MESSAGES_LOADED', dialogId: routeDialogId, messages: [saved] })
            if (localPreviewUrl) setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 0)
        } catch (error) {
            dispatch({ type: 'MESSAGE_FAILED', dialogId: routeDialogId, clientMessageId })
            toast({ title: 'Файл не отправлен', description: error.message, variant: 'destructive' })
        } finally {
            setIsUploading(false)
        }
    }, [currentUser?.id, isUploading, routeDialogId, scrollToBottom, state.activeDialog?.canSend, toast])

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

    const removeFailedMessage = (message) => {
        const previewUrl = message.attachments?.[0]?.localPreviewUrl
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        dispatch({ type: 'MESSAGE_REMOVE', dialogId: message.dialogId, clientMessageId: message.clientMessageId })
    }

    const connectionLabel = {
        connecting: 'Подключение...',
        reconnecting: 'Переподключение...',
        error: 'Нет подключения. Отправка станет доступна после переподключения.',
        idle: 'Нет подключения. Обновите страницу или войдите заново.',
    }[connectionStatus]
    const canEdit = Boolean(state.activeDialog?.canSend)
    const canSubmit = canEdit &&
        !isUploading &&
        Boolean(draft.trim() || selectedFile) &&
        Boolean(selectedFile || connectionStatus === 'connected')
    const composerPlaceholder = !canEdit
        ? 'Отправка недоступна для этого диалога'
        : connectionStatus !== 'connected'
            ? 'Текст отправится после подключения. Файл можно отправить сейчас.'
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
                                    <p className="chats__empty-thread">Напишите первое сообщение по этому отклику</p>
                                )}
                                {messages.map((message) => {
                                    const isOwn = message.senderUserId === currentUser?.id
                                    return (
                                        <div
                                            key={message.id || message.clientMessageId}
                                            className={`chats__message ${isOwn ? 'chats__message--own' : ''}`}
                                        >
                                            {message.body && <p>{message.body}</p>}
                                            {(message.attachments || []).map((attachment) => (
                                                <ChatAttachment
                                                    key={attachment.id || `${message.clientMessageId}-${attachment.originalFileName}`}
                                                    dialogId={message.dialogId}
                                                    attachment={attachment}
                                                    failed={message.failed}
                                                    pending={message.pending}
                                                />
                                            ))}
                                            <span>
                                                {formatTime(message.createdAt)}
                                                {message.pending && ' · отправляется'}
                                                {message.failed && ' · не отправлено'}
                                            </span>
                                            {message.failed && (
                                                <div className="chats__message-actions">
                                                <button
                                                    className="chats__message-action"
                                                    disabled={message.retryFile ? isUploading : connectionStatus !== 'connected'}
                                                    onClick={() => {
                                                        if (message.retryFile) {
                                                            void sendAttachmentMessage(
                                                                message.retryFile,
                                                                message.body || '',
                                                                message.clientMessageId,
                                                                message.attachments?.[0]?.localPreviewUrl || ''
                                                            )
                                                        } else {
                                                            void sendMessage(message.body, message.clientMessageId)
                                                        }
                                                    }}
                                                >
                                                    <RefreshCw size={13} aria-hidden="true" />
                                                    Повторить
                                                </button>
                                                    {message.retryFile && (
                                                        <button
                                                            type="button"
                                                            className="chats__message-action"
                                                            disabled={isUploading}
                                                            onClick={() => removeFailedMessage(message)}
                                                        >
                                                            <Trash2 size={13} aria-hidden="true" />
                                                            Удалить
                                                        </button>
                                                    )}
                                                </div>
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
                                    if (selectedFile) {
                                        void sendAttachmentMessage(selectedFile, draft)
                                    } else {
                                        void sendMessage(draft)
                                    }
                                }}
                            >
                                <div className="chats__composer-row">
                                    <div className="chats__composer-tools">
                                        <button
                                            ref={emojiButtonRef}
                                            type="button"
                                            className="chats__tool"
                                            aria-label="Открыть смайлики"
                                            title="Открыть смайлики"
                                            disabled={!canEdit}
                                            onClick={() => setIsEmojiOpen((isOpen) => !isOpen)}
                                        >
                                            <SmilePlus size={20} aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            className="chats__tool"
                                            aria-label="Прикрепить файл"
                                            title="Прикрепить файл"
                                            disabled={!canEdit || isUploading}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Paperclip size={20} aria-hidden="true" />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            className="chats__file-input"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            onChange={(event) => {
                                                handleFileSelect(event.target.files?.[0])
                                                event.target.value = ''
                                            }}
                                        />
                                    </div>
                                    <Textarea
                                        ref={textareaRef}
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                        placeholder={composerPlaceholder}
                                        rows={2}
                                        maxLength={4000}
                                        disabled={!canEdit}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault()
                                                if (selectedFile) {
                                                    void sendAttachmentMessage(selectedFile, draft)
                                                } else {
                                                    void sendMessage(draft)
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        className="button chats__send"
                                        disabled={!canSubmit}
                                        aria-label="Отправить сообщение"
                                        title="Отправить сообщение"
                                    >
                                        {isUploading
                                            ? <LoaderCircle className="chats__spinner" size={20} aria-hidden="true" />
                                            : <Send size={20} aria-hidden="true" />}
                                    </button>
                                </div>
                                {isEmojiOpen && (
                                    <div ref={emojiPickerRef} className="chats__emoji-panel">
                                        {EMOJI_GROUPS.map(([title, emojis]) => (
                                            <section key={title}>
                                                <strong>{title}</strong>
                                                <div>
                                                    {emojis.map((emoji) => (
                                                        <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}>
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                )}
                                {selectedFile && (
                                    <div className="chats__selected-file">
                                        {selectedFilePreview
                                            ? <img src={selectedFilePreview} alt="" />
                                            : <FileText className="chats__attachment-file-icon" size={22} aria-hidden="true" />}
                                        <span>
                                            <strong>{selectedFile.name}</strong>
                                            <small>{formatFileSize(selectedFile.size)}</small>
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Убрать прикреплённый файл"
                                            title="Убрать файл"
                                            onClick={() => setSelectedFile(null)}
                                        >
                                            <X size={18} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                                <div className="chats__composer-footer">
                                    <span>{draft.length}/4000</span>
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
