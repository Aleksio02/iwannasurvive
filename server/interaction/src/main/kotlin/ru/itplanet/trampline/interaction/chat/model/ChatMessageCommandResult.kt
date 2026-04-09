package ru.itplanet.trampline.interaction.chat.model

data class ChatMessageCommandResult(
    val message: ChatMessage,
    val created: Boolean,
)
