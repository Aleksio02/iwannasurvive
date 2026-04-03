package ru.itplanet.trampline.interaction.chat.model

data class ChatMessageSliceQuery(
    val beforeMessageId: Long? = null,
    val afterMessageId: Long? = null,
    val limit: Int = 50,
) {
    init {
        require(beforeMessageId == null || afterMessageId == null) {
            "Only one of beforeMessageId or afterMessageId can be provided"
        }
        require(limit in 1..100) { "limit must be between 1 and 100" }
    }
}
