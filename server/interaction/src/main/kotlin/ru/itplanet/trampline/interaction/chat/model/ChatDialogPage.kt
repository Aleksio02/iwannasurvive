package ru.itplanet.trampline.interaction.chat.model

data class ChatDialogPage(
    val items: List<ChatDialogListItem>,
    val nextCursor: ChatDialogCursor?,
)
