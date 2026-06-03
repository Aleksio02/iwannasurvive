import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronDown, Copy, Download, Edit3, FileText, Forward, LoaderCircle, MoreHorizontal, Paperclip, Pin, RefreshCw, Reply, Search, Send, SmilePlus, Trash2, X, ZoomIn } from 'lucide-react'
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
    updateChatMessageContent,
} from '@/shared/api/chats'
import { useChatRealtime } from './useChatRealtime'
import ChatImageLightbox from './ChatImageLightbox'
import './ChatsPage.scss'

const MESSAGE_LIMIT = 50
const CHAT_TEXTAREA_MIN_HEIGHT = 58
const CHAT_TEXTAREA_MAX_HEIGHT = 160
const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024
const PDF_MAX_SIZE_BYTES = 20 * 1024 * 1024
const MAX_MESSAGE_ATTACHMENTS = 10
const ALLOWED_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const EMOJI_GROUPS = [
    ['Эмоции', ['😊', '😂', '😍', '🥳', '😎', '🤔', '😢', '❤️']],
    ['Жесты', ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '👋']],
    ['Работа и учёба', ['💼', '📚', '✍️', '✅', '🚀', '🎯', '💡', '📌']],
    ['Объекты', ['📎', '📄', '📅', '📞', '💻', '☕', '🎁', '⭐']],
]
const QUICK_REACTIONS_PRIMARY = ['👍', '❤️', '😂', '😮', '🙏']
const QUICK_REACTIONS_MORE = ['😢', '🔥', '👏', '🎉', '🤔', '👀', '✅', '🚀']
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

function getInitials(value = '') {
    const parts = String(value).trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
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

function downloadFile(url, filename = '') {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function ChatAttachment({ dialogId, attachment, failed = false, pending = false }) {
    const [imageUrl, setImageUrl] = useState(attachment.localPreviewUrl || '')
    const [isThumbnailLoading, setIsThumbnailLoading] = useState(!attachment.localPreviewUrl)
    const [isFileOpening, setIsFileOpening] = useState(false)
    const [fileOpenError, setFileOpenError] = useState('')
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
        setFileOpenError('')
        try {
            const response = await getChatAttachmentDownloadUrl(dialogId, attachment.id)
            openDownloadUrl(response.url)
        } catch (error) {
            setFileOpenError(error.status === 404 || error.status === 403
                ? 'Файл недоступен'
                : 'Не удалось открыть файл'
            )
        } finally {
            setIsFileOpening(false)
        }
    }

    return (
        <>
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
            {fileOpenError && <small className="chats__attachment-error">{fileOpenError}</small>}
        </>
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
    const [editingMessage, setEditingMessage] = useState(null)
    const [editingRemoveAttachmentIds, setEditingRemoveAttachmentIds] = useState([])
    const [editingError, setEditingError] = useState('')
    const [isEditSaving, setIsEditSaving] = useState(false)
    const [openMenuMessageId, setOpenMenuMessageId] = useState(null)
    const [messageMenuPosition, setMessageMenuPosition] = useState(null)
    const [savingAttachmentMessageId, setSavingAttachmentMessageId] = useState(null)
    const [isReactionMoreOpen, setIsReactionMoreOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState(null)
    const [deleteForEveryone, setDeleteForEveryone] = useState(false)
    const [forwardingMessage, setForwardingMessage] = useState(null)
    const [forwardClientMessageId, setForwardClientMessageId] = useState('')
    const [forwardSearch, setForwardSearch] = useState('')
    const [isForwarding, setIsForwarding] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isOpportunityFilterOpen, setIsOpportunityFilterOpen] = useState(false)
    const [opportunityFilterQuery, setOpportunityFilterQuery] = useState('')
    const [typingByDialogId, setTypingByDialogId] = useState({})
    const [showJumpToNew, setShowJumpToNew] = useState(false)
    const [isEmojiOpen, setIsEmojiOpen] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])
    const [isUploading, setIsUploading] = useState(false)
    const [isPinUpdating, setIsPinUpdating] = useState(false)
    const threadRef = useRef(null)
    const messageListRef = useRef(null)
    const textareaRef = useRef(null)
    const fileInputRef = useRef(null)
    const emojiButtonRef = useRef(null)
    const emojiPickerRef = useRef(null)
    const opportunityFilterRef = useRef(null)
    const headerMenuRef = useRef(null)
    const longPressTimerRef = useRef(null)
    const pinGuardRef = useRef({ dialogId: null, pinnedMessageId: null, expiresAt: 0 })
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
    const selectedFilesRef = useRef([])
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

    const clearSelectedFiles = useCallback((options = {}) => {
        const shouldRevoke = options.revoke !== false
        if (shouldRevoke) {
            selectedFilesRef.current.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
            })
        }
        selectedFilesRef.current = []
        setSelectedFiles([])
    }, [])

    useEffect(() => {
        selectedFilesRef.current = selectedFiles
    }, [selectedFiles])

    useEffect(() => () => {
        selectedFilesRef.current.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
        })
    }, [])

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
            if (event.key === 'Escape') {
                setOpenMenuMessageId(null)
                setMessageMenuPosition(null)
            }
        }
        const handlePointer = (event) => {
            if (!event.target.closest?.('.chats__floating-menu')) {
                setOpenMenuMessageId(null)
                setMessageMenuPosition(null)
                setIsReactionMoreOpen(false)
            }
        }
        const handleViewportMove = () => {
            setOpenMenuMessageId(null)
            setMessageMenuPosition(null)
        }
        document.addEventListener('keydown', close)
        document.addEventListener('pointerdown', handlePointer)
        window.addEventListener('resize', handleViewportMove)
        return () => {
            document.removeEventListener('keydown', close)
            document.removeEventListener('pointerdown', handlePointer)
            window.removeEventListener('resize', handleViewportMove)
        }
    }, [openMenuMessageId])

    useEffect(() => {
        if (!isOpportunityFilterOpen) return undefined

        const close = (event) => {
            if (event.key === 'Escape') setIsOpportunityFilterOpen(false)
        }
        const handlePointer = (event) => {
            if (!opportunityFilterRef.current?.contains(event.target)) {
                setIsOpportunityFilterOpen(false)
            }
        }

        document.addEventListener('keydown', close)
        document.addEventListener('pointerdown', handlePointer)
        return () => {
            document.removeEventListener('keydown', close)
            document.removeEventListener('pointerdown', handlePointer)
        }
    }, [isOpportunityFilterOpen])

    useEffect(() => {
        if (!isHeaderMenuOpen) return undefined

        const close = (event) => {
            if (event.key === 'Escape') setIsHeaderMenuOpen(false)
        }
        const handlePointer = (event) => {
            if (!headerMenuRef.current?.contains(event.target)) {
                setIsHeaderMenuOpen(false)
            }
        }

        document.addEventListener('keydown', close)
        document.addEventListener('pointerdown', handlePointer)
        return () => {
            document.removeEventListener('keydown', close)
            document.removeEventListener('pointerdown', handlePointer)
        }
    }, [isHeaderMenuOpen])

    useEffect(() => {
        if (openMenuMessageId && !messages.some((message) => message.id === openMenuMessageId && !message.deletedAt)) {
            setOpenMenuMessageId(null)
            setMessageMenuPosition(null)
        }
    }, [messages, openMenuMessageId])

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

    const handleFileSelect = (fileList) => {
        const files = Array.from(fileList || [])
        if (files.length === 0) return

        const existingCount = editingMessage
            ? (editingMessage.attachments || []).filter((attachment) => !editingRemoveAttachmentIds.includes(attachment.id)).length
            : 0
        if (existingCount + selectedFiles.length + files.length > MAX_MESSAGE_ATTACHMENTS) {
            toast({
                title: 'Файлы не выбраны',
                description: `К сообщению можно прикрепить не больше ${MAX_MESSAGE_ATTACHMENTS} файлов`,
                variant: 'destructive',
            })
            return
        }

        const invalidFile = files.find((file) => validateAttachment(file))
        if (invalidFile) {
            toast({ title: 'Файл не выбран', description: validateAttachment(invalidFile), variant: 'destructive' })
            return
        }

        setSelectedFiles((current) => [
            ...current,
            ...files.map((file) => ({
                id: createClientMessageId(),
                file,
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
            })),
        ])
        setIsEmojiOpen(false)
    }

    const removeSelectedFile = (fileId) => {
        setSelectedFiles((current) => current.filter((item) => {
            if (item.id !== fileId) return true
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return false
        }))
    }

    const closeMessageMenu = () => {
        setOpenMenuMessageId(null)
        setMessageMenuPosition(null)
        setIsReactionMoreOpen(false)
    }

    const openMessageMenu = (event, messageId, anchor = null) => {
        if (openMenuMessageId === messageId) {
            closeMessageMenu()
            return
        }

        const buttonRect = event.currentTarget.getBoundingClientRect()
        const containerRect = threadRef.current?.getBoundingClientRect()
        if (!containerRect) {
            setOpenMenuMessageId(messageId)
            setMessageMenuPosition(null)
            return
        }

        const menuWidth = Math.min(220, containerRect.width - 16)
        const menuHeight = canEdit ? 340 : 116
        const gap = 8
        const maxLeft = Math.max(gap, containerRect.width - menuWidth - gap)
        const maxTop = Math.max(gap, containerRect.height - menuHeight - gap)
        const anchorX = anchor?.clientX ?? buttonRect.right
        const anchorY = anchor?.clientY ?? buttonRect.bottom
        const openUp = anchorY + menuHeight + gap > containerRect.bottom

        const left = Math.min(
            Math.max(anchorX - containerRect.left - menuWidth, gap),
            maxLeft
        )
        const preferredTop = openUp
            ? anchorY - containerRect.top - menuHeight - gap
            : anchorY - containerRect.top + gap
        const top = Math.min(Math.max(preferredTop, gap), maxTop)

        setOpenMenuMessageId(messageId)
        setMessageMenuPosition({ top, left, width: menuWidth })
    }

    const isMessageControlTarget = (target) => Boolean(target.closest?.(
        'button, a, input, textarea, select, .chats__attachment-image, .chats__attachment-file, .chats__reactions, .chats__inline-edit'
    ))

    const handleMessageContextMenu = (event, message) => {
        if (!message.id || message.deletedAt || message.pending || message.failed || isMessageControlTarget(event.target)) return
        event.preventDefault()
        openMessageMenu(event, message.id, { clientX: event.clientX, clientY: event.clientY })
    }

    const handleMessagePointerDown = (event, message) => {
        if (
            event.pointerType === 'mouse' ||
            !message.id ||
            message.deletedAt ||
            message.pending ||
            message.failed ||
            isMessageControlTarget(event.target)
        ) return

        longPressTimerRef.current = window.setTimeout(() => {
            openMessageMenu(event, message.id, { clientX: event.clientX, clientY: event.clientY })
        }, 520)
    }

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
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
        fileItems,
        body,
        clientMessageId = createClientMessageId(),
        existingPreviewUrls = []
    ) => {
        const normalizedItems = (Array.isArray(fileItems) ? fileItems : [fileItems])
            .filter(Boolean)
            .map((item, index) => item.file
                ? item
                : {
                    id: `${clientMessageId}-${index}`,
                    file: item,
                    previewUrl: existingPreviewUrls[index] || '',
                })
        if (!routeDialogId || normalizedItems.length === 0 || !state.activeDialog?.canSend || isUploading) return
        if (normalizedItems.length > MAX_MESSAGE_ATTACHMENTS) {
            toast({
                title: 'Файлы не отправлены',
                description: `К сообщению можно прикрепить не больше ${MAX_MESSAGE_ATTACHMENTS} файлов`,
                variant: 'destructive',
            })
            return
        }

        const invalidItem = normalizedItems.find((item) => validateAttachment(item.file))
        const validationError = invalidItem ? validateAttachment(invalidItem.file) : ''
        if (validationError) {
            toast({ title: 'Файлы не отправлены', description: validationError, variant: 'destructive' })
            return
        }

        const normalizedBody = body.trim()
        const replyMessage = replyToMessage
        const optimisticAttachments = normalizedItems.map((item) => {
            const localPreviewUrl = item.previewUrl || (item.file.type.startsWith('image/') ? URL.createObjectURL(item.file) : '')
            return {
                originalFileName: item.file.name,
                mediaType: item.file.type,
                sizeBytes: item.file.size,
                attachmentKind: item.file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
                localPreviewUrl,
            }
        })
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
                attachments: optimisticAttachments,
                retryFiles: normalizedItems,
                pending: true,
                failed: false,
            },
        })
        setDraft('')
        setReplyToMessage(null)
        setEditingError('')
        clearSelectedFiles({ revoke: false })
        setIsUploading(true)
        requestAnimationFrame(() => scrollToBottom())

        try {
            const saved = await sendChatAttachment(routeDialogId, {
                clientMessageId,
                body: normalizedBody,
                files: normalizedItems.map((item) => item.file),
                replyToMessageId: replyMessage?.id,
            })
            dispatch({ type: 'MESSAGES_LOADED', dialogId: routeDialogId, messages: [saved] })
            optimisticAttachments.forEach((attachment) => {
                if (attachment.localPreviewUrl) setTimeout(() => URL.revokeObjectURL(attachment.localPreviewUrl), 0)
            })
        } catch (error) {
            dispatch({ type: 'MESSAGE_FAILED', dialogId: routeDialogId, clientMessageId })
            toast({ title: 'Файлы не отправлены', description: error.message, variant: 'destructive' })
        } finally {
            setIsUploading(false)
        }
    }, [clearSelectedFiles, currentUser?.id, isUploading, replyToMessage, routeDialogId, scrollToBottom, state.activeDialog?.canSend, state.activeDialog?.counterpart?.displayName, toast])

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
                const pinGuard = pinGuardRef.current
                if (
                    pinGuard.dialogId === event.dialogId &&
                    pinGuard.expiresAt > Date.now() &&
                    (
                        (pinGuard.pinnedMessageId && event.payload.pinnedMessage?.messageId !== pinGuard.pinnedMessageId) ||
                        (pinGuard.pinnedMessageId === null && event.payload.pinnedMessage)
                    )
                ) {
                    return
                }
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
        clearLongPressTimer()
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

    const startEditingMessage = (message) => {
        setEditingMessage(message)
        setDraft(message.body || '')
        setReplyToMessage(null)
        setEditingRemoveAttachmentIds([])
        clearSelectedFiles()
        setEditingError('')
        requestAnimationFrame(() => {
            textareaRef.current?.focus()
            resizeTextarea()
        })
    }

    const cancelEditingMessage = () => {
        setEditingMessage(null)
        setEditingRemoveAttachmentIds([])
        setDraft('')
        clearSelectedFiles()
        setEditingError('')
        setIsEditSaving(false)
    }

    const copyMessageText = async (message) => {
        if (!message.body) return
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(message.body)
            } else {
                const textarea = document.createElement('textarea')
                textarea.value = message.body
                textarea.setAttribute('readonly', '')
                textarea.style.position = 'fixed'
                textarea.style.top = '-1000px'
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            }
            toast({ title: 'Текст скопирован' })
        } catch {
            toast({ title: 'Не удалось скопировать текст', variant: 'destructive' })
        } finally {
            closeMessageMenu()
        }
    }

    const saveMessageAttachments = async (message) => {
        if (!routeDialogId || !message?.id || message.pending || message.failed) return
        const attachments = (message.attachments || []).filter((attachment) => attachment.id)
        if (attachments.length === 0 || savingAttachmentMessageId === message.id) return

        setSavingAttachmentMessageId(message.id)
        closeMessageMenu()
        const results = await Promise.allSettled(
            attachments.map(async (attachment) => {
                const response = await getChatAttachmentDownloadUrl(routeDialogId, attachment.id)
                downloadFile(response.url, attachment.originalFileName || '')
            })
        )
        const failedCount = results.filter((result) => result.status === 'rejected').length

        if (failedCount === 0) {
            toast({ title: attachments.length === 1 ? 'Вложение сохранено' : 'Вложения сохранены' })
        } else if (failedCount < attachments.length) {
            toast({
                title: 'Часть вложений не удалось сохранить',
                description: `${attachments.length - failedCount} из ${attachments.length} сохранено`,
                variant: 'destructive',
            })
        } else {
            const firstError = results.find((result) => result.status === 'rejected')?.reason
            toast({
                title: firstError?.status === 403 || firstError?.status === 404
                    ? 'Файл недоступен'
                    : 'Не удалось сохранить вложения',
                description: 'Файлы недоступны или срок ссылки истёк',
                variant: 'destructive',
            })
        }
        setSavingAttachmentMessageId(null)
    }

    const handleSaveEdit = async () => {
        const message = editingMessage
        const body = draft.trim()
        if (!canEdit || !routeDialogId || !message?.id || isEditSaving) return

        const keptAttachments = (message.attachments || []).filter((attachment) =>
            !editingRemoveAttachmentIds.includes(attachment.id)
        )
        if (keptAttachments.length + selectedFiles.length > MAX_MESSAGE_ATTACHMENTS) {
            setEditingError(`К сообщению можно прикрепить не больше ${MAX_MESSAGE_ATTACHMENTS} файлов`)
            return
        }
        if (!body && keptAttachments.length === 0 && selectedFiles.length === 0) {
            setEditingError('Добавьте текст или файл')
            return
        }

        setIsEditSaving(true)
        try {
            const shouldUseMultipart = selectedFiles.length > 0 || editingRemoveAttachmentIds.length > 0 || (message.attachments || []).length > 0
            const saved = shouldUseMultipart
                ? await updateChatMessageContent(routeDialogId, message.id, {
                    body,
                    removeAttachmentIds: editingRemoveAttachmentIds,
                    files: selectedFiles.map((item) => item.file),
                })
                : await editChatMessage(routeDialogId, message.id, body)
            dispatch({ type: 'MESSAGE_UPSERT', dialogId: routeDialogId, message: saved })
            cancelEditingMessage()
        } catch (error) {
            toast({ title: 'Не удалось изменить сообщение', description: error.message, variant: 'destructive' })
        } finally {
            setIsEditSaving(false)
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
        if (!canEdit || !routeDialogId || !message.id || isPinUpdating) return
        setIsPinUpdating(true)
        try {
            const isPinned = state.activeDialog?.pinnedMessage?.messageId === message.id
            pinGuardRef.current = {
                dialogId: routeDialogId,
                pinnedMessageId: isPinned ? null : message.id,
                expiresAt: Date.now() + 2500,
            }
            const dialog = isPinned
                ? await unpinChatMessage(routeDialogId)
                : await pinChatMessage(routeDialogId, message.id)
            dispatch({ type: 'ACTIVE_DIALOG_LOADED', dialog })
            dispatch({ type: 'DIALOG_UPSERT', dialog })
        } catch (error) {
            pinGuardRef.current = { dialogId: null, pinnedMessageId: null, expiresAt: 0 }
            toast({ title: 'Не удалось обновить закреп', description: error.message, variant: 'destructive' })
        } finally {
            setIsPinUpdating(false)
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
        ;(message.attachments || []).forEach((attachment) => {
            if (attachment.localPreviewUrl) URL.revokeObjectURL(attachment.localPreviewUrl)
        })
        dispatch({ type: 'MESSAGE_REMOVE', dialogId: message.dialogId, clientMessageId: message.clientMessageId })
    }

    const toggleSearch = () => {
        setIsSearchOpen((isOpen) => {
            if (isOpen) {
                setSearchQuery('')
                setSearchResults([])
            }
            return !isOpen
        })
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
        !isEditSaving &&
        Boolean(draft.trim() || selectedFiles.length > 0 || editingMessage)
    const visibleEditingAttachments = editingMessage
        ? (editingMessage.attachments || []).filter((attachment) => !editingRemoveAttachmentIds.includes(attachment.id))
        : []
    const composerPlaceholder = !canEdit
        ? 'Отправка недоступна для этого диалога'
        : editingMessage
            ? 'Измените сообщение'
        : connectionStatus !== 'connected'
            ? 'Нет realtime-соединения. Сообщение отправится через REST.'
            : 'Введите сообщение'
    const isCounterpartTyping = (() => {
        const expiresAt = typingByDialogId[routeDialogId]
        return Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now())
    })()
    const selectedOpportunity = state.opportunityFilters.find((option) =>
        String(option.opportunityId) === String(selectedOpportunityId)
    ) || null
    const opportunityFilterOptions = state.opportunityFilters.filter((option) => {
        const query = opportunityFilterQuery.trim().toLowerCase()
        if (!query) return true
        return option.opportunityTitle.toLowerCase().includes(query)
    })
    const activeMenuMessage = messages.find((message) => message.id === openMenuMessageId && !message.deletedAt)
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
        <DashboardLayout title="Сообщения">
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

                    <div className="chats__opportunity-filter" ref={opportunityFilterRef}>
                        <button
                            type="button"
                            className="chats__opportunity-trigger"
                            aria-haspopup="listbox"
                            aria-expanded={isOpportunityFilterOpen}
                            onClick={() => setIsOpportunityFilterOpen((isOpen) => !isOpen)}
                        >
                            <span>{selectedOpportunity?.opportunityTitle || 'Все вакансии'}</span>
                            {selectedOpportunity?.unreadCount > 0 && <strong>{selectedOpportunity.unreadCount}</strong>}
                            <ChevronDown size={16} aria-hidden="true" />
                        </button>
                        {isOpportunityFilterOpen && (
                            <div className="chats__opportunity-menu" role="listbox">
                                {state.opportunityFilters.length > 6 && (
                                    <input
                                        value={opportunityFilterQuery}
                                        onChange={(event) => setOpportunityFilterQuery(event.target.value)}
                                        placeholder="Найти вакансию"
                                        autoFocus
                                    />
                                )}
                                <button
                                    type="button"
                                    className={!selectedOpportunityId ? 'is-active' : ''}
                                    role="option"
                                    aria-selected={!selectedOpportunityId}
                                    onClick={() => {
                                        setSelectedOpportunityId('')
                                        setOpportunityFilterQuery('')
                                        setIsOpportunityFilterOpen(false)
                                    }}
                                >
                                    <span>Все вакансии</span>
                                </button>
                                {opportunityFilterOptions.length === 0 && (
                                    <small>Нет диалогов по вакансиям</small>
                                )}
                                {opportunityFilterOptions.map((option) => (
                                    <button
                                        key={option.opportunityId}
                                        type="button"
                                        className={String(selectedOpportunityId) === String(option.opportunityId) ? 'is-active' : ''}
                                        role="option"
                                        aria-selected={String(selectedOpportunityId) === String(option.opportunityId)}
                                        onClick={() => {
                                            setSelectedOpportunityId(String(option.opportunityId))
                                            setOpportunityFilterQuery('')
                                            setIsOpportunityFilterOpen(false)
                                        }}
                                    >
                                        <span>{option.opportunityTitle}</span>
                                        {option.unreadCount > 0 && <strong>{option.unreadCount}</strong>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

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

                <section className="chats__thread" ref={threadRef}>
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
                                        onClick={toggleSearch}
                                    >
                                        <Search size={18} aria-hidden="true" />
                                    </button>
                                    <div className="chats__header-menu-wrap" ref={headerMenuRef}>
                                        <button
                                            className="chats__icon-action"
                                            type="button"
                                            aria-label="Действия с диалогом"
                                            aria-haspopup="menu"
                                            aria-expanded={isHeaderMenuOpen}
                                            title="Действия"
                                            onClick={() => setIsHeaderMenuOpen((isOpen) => !isOpen)}
                                        >
                                            <MoreHorizontal size={18} aria-hidden="true" />
                                        </button>
                                        {isHeaderMenuOpen && (
                                            <div className="chats__header-menu" role="menu">
                                                <button type="button" role="menuitem" onClick={() => { setIsHeaderMenuOpen(false); void handleMarkUnread() }}>
                                                    Отметить непрочитанным
                                                </button>
                                                <button type="button" role="menuitem" onClick={() => { setIsHeaderMenuOpen(false); void handleArchive() }}>
                                                    {state.activeDialog?.archived ? 'Вернуть из архива' : 'В архив'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </header>

                            {state.activeDialog?.pinnedMessage && (
                                <div
                                    className="chats__pinned-bar"
                                >
                                    <button
                                        type="button"
                                        className="chats__pinned-main"
                                        onClick={() => void openMessageContext(state.activeDialog.pinnedMessage.messageId)}
                                    >
                                        <Pin size={16} aria-hidden="true" />
                                        <span>{state.activeDialog.pinnedMessage.preview}</span>
                                    </button>
                                    {isPinUpdating && <LoaderCircle className="chats__spinner" size={14} aria-hidden="true" />}
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="chats__pinned-close"
                                            aria-label="Открепить сообщение"
                                            disabled={isPinUpdating}
                                            onClick={() => void handlePinToggle({ id: state.activeDialog.pinnedMessage.messageId })}
                                        >
                                            <X size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
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
                                    if (openMenuMessageId) closeMessageMenu()
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
                                    <p className="chats__empty-thread">
                                        {canEdit ? 'Напишите первое сообщение по этому отклику' : 'Переписка недоступна для новых сообщений'}
                                    </p>
                                )}
                                {messages.map((message, messageIndex) => {
                                    const isOwn = message.senderUserId === currentUser?.id
                                    const nextMessage = messages[messageIndex + 1]
                                    const showAvatar = !nextMessage || nextMessage.senderUserId !== message.senderUserId || Boolean(nextMessage.deletedAt) !== Boolean(message.deletedAt)
                                    const senderName = isOwn
                                        ? currentUser?.displayName || currentUser?.email || 'Вы'
                                        : state.activeDialog?.counterpart?.displayName || 'Участник'
                                    return (
                                        <div
                                            key={message.id || message.clientMessageId}
                                            className={`chats__message-row ${isOwn ? 'chats__message-row--own' : 'chats__message-row--incoming'}`}
                                        >
                                            {showAvatar ? (
                                                <span className="chats__message-avatar" title={senderName}>
                                                    {getInitials(senderName)}
                                                </span>
                                            ) : (
                                                <span className="chats__message-avatar chats__message-avatar--spacer" aria-hidden="true" />
                                            )}
                                            <div
                                                className={`chats__message ${isOwn ? 'chats__message--own' : 'chats__message--incoming'} ${message.deletedAt ? 'chats__message--deleted' : ''}`}
                                                data-message-id={message.id || ''}
                                                onContextMenu={(event) => handleMessageContextMenu(event, message)}
                                                onPointerDown={(event) => handleMessagePointerDown(event, message)}
                                                onPointerUp={clearLongPressTimer}
                                                onPointerCancel={clearLongPressTimer}
                                                onPointerLeave={clearLongPressTimer}
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
                                                <span className="chats__message-meta">
                                                    {formatTime(message.createdAt)}
                                                    {message.pending && ' · отправляется'}
                                                    {message.failed && ' · не отправлено'}
                                                    {message.editedAt && !message.deletedAt && ' · изменено'}
                                                </span>
                                                {message.reactions?.length > 0 && (
                                                    <div className="chats__reactions">
                                                        {message.reactions.slice(0, 4).map((reaction) => (
                                                            <button
                                                                key={reaction.reaction}
                                                                type="button"
                                                                className={`chats__reaction-chip ${reaction.reactedByMe ? 'is-active' : ''}`}
                                                                disabled={!canEdit}
                                                                onClick={() => {
                                                                    if (canEdit) void handleReaction(message, reaction.reaction)
                                                                }}
                                                            >
                                                                {reaction.reaction} {reaction.count}
                                                            </button>
                                                        ))}
                                                        {message.reactions.length > 4 && (
                                                            <button
                                                                type="button"
                                                                className="chats__reaction-chip"
                                                                onClick={(event) => openMessageMenu(event, message.id, { clientX: event.clientX, clientY: event.clientY })}
                                                            >
                                                                +{message.reactions.slice(4).reduce((total, reaction) => total + Number(reaction.count || 0), 0)}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {message.failed && (
                                                    <div className="chats__message-actions">
                                                        <button
                                                            className="chats__message-action"
                                                            disabled={message.retryFiles ? isUploading : false}
                                                            onClick={() => {
                                                                if (message.retryFiles) {
                                                                    void sendAttachmentMessage(
                                                                        message.retryFiles,
                                                                        message.body || '',
                                                                        message.clientMessageId,
                                                                        (message.attachments || []).map((attachment) => attachment.localPreviewUrl || '')
                                                                    )
                                                                } else {
                                                                    void sendMessage(message.body, message.clientMessageId)
                                                                }
                                                            }}
                                                        >
                                                            <RefreshCw size={13} aria-hidden="true" />
                                                            Повторить
                                                        </button>
                                                        {message.retryFiles && (
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
                                        </div>
                                    )
                                })}
                            </div>

                            {activeMenuMessage && (
                                <div
                                    className="chats__floating-menu"
                                    role="menu"
                                    style={messageMenuPosition || undefined}
                                >
                                    {canEdit && (
                                        <div className="chats__quick-reactions">
                                            {QUICK_REACTIONS_PRIMARY.map((reaction) => (
                                                <button key={reaction} type="button" role="menuitem" onClick={() => {
                                                    closeMessageMenu()
                                                    void handleReaction(activeMenuMessage, reaction)
                                                }}>
                                                    {reaction}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                className="chats__quick-reaction-more"
                                                aria-label="Ещё реакции"
                                                aria-expanded={isReactionMoreOpen}
                                                onClick={() => setIsReactionMoreOpen((isOpen) => !isOpen)}
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                    {canEdit && isReactionMoreOpen && (
                                        <div className="chats__reaction-more-grid">
                                            {QUICK_REACTIONS_MORE.map((reaction) => (
                                                <button key={reaction} type="button" onClick={() => {
                                                    closeMessageMenu()
                                                    void handleReaction(activeMenuMessage, reaction)
                                                }}>
                                                    {reaction}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {canEdit && (
                                        <button type="button" role="menuitem" onClick={() => { setReplyToMessage(activeMenuMessage); cancelEditingMessage(); closeMessageMenu(); textareaRef.current?.focus() }}>
                                            <Reply size={15} aria-hidden="true" />
                                            Ответить
                                        </button>
                                    )}
                                    {activeMenuMessage.body && !activeMenuMessage.deletedAt && (
                                        <button type="button" role="menuitem" onClick={() => void copyMessageText(activeMenuMessage)}>
                                            <Copy size={15} aria-hidden="true" />
                                            Копировать текст
                                        </button>
                                    )}
                                    {!activeMenuMessage.deletedAt && !activeMenuMessage.pending && !activeMenuMessage.failed && (activeMenuMessage.attachments || []).some((attachment) => attachment.id) && (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            disabled={savingAttachmentMessageId === activeMenuMessage.id}
                                            onClick={() => void saveMessageAttachments(activeMenuMessage)}
                                        >
                                            {savingAttachmentMessageId === activeMenuMessage.id
                                                ? <LoaderCircle className="chats__spinner" size={15} aria-hidden="true" />
                                                : <Download size={15} aria-hidden="true" />}
                                            {(activeMenuMessage.attachments || []).filter((attachment) => attachment.id).length === 1
                                                ? 'Сохранить вложение'
                                                : 'Сохранить вложения'}
                                        </button>
                                    )}
                                    {canEdit && activeMenuMessage.senderUserId === currentUser?.id && ['TEXT', 'MIXED', 'ATTACHMENT'].includes(activeMenuMessage.messageType) && (
                                        <button type="button" role="menuitem" onClick={() => { startEditingMessage(activeMenuMessage); closeMessageMenu() }}>
                                            <Edit3 size={15} aria-hidden="true" />
                                            Редактировать
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button type="button" role="menuitem" disabled={isPinUpdating} onClick={() => { closeMessageMenu(); void handlePinToggle(activeMenuMessage) }}>
                                            <Pin size={15} aria-hidden="true" />
                                            {state.activeDialog?.pinnedMessage?.messageId === activeMenuMessage.id ? 'Открепить' : 'Закрепить'}
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button type="button" role="menuitem" onClick={() => {
                                            setForwardingMessage(activeMenuMessage)
                                            setForwardSearch('')
                                            setForwardClientMessageId(createClientMessageId())
                                            closeMessageMenu()
                                        }}>
                                            <Forward size={15} aria-hidden="true" />
                                            Переслать
                                        </button>
                                    )}
                                    <button type="button" role="menuitem" className="is-danger" onClick={() => {
                                        setDeleteForEveryone(false)
                                        setConfirmAction({ type: 'delete', message: activeMenuMessage })
                                        closeMessageMenu()
                                    }}>
                                        <Trash2 size={15} aria-hidden="true" />
                                        Удалить
                                    </button>
                                </div>
                            )}

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
                                    if (editingMessage) {
                                        void handleSaveEdit()
                                    } else if (selectedFiles.length > 0) {
                                        void sendAttachmentMessage(selectedFiles, draft)
                                    } else {
                                        void sendMessage(draft)
                                    }
                                }}
                            >
                                {editingMessage && (
                                    <div className="chats__edit-preview">
                                        <span>
                                            <strong>Редактирование</strong>
                                            {editingMessage.body || editingMessage.attachments?.[0]?.originalFileName || 'Вложение'}
                                        </span>
                                        <button type="button" aria-label="Отменить редактирование" onClick={cancelEditingMessage}>
                                            <X size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
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
                                            multiple
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            onChange={(event) => {
                                                handleFileSelect(event.target.files)
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
                                                if (editingMessage) {
                                                    void handleSaveEdit()
                                                } else if (selectedFiles.length > 0) {
                                                    void sendAttachmentMessage(selectedFiles, draft)
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
                                        title={editingMessage ? 'Сохранить изменения' : 'Отправить сообщение'}
                                    >
                                        {isUploading || isEditSaving
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
                                {editingMessage && visibleEditingAttachments.length > 0 && (
                                    <div className="chats__selected-files">
                                        {visibleEditingAttachments.map((attachment) => (
                                            <div key={attachment.id} className="chats__selected-file chats__selected-file--existing">
                                                <FileText className="chats__attachment-file-icon" size={22} aria-hidden="true" />
                                                <span>
                                                    <strong>{attachment.originalFileName}</strong>
                                                    <small>{formatFileSize(attachment.sizeBytes)}</small>
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label="Удалить вложение"
                                                    title="Удалить вложение"
                                                    onClick={() => setEditingRemoveAttachmentIds((current) => [...current, attachment.id])}
                                                >
                                                    <X size={18} aria-hidden="true" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedFiles.length > 0 && (
                                    <div className="chats__selected-files">
                                        {selectedFiles.map((item) => (
                                            <div key={item.id} className="chats__selected-file">
                                                {item.previewUrl
                                                    ? <img src={item.previewUrl} alt="" />
                                                    : <FileText className="chats__attachment-file-icon" size={22} aria-hidden="true" />}
                                                <span>
                                                    <strong>{item.file.name}</strong>
                                                    <small>{formatFileSize(item.file.size)}</small>
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label="Убрать прикреплённый файл"
                                                    title="Убрать файл"
                                                    onClick={() => removeSelectedFile(item.id)}
                                                >
                                                    <X size={18} aria-hidden="true" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {editingError && <small className="chats__edit-error">{editingError}</small>}
                                <div className="chats__composer-footer">
                                    <span>{draft.length}/4000</span>
                                    <span>{visibleEditingAttachments.length + selectedFiles.length}/{MAX_MESSAGE_ATTACHMENTS}</span>
                                </div>
                            </form>
                            {confirmAction && (
                                <div className="chats__modal-backdrop" role="presentation" onClick={() => { setConfirmAction(null); setDeleteForEveryone(false) }}>
                                    <div className="chats__confirm" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                                        <h3>Удалить сообщение?</h3>
                                        <p>
                                            {deleteForEveryone
                                                ? 'Сообщение исчезнет из переписки для обоих участников.'
                                                : 'Оно исчезнет только у вас. У собеседника сообщение останется.'}
                                        </p>
                                        {canEdit && confirmAction.message?.senderUserId === currentUser?.id && !confirmAction.message?.deletedAt && (
                                            <label className="chats__confirm-check">
                                                <input
                                                    type="checkbox"
                                                    checked={deleteForEveryone}
                                                    onChange={(event) => setDeleteForEveryone(event.target.checked)}
                                                />
                                                <span>Также удалить у собеседника</span>
                                            </label>
                                        )}
                                        <div>
                                            <button type="button" onClick={() => { setConfirmAction(null); setDeleteForEveryone(false) }}>Отмена</button>
                                            <button
                                                type="button"
                                                className="is-danger"
                                                onClick={() => {
                                                    const action = confirmAction
                                                    const shouldDeleteForEveryone = deleteForEveryone &&
                                                        canEdit &&
                                                        action.message?.senderUserId === currentUser?.id &&
                                                        !action.message?.deletedAt
                                                    setConfirmAction(null)
                                                    setDeleteForEveryone(false)
                                                    if (shouldDeleteForEveryone) {
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
