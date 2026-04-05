package ru.itplanet.trampline.interaction.chat.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.interaction.chat.mapper.ChatRestMapper
import ru.itplanet.trampline.interaction.chat.model.request.GetChatDialogListRequest
import ru.itplanet.trampline.interaction.chat.model.request.GetChatMessagesRequest
import ru.itplanet.trampline.interaction.chat.model.request.MarkReadRequest
import ru.itplanet.trampline.interaction.chat.model.request.SendChatMessageRequest
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogPageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatMessageResponse
import ru.itplanet.trampline.interaction.chat.service.ChatArchiveService
import ru.itplanet.trampline.interaction.chat.service.ChatDialogQueryService
import ru.itplanet.trampline.interaction.chat.service.ChatLifecycleService
import ru.itplanet.trampline.interaction.chat.service.ChatMessageCommandService
import ru.itplanet.trampline.interaction.chat.service.ChatMessageQueryService
import ru.itplanet.trampline.interaction.chat.service.ChatReadService
import ru.itplanet.trampline.interaction.security.AuthenticatedUser

@Validated
@RestController
@RequestMapping("/api/chats")
class ChatController(
    private val chatLifecycleService: ChatLifecycleService,
    private val chatDialogQueryService: ChatDialogQueryService,
    private val chatMessageQueryService: ChatMessageQueryService,
    private val chatMessageCommandService: ChatMessageCommandService,
    private val chatReadService: ChatReadService,
    private val chatArchiveService: ChatArchiveService,
    private val chatRestMapper: ChatRestMapper,
) {

    @PostMapping("/by-response/{responseId}/ensure")
    fun ensureDialogByResponse(
        @PathVariable
        @Positive(message = "Идентификатор отклика должен быть положительным")
        responseId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatDialogResponse {
        val dialog = chatLifecycleService.ensureDialogByResponse(responseId, currentUser)
        return chatRestMapper.toChatDialogResponse(dialog)
    }

    @GetMapping
    fun getDialogs(
        @Valid @ModelAttribute request: GetChatDialogListRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatDialogPageResponse {
        val query = chatRestMapper.toChatDialogListQuery(request)
        val page = chatDialogQueryService.getDialogs(currentUser, query)
        return chatRestMapper.toChatDialogPageResponse(page)
    }

    @GetMapping("/{dialogId}")
    fun getDialog(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatDialogResponse {
        val dialog = chatDialogQueryService.getDialog(dialogId, currentUser)
        return chatRestMapper.toChatDialogResponse(dialog)
    }

    @GetMapping("/{dialogId}/messages")
    fun getMessages(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @Valid @ModelAttribute request: GetChatMessagesRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<ChatMessageResponse> {
        val query = chatRestMapper.toChatMessageSliceQuery(request)

        return chatMessageQueryService.getMessages(
            dialogId = dialogId,
            currentUser = currentUser,
            query = query,
        ).map(chatRestMapper::toChatMessageResponse)
    }

    @PostMapping("/{dialogId}/messages")
    fun sendMessage(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @Valid @RequestBody request: SendChatMessageRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val message = chatMessageCommandService.sendMessage(
            dialogId = dialogId,
            currentUser = currentUser,
            clientMessageId = request.clientMessageId,
            body = request.body,
        )

        return chatRestMapper.toChatMessageResponse(message)
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/{dialogId}/read")
    fun markRead(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @Valid @RequestBody request: MarkReadRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ) {
        chatReadService.markRead(
            dialogId = dialogId,
            currentUser = currentUser,
            lastReadMessageId = request.lastReadMessageId,
        )
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/{dialogId}/archive")
    fun archiveDialog(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ) {
        chatArchiveService.archive(dialogId, currentUser)
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @DeleteMapping("/{dialogId}/archive")
    fun unarchiveDialog(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ) {
        chatArchiveService.unarchive(dialogId, currentUser)
    }
}
