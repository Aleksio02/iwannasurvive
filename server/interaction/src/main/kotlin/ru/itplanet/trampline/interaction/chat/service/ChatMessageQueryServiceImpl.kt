package ru.itplanet.trampline.interaction.chat.service

import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.chat.model.ChatMessageSliceQuery
import ru.itplanet.trampline.interaction.chat.model.response.ChatSearchMessagePageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatSearchMessageResponse
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
@Transactional(readOnly = true)
class ChatMessageQueryServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatMessageDao: ChatMessageDao,
    private val chatDomainMapper: ChatDomainMapper,
    private val chatMessageEnrichmentService: ChatMessageEnrichmentService,
) : ChatMessageQueryService {

    override fun getMessages(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        query: ChatMessageSliceQuery,
    ): List<ChatMessage> {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)

        val pageable = PageRequest.of(0, query.limit)

        val messages = when {
            query.afterMessageId != null -> {
                chatMessageDao.findVisibleByDialogIdAndIdGreaterThanOrderByIdAsc(
                    dialogId = dialogId,
                    afterMessageId = query.afterMessageId,
                    currentUserId = currentUser.userId,
                    pageable = pageable,
                )
            }

            query.beforeMessageId != null -> {
                chatMessageDao.findVisibleByDialogIdAndIdLessThanOrderByIdDesc(
                    dialogId = dialogId,
                    beforeMessageId = query.beforeMessageId,
                    currentUserId = currentUser.userId,
                    pageable = pageable,
                ).asReversed()
            }

            else -> {
                chatMessageDao.findVisibleByDialogIdOrderByIdDesc(
                    dialogId = dialogId,
                    currentUserId = currentUser.userId,
                    pageable = pageable,
                ).asReversed()
            }
        }

        return chatMessageEnrichmentService.enrich(
            messages = messages.map(chatDomainMapper::toChatMessage),
            currentUserId = currentUser.userId,
        )
    }

    override fun searchMessages(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        query: String,
        limit: Int,
        cursor: Long?,
    ): ChatSearchMessagePageResponse {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)
        val normalizedQuery = query.trim()
        if (normalizedQuery.length !in 2..100) {
            throw InteractionBadRequestException(
                message = "Поисковый запрос должен быть от 2 до 100 символов",
                code = "chat_search_query_invalid",
            )
        }
        val normalizedLimit = limit.coerceIn(1, 50)
        val rows = chatMessageDao.searchVisibleMessages(
            dialogId = dialogId,
            currentUserId = currentUser.userId,
            query = normalizedQuery,
            cursor = cursor,
            pageable = PageRequest.of(0, normalizedLimit + 1),
        )
        val items = rows.take(normalizedLimit)
        return ChatSearchMessagePageResponse(
            items = items.map {
                ChatSearchMessageResponse(
                    messageId = it.id ?: throw IllegalStateException("Идентификатор сообщения чата не должен быть null"),
                    createdAt = it.createdAt,
                    senderUserId = it.senderUserId,
                    senderDisplayName = if (it.senderUserId == dialog.applicantUserId) {
                        dialog.applicantNameSnapshot
                    } else {
                        dialog.companyNameSnapshot
                    },
                    snippet = buildSnippet(it.body.orEmpty(), normalizedQuery),
                    messageType = it.messageType,
                )
            },
            nextCursor = rows.getOrNull(normalizedLimit)?.id?.toString(),
        )
    }

    override fun getMessageContext(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        messageId: Long,
        before: Int,
        after: Int,
    ): List<ChatMessage> {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)
        val target = chatMessageDao.findVisibleByIdAndDialogIdForUser(
            messageId = messageId,
            dialogId = dialogId,
            currentUserId = currentUser.userId,
        ) ?: throw InteractionNotFoundException(
            message = "Сообщение чата не найдено",
            code = "chat_message_not_found",
        )
        val olderLimit = before.coerceIn(0, 50)
        val afterLimit = after.coerceIn(0, 50)
        val older = if (olderLimit == 0) {
            emptyList()
        } else {
            chatMessageDao.findVisibleByDialogIdAndIdLessThanOrderByIdDesc(
                dialogId = dialogId,
                beforeMessageId = messageId,
                currentUserId = currentUser.userId,
                pageable = PageRequest.of(0, olderLimit),
            ).asReversed()
        }
        val newer = if (afterLimit == 0) {
            emptyList()
        } else {
            chatMessageDao.findVisibleByDialogIdAndIdGreaterThanOrderByIdAsc(
                dialogId = dialogId,
                afterMessageId = messageId,
                currentUserId = currentUser.userId,
                pageable = PageRequest.of(0, afterLimit),
            )
        }
        return chatMessageEnrichmentService.enrich(
            messages = (older + target + newer).map(chatDomainMapper::toChatMessage),
            currentUserId = currentUser.userId,
        )
    }

    private fun buildSnippet(body: String, query: String): String {
        val index = body.lowercase().indexOf(query.lowercase()).coerceAtLeast(0)
        val start = (index - 40).coerceAtLeast(0)
        val end = (index + query.length + 80).coerceAtMost(body.length)
        return body.substring(start, end).replace(Regex("\\s+"), " ").trim()
    }
}
