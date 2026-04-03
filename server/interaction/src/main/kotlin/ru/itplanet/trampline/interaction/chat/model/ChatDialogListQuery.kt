package ru.itplanet.trampline.interaction.chat.model

data class ChatDialogListQuery(
    val opportunityId: Long? = null,
    val unreadOnly: Boolean = false,
    val archived: Boolean = false,
    val limit: Int = 20,
    val cursor: ChatDialogCursor? = null,
) {
    init {
        require(limit in 1..100) { "limit must be between 1 and 100" }
    }
}
