import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import Toaster from '@/shared/ui/Toaster/Toaster'
import { ChatRealtimeProvider } from '@/features/Chats/ChatRealtimeProvider'
import './styles/main.scss'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ChatRealtimeProvider>
            <App />
            <Toaster />
        </ChatRealtimeProvider>
    </React.StrictMode>
)
