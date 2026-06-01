import { useEffect, useMemo, useState } from 'react'
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

export function ChatRealtimeProvider({ children }) {
    const [sessionUser, setSessionUser] = useState(getSessionUser())
    const [connectionStatus, setConnectionStatus] = useState('idle')
    const [lastEvent, setLastEvent] = useState(null)
    const [eventVersion, setEventVersion] = useState(0)

    useEffect(() => subscribeSessionChange(setSessionUser), [])

    useEffect(() => {
        if (!sessionUser?.id || !CHAT_ROLES.has(sessionUser.role)) {
            return undefined
        }

        retainChatRealtime(sessionUser.id)
        const unsubscribeStatus = subscribeChatConnectionStatus(setConnectionStatus)
        const unsubscribeEvents = subscribeChatEvents((event) => {
            setLastEvent(event)
            setEventVersion((version) => version + 1)
        })

        return () => {
            unsubscribeEvents()
            unsubscribeStatus()
            releaseChatRealtime()
        }
    }, [sessionUser?.id, sessionUser?.role])

    const value = useMemo(() => ({
        connectionStatus,
        eventVersion,
        lastEvent,
        publishMessage: publishChatMessage,
        publishRead: publishChatRead,
    }), [connectionStatus, eventVersion, lastEvent])

    return (
        <ChatRealtimeContext.Provider value={value}>
            {children}
        </ChatRealtimeContext.Provider>
    )
}
