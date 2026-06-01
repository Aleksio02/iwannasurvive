package ru.itplanet.trampline.moderation.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.yandex-gpt")
data class YandexGptProperties(
    val endpoint: String = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    val folderId: String = "",
    val apiKey: String = "",
    val apiKeyId: String = "",
    val modelUri: String = "",
    val temperature: Double = 0.2,
    val maxTokens: Int = 2000,
) {
    fun resolvedModelUri(): String = modelUri.ifBlank { "gpt://$folderId/yandexgpt-5.1" }
    fun isConfigured(): Boolean = folderId.isNotBlank() && apiKey.isNotBlank()
}
