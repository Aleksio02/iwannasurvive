package ru.itplanet.trampline.opportunity.ai.client

import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import ru.itplanet.trampline.opportunity.ai.config.AiTagSuggestionProperties
import ru.itplanet.trampline.opportunity.ai.config.YandexGptProperties

@Component
class YandexGptClientImpl(
    private val properties: YandexGptProperties,
    tagSuggestionProperties: AiTagSuggestionProperties,
) : YandexGptClient {
    private val restClient = RestClient.builder()
        .requestFactory(SimpleClientHttpRequestFactory().apply {
            setConnectTimeout(tagSuggestionProperties.timeoutMs.toInt())
            setReadTimeout(tagSuggestionProperties.timeoutMs.toInt())
        })
        .build()

    override fun complete(systemPrompt: String, userPrompt: String): String {
        check(properties.isConfigured()) { "AI-провайдер не настроен" }

        val response = restClient.post()
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

        return response?.result?.alternatives?.firstOrNull()?.message?.text
            ?.takeIf(String::isNotBlank)
            ?: error("AI-провайдер вернул пустой ответ")
    }
}
