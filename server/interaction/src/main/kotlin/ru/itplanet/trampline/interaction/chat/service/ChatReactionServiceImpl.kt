package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageReactionDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageReactionDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageReactionId
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
class ChatReactionServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatMessageDao: ChatMessageDao,
    private val chatMessageReactionDao: ChatMessageReactionDao,
    private val chatDomainMapper: ChatDomainMapper,
    private val chatMessageEnrichmentService: ChatMessageEnrichmentService,
) : ChatReactionService {

    @Transactional
    override fun setReaction(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
        reaction: String,
    ): ChatMessage {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        val message = requireMessage(dialogId, messageId)
        if (message.deletedAt != null) {
            throw InteractionBadRequestException("Нельзя реагировать на удалённое сообщение", "chat_reaction_deleted_message")
        }
        val normalizedReaction = reaction.trim()
        if (!ChatMessageEnrichmentService.ALLOWED_REACTIONS.contains(normalizedReaction)) {
            throw InteractionBadRequestException("Реакция недоступна", "chat_reaction_not_allowed")
        }
        val id = ChatMessageReactionId(messageId, currentUser.userId)
        val row = chatMessageReactionDao.findById(id).orElse(ChatMessageReactionDto(messageId, currentUser.userId, normalizedReaction))
        row.reaction = normalizedReaction
        chatMessageReactionDao.save(row)
        return chatMessageEnrichmentService.enrich(chatDomainMapper.toChatMessage(message), currentUser.userId)
    }

    @Transactional
    override fun deleteReaction(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
    ): ChatMessage {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        val message = requireMessage(dialogId, messageId)
        val reactionId = ChatMessageReactionId(messageId, currentUser.userId)
        if (chatMessageReactionDao.existsById(reactionId)) {
            chatMessageReactionDao.deleteById(reactionId)
        }
        return chatMessageEnrichmentService.enrich(chatDomainMapper.toChatMessage(message), currentUser.userId)
    }

    private fun requireMessage(dialogId: Long, messageId: Long) =
        chatMessageDao.findById(messageId).orElseThrow {
            InteractionNotFoundException("Сообщение чата не найдено", "chat_message_not_found")
        }.also {
            if (it.dialogId != dialogId) {
                throw InteractionNotFoundException("Сообщение чата не найдено", "chat_message_not_found")
            }
        }
}
