package ru.itplanet.trampline.interaction.chat.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.dao.ChatParticipantStateDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.exception.InteractionException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatMessageCommandServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatDialogDao: ChatDialogDao,
    private val chatMessageDao: ChatMessageDao,
    private val chatParticipantStateDao: ChatParticipantStateDao,
    private val chatDomainMapper: ChatDomainMapper,
) : ChatMessageCommandService {

    @Transactional
    override fun sendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
    ): ChatMessage {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)

        val normalizedClientMessageId = normalizeClientMessageId(clientMessageId)

        chatMessageDao.findByDialogIdAndSenderUserIdAndClientMessageId(
            dialogId = dialogId,
            senderUserId = currentUser.userId,
            clientMessageId = normalizedClientMessageId,
        )?.let(chatDomainMapper::toChatMessage)?.let { return it }

        val normalizedBody = normalizeBody(body)
        val senderRole = chatDomainMapper.toSenderRole(currentUser.role)

        val savedMessage = try {
            chatMessageDao.saveAndFlush(
                ChatMessageDto(
                    dialogId = dialogId,
                    senderUserId = currentUser.userId,
                    senderRole = senderRole,
                    body = normalizedBody,
                    clientMessageId = normalizedClientMessageId,
                ),
            )
        } catch (ex: DataIntegrityViolationException) {
            chatMessageDao.findByDialogIdAndSenderUserIdAndClientMessageId(
                dialogId = dialogId,
                senderUserId = currentUser.userId,
                clientMessageId = normalizedClientMessageId,
            )?.let(chatDomainMapper::toChatMessage)?.let { return it }

            throw ex
        }

        val timestamp = savedMessage.createdAt ?: OffsetDateTime.now()

        dialog.lastMessageId = savedMessage.id
        dialog.lastMessagePreview = chatDomainMapper.buildPreview(normalizedBody)
        dialog.lastMessageAt = timestamp
        chatDialogDao.save(dialog)

        val participantState = chatParticipantStateDao.findByIdDialogIdAndIdUserId(
            dialogId = dialogId,
            userId = currentUser.userId,
        ) ?: throw IllegalStateException(
            "Chat participant state not found for dialog $dialogId and user ${currentUser.userId}",
        )

        participantState.lastReadMessageId = savedMessage.id
        participantState.lastReadAt = timestamp
        chatParticipantStateDao.save(participantState)

        return chatDomainMapper.toChatMessage(savedMessage)
    }

    private fun normalizeClientMessageId(
        value: String,
    ): String {
        val normalized = value.trim()

        if (normalized.isBlank()) {
            throw InteractionException.BadRequest("clientMessageId must not be blank")
        }

        if (normalized.length > 100) {
            throw InteractionException.BadRequest("clientMessageId must not exceed 100 characters")
        }

        return normalized
    }

    private fun normalizeBody(
        value: String,
    ): String {
        val normalized = value.trim()

        if (normalized.isBlank()) {
            throw InteractionException.BadRequest("Message body must not be blank")
        }

        if (normalized.length > 4000) {
            throw InteractionException.BadRequest("Message body must not exceed 4000 characters")
        }

        return normalized
    }
}
