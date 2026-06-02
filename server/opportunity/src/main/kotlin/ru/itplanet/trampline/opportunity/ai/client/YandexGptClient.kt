package ru.itplanet.trampline.opportunity.ai.client

interface YandexGptClient {
    fun complete(systemPrompt: String, userPrompt: String): String
}
