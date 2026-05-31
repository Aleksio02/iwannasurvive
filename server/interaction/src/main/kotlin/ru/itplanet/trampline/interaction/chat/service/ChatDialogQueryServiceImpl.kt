package ru.itplanet.trampline.interaction.chat.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogQueryDao
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListQuery
import ru.itplanet.trampline.interaction.chat.model.ChatDialogPage
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
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
            ?: throw InteractionNotFoundException(
                message = "Диалог чата не найден",
                code = "chat_dialog_not_found",
            )
    }

    override fun getDialogs(
        currentUser: AuthenticatedUser,
        query: ChatDialogListQuery,
    ): ChatDialogPage {
        return chatDialogQueryDao.findDialogs(currentUser.userId, query)
    }
}
