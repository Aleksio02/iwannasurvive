package ru.itplanet.trampline.interaction.chat.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import ru.itplanet.trampline.interaction.chat.ws.ChatHandshakeInterceptor
import ru.itplanet.trampline.interaction.chat.ws.ChatInboundChannelInterceptor

@Configuration
@EnableWebSocketMessageBroker
@EnableConfigurationProperties(ChatWebSocketProperties::class)
class ChatWebSocketConfig(
    private val chatHandshakeInterceptor: ChatHandshakeInterceptor,
    private val chatInboundChannelInterceptor: ChatInboundChannelInterceptor,
    private val chatWebSocketProperties: ChatWebSocketProperties,
) : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
            .addEndpoint("/ws")
            .setAllowedOriginPatterns(*chatWebSocketProperties.allowedOriginPatterns.toTypedArray())
            .addInterceptors(chatHandshakeInterceptor)
    }

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        registry.enableSimpleBroker("/queue")
        registry.setApplicationDestinationPrefixes("/app")
        registry.setUserDestinationPrefix("/user")
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration.interceptors(chatInboundChannelInterceptor)
    }
}
