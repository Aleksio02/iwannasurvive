package ru.itplanet.trampline.interaction.chat.model.response

data class ChatDialogPageResponse(
    val items: List<ChatDialogListItemResponse>,
    val nextCursor: String?,
)
