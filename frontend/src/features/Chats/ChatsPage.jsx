import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Download, FileText, LoaderCircle, MoreHorizontal, Paperclip, Pin, RefreshCw, Search, Send, SmilePlus, Trash2, X, ZoomIn } from 'lucide-react'
import { useLocation, useRoute } from 'wouter'
import DashboardLayout from '@/features/Dashboard/DashboardLayout'
import Textarea from '@/shared/ui/Textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { getSessionUser } from '@/shared/lib/utils/sessionStore'
import {
    archiveChat,
    deleteChatMessageForEveryone,
    deleteChatMessageForMe,
    deleteChatMessageReaction,
    editChatMessage,
    forwardChatMessage,
    getChatDialog,
    getChatDialogs,
    getChatAttachmentDownloadUrl,
    getChatMessageContext,
    getChatMessages,
    getChatOpportunityFilters,
    markChatRead,
    markChatUnread,
    pinChatMessage,
    searchChatMessages,
    sendChatMessageRest,
    sendChatAttachment,
    setChatMessageReaction,
    unarchiveChat,
    unpinChatMessage,
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
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
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
    opportunityFilters: [],
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
        case 'OPPORTUNITY_FILTERS_LOADED':
            return { ...state, opportunityFilters: action.items }
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
        case 'MESSAGE_UPSERT':
            return {
                ...state,
                messagesByDialogId: {
                    ...state.messagesByDialogId,
                    [action.dialogId]: mergeMessages(state.messagesByDialogId[action.dialogId], [action.message]),
                },
            }
        case 'MESSAGE_HIDDEN':
            return {
                ...state,
                messagesByDialogId: {
                    ...state.messagesByDialogId,
                    [action.dialogId]: (state.messagesByDialogId[action.dialogId] || []).filter((message) =>
                        message.id !== action.messageId
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
    const [selectedOpportunityId, setSelectedOpportunityId] = useState('')
    const [draft, setDraft] = useState('')
    const [replyToMessage, setReplyToMessage] = useState(null)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editingBody, setEditingBody] = useState('')
    const [openMenuMessageId, setOpenMenuMessageId] = useState(null)
    const [confirmAction, setConfirmAction] = useState(null)
    const [forwardingMessage, setForwardingMessage] = useState(null)
    const [forwardClientMessageId, setForwardClientMessageId] = useState('')
    const [forwardSearch, setForwardSearch] = useState('')
    const [isForwarding, setIsForwarding] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [typingByDialogId, setTypingByDialogId] = useState({})
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
    const suppressAutoReadUntilByDialogRef = useRef(new Map())
    const typingTimerRef = useRef(null)
    const typingStopTimerRef = useRef(null)
    const reconcileTimersRef = useRef(new Map())
    const handledEventSequenceRef = useRef(0)
    const stateRef = useRef(state)
    const { toast } = useToast()
    const { connectionStatus, events, publishMessage, publishRead, publishTyping } = useChatRealtime()

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

    useEffect(() => {
        if (!openMenuMessageId) return undefined
        const close = (event) => {
            if (event.key === 'Escape') setOpenMenuMessageId(null)
        }
        const handlePointer = (event) => {
            if (!event.target.closest?.('.chats__message-menu') && !event.target.closest?.('.chats__message-menu-button')) {
                setOpenMenuMessageId(null)
            }
        }
        document.addEventListener('keydown', close)
        document.addEventListener('pointerdown', handlePointer)
        return () => {
            document.removeEventListener('keydown', close)
            document.removeEventListener('pointerdown', handlePointer)
        }
    }, [openMenuMessageId])

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
                opportunityId: selectedOpportunityId || undefined,
                cursor: append ? state.nextCursor : null,
            })
            dispatch({ type: 'DIALOGS_LOADED', page, append })
        } catch (error) {
            dispatch({ type: 'DIALOGS_ERROR', message: error.message || 'Не удалось загрузить диалоги' })
        }
    }, [filter, selectedOpportunityId, state.nextCursor])

    const markLatestAsRead = useCallback(async (dialogId, nextMessages) => {
        if ((suppressAutoReadUntilByDialogRef.current.get(dialogId) || 0) > Date.now()) return
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

    const sendMessage = useCallback(async (body, clientMessageId = createClientMessageId(), replyMessage = replyToMessage) => {
        const normalizedBody = body.trim()
        if (!routeDialogId || !normalizedBody || normalizedBody.length > 4000) return

        const payload = { clientMessageId, body: normalizedBody, replyToMessageId: replyMessage?.id || undefined }
        dispatch({
            type: 'MESSAGE_OPTIMISTIC',
            dialogId: routeDialogId,
            message: {
                ...payload,
                dialogId: routeDialogId,
                senderUserId: currentUser?.id,
                createdAt: new Date().toISOString(),
                replyTo: replyMessage ? {
                    id: replyMessage.id,
                    senderUserId: replyMessage.senderUserId,
                    senderDisplayName: replyMessage.senderUserId === currentUser?.id ? 'Вы' : state.activeDialog?.counterpart?.displayName || 'Участник',
                    bodyPreview: replyMessage.deletedAt ? 'Сообщение удалено' : replyMessage.body || replyMessage.attachments?.[0]?.originalFileName || 'Вложение',
                    attachmentKind: replyMessage.attachments?.[0]?.attachmentKind || null,
                    deleted: Boolean(replyMessage.deletedAt),
                } : null,
                pending: true,
                failed: false,
            },
        })
        setDraft('')
        setReplyToMessage(null)
        requestAnimationFrame(() => scrollToBottom())

        const published = connectionStatus === 'connected' && publishMessage(routeDialogId, payload)
        if (published) {
            scheduleReconciliation(routeDialogId, clientMessageId)
            return
        }

        try {
            const saved = await sendChatMessageRest(routeDialogId, payload)
            dispatch({ type: 'MESSAGES_LOADED', dialogId: routeDialogId, messages: [saved] })
        } catch (error) {
            dispatch({ type: 'MESSAGE_FAILED', dialogId: routeDialogId, clientMessageId })
            toast({
                title: 'Сообщение не отправлено',
                description: error.message || 'Попробуйте повторить отправку.',
                variant: 'destructive',
            })
        }
    }, [connectionStatus, currentUser?.id, publishMessage, replyToMessage, routeDialogId, scheduleReconciliation, scrollToBottom, state.activeDialog?.counterpart?.displayName, toast])

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
        const replyMessage = replyToMessage
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
                replyTo: replyMessage ? {
                    id: replyMessage.id,
                    senderUserId: replyMessage.senderUserId,
                    senderDisplayName: replyMessage.senderUserId === currentUser?.id ? 'Вы' : state.activeDialog?.counterpart?.displayName || 'Участник',
                    bodyPreview: replyMessage.deletedAt ? 'Сообщение удалено' : replyMessage.body || replyMessage.attachments?.[0]?.originalFileName || 'Вложение',
                    attachmentKind: replyMessage.attachments?.[0]?.attachmentKind || null,
                    deleted: Boolean(replyMessage.deletedAt),
                } : null,
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
        setReplyToMessage(null)
        setSelectedFile(null)
        setIsUploading(true)
        requestAnimationFrame(() => scrollToBottom())

        try {
            const saved = await sendChatAttachment(routeDialogId, {
                clientMessageId,
                body: normalizedBody,
                file,
                replyToMessageId: replyMessage?.id,
            })
            dispatch({ type: 'MESSAGES_LOADED', dialogId: routeDialogId, messages: [saved] })
            if (localPreviewUrl) setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 0)
        } catch (error) {
            dispatch({ type: 'MESSAGE_FAILED', dialogId: routeDialogId, clientMessageId })
            toast({ title: 'Файл не отправлен', description: error.message, variant: 'destructive' })
        } finally {
            setIsUploading(false)
        }
    }, [currentUser?.id, isUploading, replyToMessage, routeDialogId, scrollToBottom, state.activeDialog?.canSend, state.activeDialog?.counterpart?.displayName, toast])

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
    }, [filter, selectedOpportunityId])

    useEffect(() => {
        getChatOpportunityFilters()
            .then((items) => dispatch({ type: 'OPPORTUNITY_FILTERS_LOADED', items }))
            .catch(() => dispatch({ type: 'OPPORTUNITY_FILTERS_LOADED', items: [] }))
    }, [])

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

            if (['MESSAGE_UPDATED', 'MESSAGE_DELETED', 'MESSAGE_REACTIONS_UPDATED'].includes(event.type)) {
                dispatch({ type: 'MESSAGE_UPSERT', dialogId: event.dialogId, message: event.payload })
                return
            }

            if (event.type === 'MESSAGE_HIDDEN') {
                dispatch({ type: 'MESSAGE_HIDDEN', dialogId: event.dialogId, messageId: event.payload.messageId })
                return
            }

            if (event.type === 'TYPING_UPDATED') {
                setTypingByDialogId((current) => ({
                    ...current,
                    [event.dialogId]: event.payload.typing ? event.payload.expiresAt : null,
                }))
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
        if (!routeDialogId || !state.activeDialog?.canSend || connectionStatus !== 'connected') return undefined
        if (!draft.trim()) {
            publishTyping(routeDialogId, false)
            return undefined
        }

        if (!typingTimerRef.current) {
            publishTyping(routeDialogId, true)
            typingTimerRef.current = setTimeout(() => {
                typingTimerRef.current = null
            }, 1200)
        }
        clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = setTimeout(() => {
            publishTyping(routeDialogId, false)
        }, 2500)

        return undefined
    }, [connectionStatus, draft, publishTyping, routeDialogId, state.activeDialog?.canSend])

    useEffect(() => () => {
        if (routeDialogId) publishTyping(routeDialogId, false)
        clearTimeout(typingTimerRef.current)
        clearTimeout(typingStopTimerRef.current)
    }, [publishTyping, routeDialogId])

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

    useEffect(() => {
        if (!isSearchOpen || !routeDialogId || searchQuery.trim().length < 2) {
            setSearchResults([])
            return undefined
        }

        const timer = setTimeout(() => {
            searchChatMessages(routeDialogId, { query: searchQuery.trim(), limit: 20 })
                .then((page) => setSearchResults(page.items || []))
                .catch(() => setSearchResults([]))
        }, 300)

        return () => clearTimeout(timer)
    }, [isSearchOpen, routeDialogId, searchQuery])

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

    const handleMarkUnread = async () => {
        if (!routeDialogId) return
        try {
            suppressAutoReadUntilByDialogRef.current.set(routeDialogId, Date.now() + 3000)
            const dialog = await markChatUnread(routeDialogId)
            dispatch({ type: 'ACTIVE_DIALOG_LOADED', dialog })
            dispatch({ type: 'DIALOG_UPSERT', dialog })
        } catch (error) {
            toast({ title: 'Не удалось пометить непрочитанным', description: error.message, variant: 'destructive' })
        }
    }

    const handleSaveEdit = async (message) => {
        const body = editingBody.trim()
        if (!canEdit || !routeDialogId || !message.id || !body) return
        try {
            const saved = await editChatMessage(routeDialogId, message.id, body)
            dispatch({ type: 'MESSAGE_UPSERT', dialogId: routeDialogId, message: saved })
            setEditingMessageId(null)
            setEditingBody('')
        } catch (error) {
            toast({ title: 'Не удалось изменить сообщение', description: error.message, variant: 'destructive' })
        }
    }

    const handleDeleteForMe = async (message) => {
        if (!routeDialogId || !message.id) return
        try {
            await deleteChatMessageForMe(routeDialogId, message.id)
            dispatch({ type: 'MESSAGE_HIDDEN', dialogId: routeDialogId, messageId: message.id })
        } catch (error) {
            toast({ title: 'Не удалось удалить сообщение', description: error.message, variant: 'destructive' })
        }
    }

    const handleDeleteForEveryone = async (message) => {
        if (!canEdit || !routeDialogId || !message.id) return
        try {
            const saved = await deleteChatMessageForEveryone(routeDialogId, message.id)
            dispatch({ type: 'MESSAGE_UPSERT', dialogId: routeDialogId, message: saved })
        } catch (error) {
            toast({ title: 'Не удалось удалить сообщение', description: error.message, variant: 'destructive' })
        }
    }

    const handleReaction = async (message, reaction) => {
        if (!canEdit || !routeDialogId || !message.id || message.deletedAt) return
        try {
            const currentReaction = message.reactions?.find((item) => item.reactedByMe)
            const saved = currentReaction?.reaction === reaction
                ? await deleteChatMessageReaction(routeDialogId, message.id)
                : await setChatMessageReaction(routeDialogId, message.id, reaction)
            dispatch({ type: 'MESSAGE_UPSERT', dialogId: routeDialogId, message: saved })
        } catch (error) {
            toast({ title: 'Не удалось обновить реакцию', description: error.message, variant: 'destructive' })
        }
    }

    const handlePinToggle = async (message) => {
        if (!canEdit || !routeDialogId || !message.id) return
        try {
            const isPinned = state.activeDialog?.pinnedMessage?.messageId === message.id
            const dialog = isPinned
                ? await unpinChatMessage(routeDialogId).then(() => getChatDialog(routeDialogId))
                : await pinChatMessage(routeDialogId, message.id)
            if (dialog) {
                dispatch({ type: 'ACTIVE_DIALOG_LOADED', dialog })
                dispatch({ type: 'DIALOG_UPSERT', dialog })
            }
        } catch (error) {
            toast({ title: 'Не удалось обновить закреп', description: error.message, variant: 'destructive' })
        }
    }

    const handleForward = async (message, targetDialogId) => {
        if (!canEdit || !routeDialogId || !message.id || !targetDialogId || isForwarding) return
        const clientMessageId = forwardClientMessageId || createClientMessageId()
        if (!forwardClientMessageId) setForwardClientMessageId(clientMessageId)

        setIsForwarding(true)
        try {
            await forwardChatMessage(routeDialogId, message.id, {
                targetDialogId,
                clientMessageId,
            })
            toast({ title: 'Сообщение переслано' })
            setForwardingMessage(null)
            setForwardSearch('')
            setForwardClientMessageId('')
        } catch (error) {
            toast({ title: 'Не удалось переслать сообщение', description: error.message, variant: 'destructive' })
        } finally {
            setIsForwarding(false)
        }
    }

    const openMessageContext = async (messageId) => {
        if (!routeDialogId) return
        try {
            const context = await getChatMessageContext(routeDialogId, { messageId })
            dispatch({ type: 'MESSAGES_LOADED', dialogId: routeDialogId, messages: context })
            requestAnimationFrame(() => {
                const node = messageListRef.current?.querySelector(`[data-message-id="${messageId}"]`)
                node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                node?.classList.add('is-highlighted')
                setTimeout(() => node?.classList.remove('is-highlighted'), 2000)
            })
        } catch (error) {
            const isUnavailable = [403, 404].includes(error.status) ||
                /not_found|forbidden|не найден/i.test(error.code || error.message || '')
            if (isUnavailable) {
                setSearchResults((current) => current.filter((result) => result.messageId !== messageId))
                toast({ title: 'Сообщение недоступно' })
            } else {
                toast({ title: 'Не удалось открыть сообщение', description: error.message })
            }
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
        Boolean(draft.trim() || selectedFile)
    const composerPlaceholder = !canEdit
        ? 'Отправка недоступна для этого диалога'
        : connectionStatus !== 'connected'
            ? 'Нет realtime-соединения. Сообщение отправится через REST.'
            : 'Введите сообщение'
    const isCounterpartTyping = (() => {
        const expiresAt = typingByDialogId[routeDialogId]
        return Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now())
    })()
    const forwardDialogOptions = state.dialogs
        .filter((dialog) => dialog.dialogId !== routeDialogId)
        .filter((dialog) => {
            const query = forwardSearch.trim().toLowerCase()
            if (!query) return true
            return [
                dialog.counterpart?.displayName,
                dialog.opportunityTitle,
                dialog.companyName,
            ].filter(Boolean).some((value) => value.toLowerCase().includes(query))
        })

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

                    <select
                        className="chats__opportunity-filter"
                        value={selectedOpportunityId}
                        onChange={(event) => setSelectedOpportunityId(event.target.value)}
                        aria-label="Фильтр по вакансии"
                    >
                        <option value="">Все вакансии</option>
                        {state.opportunityFilters.map((option) => (
                            <option key={option.opportunityId} value={option.opportunityId}>
                                {option.unreadCount > 0
                                    ? `${option.opportunityTitle} · ${option.unreadCount} новых`
                                    : option.opportunityTitle}
                            </option>
                        ))}
                    </select>

                    {state.dialogsError && <p className="chats__state chats__state--error">{state.dialogsError}</p>}
                    {!state.dialogsLoading && state.dialogs.length === 0 && (
                        <p className="chats__state">
                            {selectedOpportunityId ? 'По этой вакансии пока нет диалогов' : 'Здесь пока нет диалогов'}
                        </p>
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
                                    <p>{isCounterpartTyping ? 'Печатает...' : state.activeDialog?.opportunityTitle || ''}</p>
                                </div>
                                <div className="chats__header-actions">
                                    <button
                                        className="chats__icon-action"
                                        type="button"
                                        aria-label="Поиск по сообщениям"
                                        title="Поиск"
                                        onClick={() => setIsSearchOpen((isOpen) => !isOpen)}
                                    >
                                        <Search size={18} aria-hidden="true" />
                                    </button>
                                    <button className="chats__archive" type="button" onClick={handleMarkUnread}>
                                        Непрочитано
                                    </button>
                                    <button className="chats__archive" type="button" onClick={handleArchive}>
                                        {state.activeDialog?.archived ? 'Восстановить' : 'В архив'}
                                    </button>
                                </div>
                            </header>

                            {state.activeDialog?.pinnedMessage && (
                                <button
                                    type="button"
                                    className="chats__pinned-bar"
                                    onClick={() => void openMessageContext(state.activeDialog.pinnedMessage.messageId)}
                                >
                                    <Pin size={16} aria-hidden="true" />
                                    <span>{state.activeDialog.pinnedMessage.preview}</span>
                                    {canEdit && (
                                        <X
                                            size={16}
                                            aria-hidden="true"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                void unpinChatMessage(routeDialogId).then(() => getChatDialog(routeDialogId)).then((dialog) => {
                                                    dispatch({ type: 'ACTIVE_DIALOG_LOADED', dialog })
                                                    dispatch({ type: 'DIALOG_UPSERT', dialog })
                                                })
                                            }}
                                        />
                                    )}
                                </button>
                            )}

                            {isSearchOpen && (
                                <div className="chats__search-panel">
                                    <input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Поиск"
                                        maxLength={100}
                                    />
                                    {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                        <span>Ничего не найдено</span>
                                    )}
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.messageId}
                                            type="button"
                                            onClick={() => void openMessageContext(result.messageId)}
                                        >
                                            <strong>{result.senderDisplayName}</strong>
                                            <span>{result.snippet}</span>
                                            <small>{formatTime(result.createdAt)}</small>
                                        </button>
                                    ))}
                                </div>
                            )}

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
                                            data-message-id={message.id || ''}
                                        >
                                            {message.deletedAt ? (
                                                <p className="chats__deleted">Сообщение удалено</p>
                                            ) : (
                                                <>
                                                    {message.forwardedFrom && (
                                                        <small className="chats__forwarded">
                                                            Переслано от {message.forwardedFrom.senderName || 'участника'}
                                                        </small>
                                                    )}
                                                    {message.replyTo && (
                                                        <button
                                                            type="button"
                                                            className="chats__reply-quote"
                                                            onClick={() => void openMessageContext(message.replyTo.id)}
                                                        >
                                                            <strong>{message.replyTo.senderDisplayName}</strong>
                                                            <span>{message.replyTo.bodyPreview || 'Вложение'}</span>
                                                        </button>
                                                    )}
                                                    {editingMessageId === message.id ? (
                                                        <div className="chats__inline-edit">
                                                            <textarea
                                                                value={editingBody}
                                                                onChange={(event) => setEditingBody(event.target.value.slice(0, 4000))}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === 'Enter' && !event.shiftKey) {
                                                                        event.preventDefault()
                                                                        void handleSaveEdit(message)
                                                                    }
                                                                }}
                                                            />
                                                            <div>
                                                                <button type="button" onClick={() => void handleSaveEdit(message)}>Сохранить</button>
                                                                <button type="button" onClick={() => setEditingMessageId(null)}>Отмена</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
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
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            <span>
                                                {formatTime(message.createdAt)}
                                                {message.pending && ' · отправляется'}
                                                {message.failed && ' · не отправлено'}
                                                {message.editedAt && !message.deletedAt && ' · изменено'}
                                            </span>
                                            {!message.failed && !message.pending && !message.deletedAt && message.id && (
                                                <button
                                                    type="button"
                                                    className="chats__message-menu-button"
                                                    aria-label="Действия с сообщением"
                                                    aria-haspopup="menu"
                                                    aria-expanded={openMenuMessageId === message.id}
                                                    onClick={() => setOpenMenuMessageId((current) => current === message.id ? null : message.id)}
                                                >
                                                    <MoreHorizontal size={16} aria-hidden="true" />
                                                </button>
                                            )}
                                            {openMenuMessageId === message.id && (
                                                <div className="chats__message-menu" role="menu">
                                                    {canEdit && (
                                                        <div className="chats__reaction-row">
                                                            {QUICK_REACTIONS.map((reaction) => (
                                                                <button key={reaction} type="button" onClick={() => {
                                                                    setOpenMenuMessageId(null)
                                                                    void handleReaction(message, reaction)
                                                                }}>
                                                                    {reaction}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {canEdit && (
                                                        <button type="button" onClick={() => { setReplyToMessage(message); setOpenMenuMessageId(null); textareaRef.current?.focus() }}>Ответить</button>
                                                    )}
                                                    {canEdit && isOwn && ['TEXT', 'MIXED', 'ATTACHMENT'].includes(message.messageType) && (
                                                        <button type="button" onClick={() => { setEditingMessageId(message.id); setEditingBody(message.body || ''); setOpenMenuMessageId(null) }}>Редактировать</button>
                                                    )}
                                                    <button type="button" onClick={() => { setOpenMenuMessageId(null); setConfirmAction({ type: 'deleteMe', message }) }}>Удалить у себя</button>
                                                    {canEdit && isOwn && <button type="button" onClick={() => { setOpenMenuMessageId(null); setConfirmAction({ type: 'deleteAll', message }) }}>Удалить у всех</button>}
                                                    {canEdit && (
                                                        <button type="button" onClick={() => { setOpenMenuMessageId(null); void handlePinToggle(message) }}>
                                                            {state.activeDialog?.pinnedMessage?.messageId === message.id ? 'Открепить' : 'Закрепить'}
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button type="button" onClick={() => {
                                                            setOpenMenuMessageId(null)
                                                            setForwardingMessage(message)
                                                            setForwardSearch('')
                                                            setForwardClientMessageId(createClientMessageId())
                                                        }}>Переслать</button>
                                                    )}
                                                </div>
                                            )}
                                            {message.reactions?.length > 0 && (
                                                <div className="chats__reactions">
                                                    {message.reactions.map((reaction) => (
                                                        <button
                                                            key={reaction.reaction}
                                                            type="button"
                                                            className={reaction.reactedByMe ? 'is-active' : ''}
                                                            disabled={!canEdit}
                                                            onClick={() => {
                                                                if (canEdit) void handleReaction(message, reaction.reaction)
                                                            }}
                                                        >
                                                            {reaction.reaction} {reaction.count}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {message.failed && (
                                                <div className="chats__message-actions">
                                                <button
                                                    className="chats__message-action"
                                                    disabled={message.retryFile ? isUploading : false}
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
                                {replyToMessage && (
                                    <div className="chats__reply-preview">
                                        <span>
                                            <strong>Ответ</strong>
                                            {replyToMessage.deletedAt
                                                ? 'Сообщение удалено'
                                                : replyToMessage.body || replyToMessage.attachments?.[0]?.originalFileName || 'Вложение'}
                                        </span>
                                        <button type="button" aria-label="Отменить ответ" onClick={() => setReplyToMessage(null)}>
                                            <X size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
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
                            {confirmAction && (
                                <div className="chats__modal-backdrop" role="presentation" onClick={() => setConfirmAction(null)}>
                                    <div className="chats__confirm" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                                        <h3>{confirmAction.type === 'deleteAll' ? 'Удалить сообщение у всех?' : 'Удалить сообщение у себя?'}</h3>
                                        <div>
                                            <button type="button" onClick={() => setConfirmAction(null)}>Отмена</button>
                                            <button
                                                type="button"
                                                className="is-danger"
                                                onClick={() => {
                                                    const action = confirmAction
                                                    setConfirmAction(null)
                                                    if (action.type === 'deleteAll') {
                                                        void handleDeleteForEveryone(action.message)
                                                    } else {
                                                        void handleDeleteForMe(action.message)
                                                    }
                                                }}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {forwardingMessage && (
                                <div
                                    className="chats__modal-backdrop"
                                    role="presentation"
                                    onClick={() => {
                                        if (isForwarding) return
                                        setForwardingMessage(null)
                                        setForwardSearch('')
                                        setForwardClientMessageId('')
                                    }}
                                >
                                    <div className="chats__forward-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                                        <h3>Переслать сообщение</h3>
                                        <input
                                            value={forwardSearch}
                                            onChange={(event) => setForwardSearch(event.target.value)}
                                            placeholder="Поиск диалога"
                                            autoFocus
                                        />
                                        <div className="chats__forward-list">
                                            {forwardDialogOptions.length === 0 && <span>Нет подходящих диалогов</span>}
                                            {forwardDialogOptions.map((dialog) => (
                                                <button
                                                    key={dialog.dialogId}
                                                    type="button"
                                                    disabled={isForwarding || !dialog.canSend}
                                                    onClick={() => {
                                                        void handleForward(forwardingMessage, dialog.dialogId)
                                                    }}
                                                >
                                                    <strong>{dialog.counterpart.displayName}</strong>
                                                    <span>{dialog.opportunityTitle}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className="chats__forward-close"
                                            disabled={isForwarding}
                                            onClick={() => {
                                                setForwardingMessage(null)
                                                setForwardSearch('')
                                                setForwardClientMessageId('')
                                            }}
                                        >
                                            {isForwarding ? 'Пересылаем...' : 'Отмена'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </DashboardLayout>
    )
}

export default ChatsPage
