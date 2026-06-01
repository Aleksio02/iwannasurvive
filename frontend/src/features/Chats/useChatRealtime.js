import { createContext, useContext } from 'react'

export const ChatRealtimeContext = createContext(null)

export function useChatRealtime() {
    const context = useContext(ChatRealtimeContext)

    if (!context) {
        throw new Error('useChatRealtime должен использоваться внутри ChatRealtimeProvider')
    }

    return context
}
