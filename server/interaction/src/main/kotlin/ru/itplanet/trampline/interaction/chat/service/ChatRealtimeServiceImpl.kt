package ru.itplanet.trampline.interaction.chat.service

import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogQueryDao
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.chat.mapper.ChatRealtimeMapper
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatRealtimeServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatDialogQueryDao: ChatDialogQueryDao,
    private val chatParticipantStateDao: ChatParticipantStateDao,
    private val chatMessageCommandService: ChatMessageCommandService,
    private val chatReadService: ChatReadService,
    private val chatRealtimeMapper: ChatRealtimeMapper,
    private val simpMessagingTemplate: SimpMessagingTemplate,
) : ChatRealtimeService {

    override fun handleSendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
    ) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)

        val commandResult = chatMessageCommandService.sendMessage(
            dialogId = dialogId,
            currentUser = currentUser,
            clientMessageId = clientMessageId,
            body = body,
        )

        if (!commandResult.created) {
            return
        }

        safeSendToParticipants(
            dialog = dialog,
            eventSupplier = {
                chatRealtimeMapper.toMessageCreatedEvent(commandResult.message)
            },
        )

        safeSendDialogUpdated(dialog, dialog.applicantUserId)
        safeSendDialogUpdated(dialog, dialog.employerUserId)
    }

    override fun handleMarkRead(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        lastReadMessageId: Long,
    ) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)

        val previousLastReadMessageId = chatParticipantStateDao.findByIdDialogIdAndIdUserId(
            dialogId = dialogId,
            userId = currentUser.userId,
        )?.lastReadMessageId

        chatReadService.markRead(
            dialogId = dialogId,
            currentUser = currentUser,
            lastReadMessageId = lastReadMessageId,
        )

        val participantState = chatParticipantStateDao.findByIdDialogIdAndIdUserId(
            dialogId = dialogId,
            userId = currentUser.userId,
        ) ?: throw IllegalStateException(
            "Состояние участника чата не найдено для диалога $dialogId и пользователя ${currentUser.userId}",
        )

        val actualLastReadMessageId = participantState.lastReadMessageId ?: return
        if (actualLastReadMessageId == previousLastReadMessageId) {
            return
        }

        val readAt = participantState.lastReadAt ?: OffsetDateTime.now()

        safeSendToParticipants(
            dialog = dialog,
            eventSupplier = {
                chatRealtimeMapper.toReadUpdatedEvent(
                    dialogId = dialogId,
                    readerUserId = currentUser.userId,
                    lastReadMessageId = actualLastReadMessageId,
                    readAt = readAt,
                )
            },
        )

        safeSendDialogUpdated(dialog, currentUser.userId)
    }

    private fun safeSendDialogUpdated(
        dialog: ChatDialogDto,
        targetUserId: Long,
    ) {
        try {
            val dialogId = requireDialogId(dialog)
            val dialogView = chatDialogQueryDao.findDialog(dialogId, targetUserId)
                ?: return

            simpMessagingTemplate.convertAndSendToUser(
                targetUserId.toString(),
                CHAT_EVENTS_DESTINATION,
                chatRealtimeMapper.toDialogUpdatedEvent(dialogView),
            )
        } catch (ex: Exception) {
            logger.warn(
                "Не удалось отправить DIALOG_UPDATED пользователю {} по диалогу {}",
                targetUserId,
                dialog.id,
                ex,
            )
        }
    }

    private fun safeSendToParticipants(
        dialog: ChatDialogDto,
        eventSupplier: () -> Any,
    ) {
        val participantUserIds = linkedSetOf(
            dialog.applicantUserId,
            dialog.employerUserId,
        )

        participantUserIds.forEach { userId ->
            try {
                simpMessagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    CHAT_EVENTS_DESTINATION,
                    eventSupplier(),
                )
            } catch (ex: Exception) {
                logger.warn(
                    "Не удалось отправить realtime-событие пользователю {} по диалогу {}",
                    userId,
                    dialog.id,
                    ex,
                )
            }
        }
    }

    private fun requireDialogId(
        dialog: ChatDialogDto,
    ): Long {
        return dialog.id ?: throw IllegalStateException(
            "Идентификатор диалога чата не должен быть null",
        )
    }

    companion object {
        private const val CHAT_EVENTS_DESTINATION = "/queue/chat-events"
        private val logger = LoggerFactory.getLogger(ChatRealtimeServiceImpl::class.java)
    }
}
