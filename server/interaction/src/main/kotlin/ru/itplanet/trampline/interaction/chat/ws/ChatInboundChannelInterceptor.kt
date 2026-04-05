ackage ru.itplanet.trampline.interaction.chat.ws

import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Component

@Component
class ChatInboundChannelInterceptor : ChannelInterceptor {

    override fun preSend(
        message: Message<*>,
        channel: MessageChannel,
    ): Message<*> {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
            ?: return message

        val command = accessor.command ?: return message

        if (command == StompCommand.DISCONNECT) {
            return message
        }

        val principal = accessor.sessionAttributes
            ?.get(ChatHandshakeInterceptor.CHAT_PRINCIPAL_SESSION_ATTRIBUTE) as? ChatPrincipal
            ?: throw AccessDeniedException("WebSocket-сессия не аутентифицирована")

        accessor.user = principal
        return message
    }
}
