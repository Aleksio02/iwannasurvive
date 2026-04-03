package ru.itplanet.trampline.interaction.chat.service

import jakarta.persistence.EntityNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogQueryDao
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListQuery
import ru.itplanet.trampline.interaction.chat.model.ChatDialogPage
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Service
@Transactional(readOnly = true)
class ChatDialogQueryServiceImpl(
    private val chatDialogQueryDao: ChatDialogQueryDao,
    private val chatAccessService: ChatAccessService,
) : ChatDialogQueryService {

    override fun getDialog(
        dialogId: Long,
        currentUser: AuthenticatedUser,
    ): ChatDialog {
        chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)

        return chatDialogQueryDao.findDialog(dialogId, currentUser.userId)
            ?: throw EntityNotFoundException("Chat dialog not found")
    }

    override fun getDialogs(
        currentUser: AuthenticatedUser,
        query: ChatDialogListQuery,
    ): ChatDialogPage {
        return chatDialogQueryDao.findDialogs(currentUser.userId, query)
    }
}
