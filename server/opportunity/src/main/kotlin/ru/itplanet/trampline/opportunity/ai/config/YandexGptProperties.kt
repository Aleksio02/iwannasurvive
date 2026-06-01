package ru.itplanet.trampline.opportunity.ai.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("app.ai.yandex-gpt")
data class YandexGptProperties(
    val endpoint: String = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
    val folderId: String = "",
    val apiKey: String = "",
    val apiKeyId: String = "",
    val modelUri: String = "",
    val temperature: Double = 0.1,
    val maxTokens: Int = 1200,
) {
    fun resolvedModelUri(): String = modelUri.ifBlank { "gpt://$folderId/yandexgpt-5.1" }
    fun isConfigured(): Boolean = folderId.isNotBlank() && apiKey.isNotBlank()
}
