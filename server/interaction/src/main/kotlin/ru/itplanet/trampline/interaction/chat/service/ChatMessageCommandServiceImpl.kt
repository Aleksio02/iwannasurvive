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
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
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

        val savedMessageId = savedMessage.id
            ?: throw IllegalStateException("Идентификатор сохранённого сообщения чата не должен быть null")

        val timestamp = savedMessage.createdAt ?: OffsetDateTime.now()

        dialog.lastMessageId = savedMessageId
        dialog.lastMessagePreview = chatDomainMapper.buildPreview(normalizedBody)
        dialog.lastMessageAt = timestamp
        chatDialogDao.save(dialog)

        val participantState = chatParticipantStateDao.findByIdDialogIdAndIdUserId(
            dialogId = dialogId,
            userId = currentUser.userId,
        ) ?: throw IllegalStateException(
            "Состояние участника чата не найдено для диалога $dialogId и пользователя ${currentUser.userId}",
        )

        participantState.lastReadMessageId = savedMessageId
        participantState.lastReadAt = timestamp
        chatParticipantStateDao.save(participantState)

        return chatDomainMapper.toChatMessage(savedMessage)
    }

    private fun normalizeClientMessageId(
        value: String,
    ): String {
        val normalized = value.trim()

        if (normalized.isBlank()) {
            throw InteractionBadRequestException(
                message = "clientMessageId обязателен",
                code = "chat_client_message_id_blank",
            )
        }

        if (normalized.length > 100) {
            throw InteractionBadRequestException(
                message = "clientMessageId не должен превышать 100 символов",
                code = "chat_client_message_id_too_long",
            )
        }

        return normalized
    }

    private fun normalizeBody(
        value: String,
    ): String {
        val normalized = value.trim()

        if (normalized.isBlank()) {
            throw InteractionBadRequestException(
                message = "Текст сообщения не должен быть пустым",
                code = "chat_message_body_blank",
            )
        }

        if (normalized.length > 4000) {
            throw InteractionBadRequestException(
                message = "Текст сообщения не должен превышать 4000 символов",
                code = "chat_message_body_too_long",
            )
        }

        return normalized
    }
}
