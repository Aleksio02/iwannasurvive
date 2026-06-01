package ru.itplanet.trampline.moderation.ai.client

import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import ru.itplanet.trampline.moderation.ai.config.AiModerationProperties
import ru.itplanet.trampline.moderation.ai.config.YandexGptProperties

@Component
class YandexGptClientImpl(
    private val properties: YandexGptProperties,
    moderationProperties: AiModerationProperties,
) : YandexGptClient {
    private val restClient = RestClient.builder()
        .requestFactory(org.springframework.http.client.SimpleClientHttpRequestFactory().apply {
            setConnectTimeout(moderationProperties.asyncTimeoutMs.toInt())
            setReadTimeout(moderationProperties.asyncTimeoutMs.toInt())
        })
        .build()

    override fun complete(systemPrompt: String, userPrompt: String): YandexGptCompletionResponse {
        check(properties.isConfigured()) { "AI-провайдер не настроен" }
        return restClient.post()
            .uri(properties.endpoint)
            .contentType(MediaType.APPLICATION_JSON)
            .header("Authorization", "Api-Key ${properties.apiKey}")
            .header("x-folder-id", properties.folderId)
            .body(
                YandexGptCompletionRequest(
                    modelUri = properties.resolvedModelUri(),
                    completionOptions = YandexGptCompletionRequest.CompletionOptions(
                        temperature = properties.temperature,
                        maxTokens = properties.maxTokens.toString(),
                    ),
                    messages = listOf(
                        YandexGptCompletionRequest.Message("system", systemPrompt),
                        YandexGptCompletionRequest.Message("user", userPrompt),
                    ),
                ),
            )
            .retrieve()
            .body(YandexGptCompletionResponse::class.java)
            ?: error("AI-провайдер вернул пустой ответ")
    }
}
