package ru.itplanet.trampline.moderation.ai.client

data class YandexGptCompletionResponse(val result: Result?) {
    data class Result(val alternatives: List<Alternative> = emptyList(), val modelVersion: String? = null)
    data class Alternative(val message: Message?)
    data class Message(val role: String? = null, val text: String? = null)
}
