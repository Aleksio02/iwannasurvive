package ru.itplanet.trampline.moderation.ai.client

interface YandexGptClient {
    fun complete(systemPrompt: String, userPrompt: String): YandexGptCompletionResponse
}
