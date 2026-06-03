package ru.itplanet.trampline.interaction.chat.service

import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogQueryDao
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogDto
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.mapper.ChatRealtimeMapper
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import java.time.OffsetDateTime

@Service
class ChatRealtimeServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatDialogQueryDao: ChatDialogQueryDao,
    private val chatParticipantStateDao: ChatParticipantStateDao,
    private val chatMessageCommandService: ChatMessageCommandService,
    private val chatReadService: ChatReadService,
    private val chatMessageEnrichmentService: ChatMessageEnrichmentService,
    private val chatRealtimeMapper: ChatRealtimeMapper,
    private val simpMessagingTemplate: SimpMessagingTemplate,
) : ChatRealtimeService {

    override fun handleSendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
        replyToMessageId: Long?,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)

        val commandResult = chatMessageCommandService.sendMessage(
            dialogId = dialogId,
            currentUser = currentUser,
            clientMessageId = clientMessageId,
            body = body,
            replyToMessageId = replyToMessageId,
        )

        broadcastCreatedMessage(dialog, commandResult)
        return commandResult
    }

    override fun handleSendAttachment(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String?,
        file: MultipartFile,
        replyToMessageId: Long?,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        val commandResult = chatMessageCommandService.sendAttachment(
            dialogId = dialogId,
            currentUser = currentUser,
            clientMessageId = clientMessageId,
            body = body,
            file = file,
            replyToMessageId = replyToMessageId,
        )
        broadcastCreatedMessage(dialog, commandResult)
        return commandResult
    }

    private fun broadcastCreatedMessage(
        dialog: ChatDialogDto,
        commandResult: ChatMessageCommandResult,
    ) {
        if (!commandResult.created) return

        safeSendToParticipants(
            dialog = dialog,
            eventSupplier = { targetUserId ->
                chatRealtimeMapper.toMessageCreatedEvent(
                    chatMessageEnrichmentService.enrich(commandResult.message, targetUserId),
                )
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

    override fun broadcastMessageUpdated(dialogId: Long, message: ChatMessage) {
        val dialog = chatAccessService.requireDialog(dialogId)
        safeSendToParticipants(dialog) { targetUserId ->
            chatRealtimeMapper.toMessageUpdatedEvent(chatMessageEnrichmentService.enrich(message, targetUserId))
        }
        safeSendDialogUpdated(dialog, dialog.applicantUserId)
        safeSendDialogUpdated(dialog, dialog.employerUserId)
    }

    override fun broadcastMessageCreated(dialogId: Long, message: ChatMessage) {
        val dialog = chatAccessService.requireDialog(dialogId)
        safeSendToParticipants(dialog) { targetUserId ->
            chatRealtimeMapper.toMessageCreatedEvent(chatMessageEnrichmentService.enrich(message, targetUserId))
        }
        safeSendDialogUpdated(dialog, dialog.applicantUserId)
        safeSendDialogUpdated(dialog, dialog.employerUserId)
    }

    override fun broadcastMessageDeleted(dialogId: Long, message: ChatMessage) {
        val dialog = chatAccessService.requireDialog(dialogId)
        safeSendToParticipants(dialog) { targetUserId ->
            chatRealtimeMapper.toMessageDeletedEvent(chatMessageEnrichmentService.enrich(message, targetUserId))
        }
        safeSendDialogUpdated(dialog, dialog.applicantUserId)
        safeSendDialogUpdated(dialog, dialog.employerUserId)
    }

    override fun broadcastMessageReactionsUpdated(dialogId: Long, message: ChatMessage) {
        val dialog = chatAccessService.requireDialog(dialogId)
        safeSendToParticipants(dialog) { targetUserId ->
            chatRealtimeMapper.toMessageReactionsUpdatedEvent(chatMessageEnrichmentService.enrich(message, targetUserId))
        }
    }

    override fun broadcastMessageHidden(dialogId: Long, targetUserId: Long, messageId: Long) {
        try {
            simpMessagingTemplate.convertAndSendToUser(
                targetUserId.toString(),
                CHAT_EVENTS_DESTINATION,
                chatRealtimeMapper.toMessageHiddenEvent(dialogId, messageId),
            )
        } catch (ex: Exception) {
            logger.warn("Не удалось отправить MESSAGE_HIDDEN пользователю {} по диалогу {}", targetUserId, dialogId, ex)
        }
    }

    override fun broadcastDialogUpdated(dialog: ChatDialog) {
        val persistedDialog = chatAccessService.requireDialog(dialog.dialogId)
        safeSendDialogUpdated(persistedDialog, persistedDialog.applicantUserId)
        safeSendDialogUpdated(persistedDialog, persistedDialog.employerUserId)
    }

    override fun broadcastReadStateUpdated(dialogId: Long, currentUser: AuthenticatedUser) {
        val dialog = chatAccessService.requireDialog(dialogId)
        val participantState = chatParticipantStateDao.findByIdDialogIdAndIdUserId(dialogId, currentUser.userId)
            ?: return
        val readAt = participantState.lastReadAt ?: OffsetDateTime.now()
        try {
            simpMessagingTemplate.convertAndSendToUser(
                currentUser.userId.toString(),
                CHAT_EVENTS_DESTINATION,
                chatRealtimeMapper.toReadStateUpdatedEvent(
                    dialogId = dialogId,
                    readerUserId = currentUser.userId,
                    lastReadMessageId = participantState.lastReadMessageId,
                    readAt = readAt,
                ),
            )
        } catch (ex: Exception) {
            logger.warn("Не удалось отправить READ_STATE_UPDATED пользователю {} по диалогу {}", currentUser.userId, dialogId, ex)
        }
        safeSendDialogUpdated(dialog, currentUser.userId)
    }

    override fun handleTyping(dialogId: Long, currentUser: AuthenticatedUser, typing: Boolean) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        val targetUserId = if (currentUser.userId == dialog.applicantUserId) dialog.employerUserId else dialog.applicantUserId
        try {
            simpMessagingTemplate.convertAndSendToUser(
                targetUserId.toString(),
                CHAT_EVENTS_DESTINATION,
                chatRealtimeMapper.toTypingUpdatedEvent(
                    dialogId = dialogId,
                    userId = currentUser.userId,
                    typing = typing,
                    expiresAt = OffsetDateTime.now().plusSeconds(4),
                ),
            )
        } catch (ex: Exception) {
            logger.warn("Не удалось отправить TYPING_UPDATED пользователю {} по диалогу {}", targetUserId, dialogId, ex)
        }
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
        eventSupplier: (Long) -> Any,
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
                    eventSupplier(userId),
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
