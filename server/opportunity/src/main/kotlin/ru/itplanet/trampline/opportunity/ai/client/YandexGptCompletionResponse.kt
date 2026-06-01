package ru.itplanet.trampline.opportunity.ai.client

data class YandexGptCompletionResponse(val result: Result?) {
    data class Result(val alternatives: List<Alternative> = emptyList())
    data class Alternative(val message: Message?)
    data class Message(val text: String? = null)
}
