package ru.itplanet.trampline.interaction.chat.ws

import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServerHttpResponse
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.HandshakeInterceptor
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Component
class ChatHandshakeInterceptor : HandshakeInterceptor {

    companion object {
        const val CHAT_PRINCIPAL_SESSION_ATTRIBUTE = "chatPrincipal"
    }

    override fun beforeHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>,
    ): Boolean {
        val authentication = request.principal as? Authentication
            ?: return false

        if (!authentication.isAuthenticated) {
            return false
        }

        val authenticatedUser = authentication.principal as? AuthenticatedUser
            ?: return false

        attributes[CHAT_PRINCIPAL_SESSION_ATTRIBUTE] = ChatPrincipal(
            userId = authenticatedUser.userId,
            email = authenticatedUser.email,
            role = authenticatedUser.role,
        )

        return true
    }

    override fun afterHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        exception: Exception?,
    ) = Unit
}
