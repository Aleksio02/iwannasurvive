package ru.itplanet.trampline.moderation.ai.client

data class YandexGptCompletionRequest(
    val modelUri: String,
    val completionOptions: CompletionOptions,
    val messages: List<Message>,
) {
    data class CompletionOptions(val stream: Boolean = false, val temperature: Double, val maxTokens: String)
    data class Message(val role: String, val text: String)
}
