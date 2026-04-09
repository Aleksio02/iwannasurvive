package ru.itplanet.trampline.interaction.chat.ws

import jakarta.validation.Valid
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Controller
import org.springframework.validation.annotation.Validated
import ru.itplanet.trampline.interaction.chat.service.ChatRealtimeService
import ru.itplanet.trampline.interaction.chat.ws.model.MarkChatReadWsRequest
import ru.itplanet.trampline.interaction.chat.ws.model.SendChatMessageWsRequest
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.security.Principal

@Validated
@Controller
class ChatWebSocketController(
    private val chatRealtimeService: ChatRealtimeService,
) {

    @MessageMapping("/chats/{dialogId}/send")
    fun sendMessage(
        @DestinationVariable dialogId: Long,
        @Valid @Payload request: SendChatMessageWsRequest,
        principal: Principal,
    ) {
        chatRealtimeService.handleSendMessage(
            dialogId = dialogId,
            currentUser = principal.toAuthenticatedUser(),
            clientMessageId = request.clientMessageId,
            body = request.body,
        )
    }

    @MessageMapping("/chats/{dialogId}/read")
    fun markRead(
        @DestinationVariable dialogId: Long,
        @Valid @Payload request: MarkChatReadWsRequest,
        principal: Principal,
    ) {
        chatRealtimeService.handleMarkRead(
            dialogId = dialogId,
            currentUser = principal.toAuthenticatedUser(),
            lastReadMessageId = request.lastReadMessageId,
        )
    }

    private fun Principal.toAuthenticatedUser(): AuthenticatedUser {
        val chatPrincipal = this as? ChatPrincipal
            ?: throw AccessDeniedException("WebSocket-сессия не аутентифицирована")

        return AuthenticatedUser(
            userId = chatPrincipal.userId,
            email = chatPrincipal.email,
            role = chatPrincipal.role,
        )
    }
}
