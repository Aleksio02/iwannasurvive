package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListQuery
import ru.itplanet.trampline.interaction.chat.model.ChatDialogPage
import ru.itplanet.trampline.interaction.chat.model.response.ChatOpportunityFilterResponse
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatDialogQueryService {
    fun getDialog(
        dialogId: Long,
        currentUser: AuthenticatedUser,
    ): ChatDialog

    fun getDialogs(
        currentUser: AuthenticatedUser,
        query: ChatDialogListQuery,
    ): ChatDialogPage

    fun getOpportunityFilters(
        currentUser: AuthenticatedUser,
    ): List<ChatOpportunityFilterResponse>
}
