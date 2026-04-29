package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatArchiveServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatParticipantStateService: ChatParticipantStateService,
    private val chatParticipantStateDao: ChatParticipantStateDao,
) : ChatArchiveService {

    @Transactional
    override fun archive(
        dialogId: Long,
        currentUser: AuthenticatedUser,
    ) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)

        val participantState = chatParticipantStateService.getOrCreateParticipantState(
            dialog = dialog,
            userId = currentUser.userId,
        )

        if (participantState.archivedAt != null) {
            return
        }

        participantState.archivedAt = OffsetDateTime.now()
        chatParticipantStateDao.save(participantState)
    }

    @Transactional
    override fun unarchive(
        dialogId: Long,
        currentUser: AuthenticatedUser,
    ) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)

        val participantState = chatParticipantStateService.getOrCreateParticipantState(
            dialog = dialog,
            userId = currentUser.userId,
        )

        if (participantState.archivedAt == null) {
            return
        }

        participantState.archivedAt = null
        chatParticipantStateDao.save(participantState)
    }
}
