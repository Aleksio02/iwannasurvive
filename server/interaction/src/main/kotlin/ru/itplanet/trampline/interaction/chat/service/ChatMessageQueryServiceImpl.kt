package ru.itplanet.trampline.interaction.chat.service

import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.chat.model.ChatMessageSliceQuery
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
@Transactional(readOnly = true)
class ChatMessageQueryServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatMessageDao: ChatMessageDao,
    private val chatDomainMapper: ChatDomainMapper,
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
                chatMessageDao.findByDialogIdAndIdGreaterThanOrderByIdAsc(
                    dialogId = dialogId,
                    afterMessageId = query.afterMessageId,
                    pageable = pageable,
                )
            }

            query.beforeMessageId != null -> {
                chatMessageDao.findByDialogIdAndIdLessThanOrderByIdDesc(
                    dialogId = dialogId,
                    beforeMessageId = query.beforeMessageId,
                    pageable = pageable,
                ).asReversed()
            }

            else -> {
                chatMessageDao.findByDialogIdOrderByIdDesc(
                    dialogId = dialogId,
                    pageable = pageable,
                ).asReversed()
            }
        }

        return messages.map(chatDomainMapper::toChatMessage)
    }
}
