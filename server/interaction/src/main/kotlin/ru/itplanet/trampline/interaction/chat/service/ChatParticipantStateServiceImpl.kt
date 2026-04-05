package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatParticipantStateDtoId
import ru.itplanet.trampline.interaction.exception.InteractionInternalException
import java.time.OffsetDateTime

@Service
class ChatParticipantStateServiceImpl(
    private val chatParticipantStateDao: ChatParticipantStateDao,
) : ChatParticipantStateService {

    @Transactional
    override fun ensureParticipantStates(dialog: ChatDialogDto) {
        loadOrCreateParticipantStates(dialog)
    }

    @Transactional
    override fun getOrCreateParticipantState(
        dialog: ChatDialogDto,
        userId: Long,
    ): ChatParticipantStateDto {
        requireParticipant(dialog, userId)

        return loadOrCreateParticipantStates(dialog)
            .firstOrNull { it.id.userId == userId }
            ?: throw InteractionInternalException(
                message = "Не найдено состояние участника чата для пользователя $userId",
                code = "chat_participant_state_missing",
            )
    }

    @Transactional
    override fun onMessageSent(
        dialog: ChatDialogDto,
        senderUserId: Long,
        messageId: Long,
        timestamp: OffsetDateTime,
    ) {
        requireParticipant(dialog, senderUserId)

        val participantStates = loadOrCreateParticipantStates(dialog)

        participantStates.forEach { state ->
            if (state.archivedAt != null) {
                state.archivedAt = null
            }
        }

        val senderState = participantStates.firstOrNull { it.id.userId == senderUserId }
            ?: throw InteractionInternalException(
                message = "Не найдено состояние отправителя сообщения для пользователя $senderUserId",
                code = "chat_sender_participant_state_missing",
            )

        senderState.lastReadMessageId = messageId
        senderState.lastReadAt = timestamp

        chatParticipantStateDao.saveAll(participantStates)
    }

    private fun loadOrCreateParticipantStates(
        dialog: ChatDialogDto,
    ): MutableList<ChatParticipantStateDto> {
        val dialogId = requireDialogId(dialog)

        val existingByUserId = chatParticipantStateDao.findByIdDialogId(dialogId)
            .associateBy { it.id.userId }
            .toMutableMap()

        val participantUserIds = listOf(
            dialog.applicantUserId,
            dialog.employerUserId,
        )

        val missingStates = participantUserIds
            .filterNot(existingByUserId::containsKey)
            .map { userId ->
                ChatParticipantStateDto(
                    ChatParticipantStateDtoId(
                        dialogId = dialogId,
                        userId = userId,
                    ),
                )
            }

        if (missingStates.isNotEmpty()) {
            chatParticipantStateDao.saveAllAndFlush(missingStates).forEach { saved ->
                existingByUserId[saved.id.userId] = saved
            }
        }

        return participantUserIds.map { userId ->
            existingByUserId[userId] ?: throw InteractionInternalException(
                message = "Не удалось восстановить состояние участника чата для пользователя $userId",
                code = "chat_participant_state_restore_failed",
            )
        }.toMutableList()
    }

    private fun requireDialogId(
        dialog: ChatDialogDto,
    ): Long {
        return dialog.id ?: throw InteractionInternalException(
            message = "Не найден идентификатор диалога чата",
            code = "chat_dialog_id_missing",
        )
    }

    private fun requireParticipant(
        dialog: ChatDialogDto,
        userId: Long,
    ) {
        if (userId != dialog.applicantUserId && userId != dialog.employerUserId) {
            throw InteractionInternalException(
                message = "Пользователь $userId не является участником диалога чата",
                code = "chat_dialog_participant_mismatch",
            )
        }
    }
}
