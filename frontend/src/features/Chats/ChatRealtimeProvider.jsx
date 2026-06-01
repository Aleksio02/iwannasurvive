import { useEffect, useMemo, useRef, useState } from 'react'
import { getSessionUser, subscribeSessionChange } from '@/shared/lib/utils/sessionStore'
import { ChatRealtimeContext } from './useChatRealtime'
import {
    publishChatMessage,
    publishChatRead,
    releaseChatRealtime,
    retainChatRealtime,
    subscribeChatConnectionStatus,
    subscribeChatEvents,
} from './chatRealtime'

const CHAT_ROLES = new Set(['APPLICANT', 'EMPLOYER'])
const EVENT_BUFFER_LIMIT = 100

export function ChatRealtimeProvider({ children }) {
    const [sessionUser, setSessionUser] = useState(getSessionUser())
    const [connectionStatus, setConnectionStatus] = useState('idle')
    const [events, setEvents] = useState([])
    const eventSequenceRef = useRef(0)

    useEffect(() => subscribeSessionChange(setSessionUser), [])

    useEffect(() => {
        if (!sessionUser?.id || !CHAT_ROLES.has(sessionUser.role)) {
            return undefined
        }

        retainChatRealtime(sessionUser.id)
        const unsubscribeStatus = subscribeChatConnectionStatus(setConnectionStatus)
        const unsubscribeEvents = subscribeChatEvents((event) => {
            const sequence = eventSequenceRef.current + 1
            eventSequenceRef.current = sequence
            setEvents((currentEvents) => [
                ...currentEvents,
                { sequence, event },
            ].slice(-EVENT_BUFFER_LIMIT))
        })

        return () => {
            unsubscribeEvents()
            unsubscribeStatus()
            releaseChatRealtime()
        }
    }, [sessionUser?.id, sessionUser?.role])

    const value = useMemo(() => ({
        connectionStatus,
        eventVersion: events[events.length - 1]?.sequence || 0,
        events,
        publishMessage: publishChatMessage,
        publishRead: publishChatRead,
    }), [connectionStatus, events])

    return (
        <ChatRealtimeContext.Provider value={value}>
            {children}
        </ChatRealtimeContext.Provider>
    )
}
