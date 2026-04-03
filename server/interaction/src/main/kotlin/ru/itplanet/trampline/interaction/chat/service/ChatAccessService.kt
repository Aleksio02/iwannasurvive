package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

interface ChatAccessService {
    fun assertDialogParticipant(
        dialogId: Long,
        currentUserId: Long,
    ): ChatDialogDto

    fun assertCanRead(
        dialog: ChatDialogDto,
        currentUser: AuthenticatedUser,
    ): OpportunityResponseDto

    fun assertCanWrite(
        dialog: ChatDialogDto,
        currentUser: AuthenticatedUser,
    ): OpportunityResponseDto
}
