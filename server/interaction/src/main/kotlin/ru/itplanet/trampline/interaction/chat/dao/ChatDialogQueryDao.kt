package ru.itplanet.trampline.interaction.chat.dao

import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListQuery
import ru.itplanet.trampline.interaction.chat.model.ChatDialogPage

interface ChatDialogQueryDao {
    fun findDialog(
        dialogId: Long,
        currentUserId: Long,
    ): ChatDialog?

    fun findDialogs(
        currentUserId: Long,
        query: ChatDialogListQuery,
    ): ChatDialogPage
}
