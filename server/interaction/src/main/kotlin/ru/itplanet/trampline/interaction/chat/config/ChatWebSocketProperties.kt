package ru.itplanet.trampline.interaction.chat.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "chat.websocket")
data class ChatWebSocketProperties(
    var allowedOriginPatterns: List<String> = listOf(
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",
    ),
)
