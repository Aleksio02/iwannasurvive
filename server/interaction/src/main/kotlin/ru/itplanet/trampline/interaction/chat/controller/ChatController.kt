package ru.itplanet.trampline.interaction.chat.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.interaction.chat.mapper.ChatRestMapper
import ru.itplanet.trampline.interaction.chat.model.request.GetChatDialogListRequest
import ru.itplanet.trampline.interaction.chat.model.request.GetChatMessagesRequest
import ru.itplanet.trampline.interaction.chat.model.request.ChatReactionRequest
import ru.itplanet.trampline.interaction.chat.model.request.EditChatMessageRequest
import ru.itplanet.trampline.interaction.chat.model.request.ForwardChatMessageRequest
import ru.itplanet.trampline.interaction.chat.model.request.MarkReadRequest
import ru.itplanet.trampline.interaction.chat.model.request.MarkUnreadRequest
import ru.itplanet.trampline.interaction.chat.model.request.SendChatMessageRequest
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogPageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatDialogResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatMessageResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatAttachmentDownloadUrlResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatOpportunityFilterResponse
import ru.itplanet.trampline.interaction.chat.model.response.ChatSearchMessagePageResponse
import ru.itplanet.trampline.interaction.chat.service.ChatArchiveService
import ru.itplanet.trampline.interaction.chat.service.ChatDialogQueryService
import ru.itplanet.trampline.interaction.chat.service.ChatLifecycleService
import ru.itplanet.trampline.interaction.chat.service.ChatMessageCommandService
import ru.itplanet.trampline.interaction.chat.service.ChatMessageQueryService
import ru.itplanet.trampline.interaction.chat.service.ChatPinService
import ru.itplanet.trampline.interaction.chat.service.ChatReadService
import ru.itplanet.trampline.interaction.chat.service.ChatReactionService
import ru.itplanet.trampline.interaction.chat.service.ChatRealtimeService
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
    private val chatReactionService: ChatReactionService,
    private val chatPinService: ChatPinService,
    private val chatRealtimeService: ChatRealtimeService,
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

    @GetMapping("/filter-options/opportunities")
    fun getOpportunityFilters(
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<ChatOpportunityFilterResponse> {
        return chatDialogQueryService.getOpportunityFilters(currentUser)
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
        val result = chatRealtimeService.handleSendMessage(
            dialogId = dialogId,
            currentUser = currentUser,
            clientMessageId = request.clientMessageId,
            body = request.body,
            replyToMessageId = request.replyToMessageId,
        )

        return chatRestMapper.toChatMessageResponse(result.message)
    }

    @PostMapping(
        "/{dialogId}/attachments",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun sendAttachment(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @RequestPart("file", required = false) file: MultipartFile?,
        @RequestPart("files", required = false) files: List<MultipartFile>?,
        @RequestParam clientMessageId: String,
        @RequestParam(required = false) body: String?,
        @RequestParam(required = false) replyToMessageId: Long?,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val result = chatRealtimeService.handleSendAttachment(
            dialogId = dialogId,
            currentUser = currentUser,
            clientMessageId = clientMessageId,
            body = body,
            files = collectAttachmentFiles(file, files),
            replyToMessageId = replyToMessageId,
        )

        return chatRestMapper.toChatMessageResponse(result.message)
    }

    @PatchMapping("/{dialogId}/messages/{messageId}")
    fun editMessage(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @Valid @RequestBody request: EditChatMessageRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val result = chatMessageCommandService.editMessage(dialogId, messageId, currentUser, request.body)
        chatRealtimeService.broadcastMessageUpdated(dialogId, result.message)
        chatRealtimeService.broadcastDialogUpdated(chatDialogQueryService.getDialog(dialogId, currentUser))
        return chatRestMapper.toChatMessageResponse(result.message)
    }

    @PatchMapping(
        "/{dialogId}/messages/{messageId}/content",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun editMessageContent(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @RequestParam(required = false) body: String?,
        @RequestParam(required = false) removeAttachmentIds: List<Long>?,
        @RequestPart("file", required = false) file: MultipartFile?,
        @RequestPart("files", required = false) files: List<MultipartFile>?,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val result = chatMessageCommandService.editMessageContent(
            dialogId = dialogId,
            messageId = messageId,
            currentUser = currentUser,
            body = body,
            removeAttachmentIds = removeAttachmentIds.orEmpty(),
            files = collectAttachmentFiles(file, files),
        )
        chatRealtimeService.broadcastMessageUpdated(dialogId, result.message)
        chatRealtimeService.broadcastDialogUpdated(chatDialogQueryService.getDialog(dialogId, currentUser))
        return chatRestMapper.toChatMessageResponse(result.message)
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/{dialogId}/messages/{messageId}/delete-for-me")
    fun deleteMessageForMe(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ) {
        chatMessageCommandService.deleteForMe(dialogId, messageId, currentUser)
        chatRealtimeService.broadcastMessageHidden(dialogId, currentUser.userId, messageId)
    }

    @PostMapping("/{dialogId}/messages/{messageId}/delete-for-everyone")
    fun deleteMessageForEveryone(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val result = chatMessageCommandService.deleteForEveryone(dialogId, messageId, currentUser)
        chatRealtimeService.broadcastMessageDeleted(dialogId, result.message)
        return chatRestMapper.toChatMessageResponse(result.message)
    }

    @PutMapping("/{dialogId}/messages/{messageId}/reaction")
    fun setReaction(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @Valid @RequestBody request: ChatReactionRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val message = chatReactionService.setReaction(dialogId, messageId, currentUser, request.reaction)
        chatRealtimeService.broadcastMessageReactionsUpdated(dialogId, message)
        return chatRestMapper.toChatMessageResponse(message)
    }

    @DeleteMapping("/{dialogId}/messages/{messageId}/reaction")
    fun deleteReaction(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val message = chatReactionService.deleteReaction(dialogId, messageId, currentUser)
        chatRealtimeService.broadcastMessageReactionsUpdated(dialogId, message)
        return chatRestMapper.toChatMessageResponse(message)
    }

    @PostMapping("/{dialogId}/messages/{messageId}/pin")
    fun pinMessage(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatDialogResponse {
        val dialog = chatPinService.pin(dialogId, messageId, currentUser)
        chatRealtimeService.broadcastDialogUpdated(dialog)
        return chatRestMapper.toChatDialogResponse(dialog)
    }

    @DeleteMapping("/{dialogId}/pinned-message")
    fun unpinMessage(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatDialogResponse {
        val dialog = chatPinService.unpin(dialogId, currentUser)
        chatRealtimeService.broadcastDialogUpdated(dialog)
        return chatRestMapper.toChatDialogResponse(dialog)
    }

    @PostMapping("/{sourceDialogId}/messages/{messageId}/forward")
    fun forwardMessage(
        @PathVariable @Positive(message = "Идентификатор исходного диалога должен быть положительным") sourceDialogId: Long,
        @PathVariable @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @Valid @RequestBody request: ForwardChatMessageRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatMessageResponse {
        val result = chatMessageCommandService.forwardMessage(
            sourceDialogId = sourceDialogId,
            messageId = messageId,
            targetDialogId = request.targetDialogId,
            currentUser = currentUser,
            clientMessageId = request.clientMessageId,
        )
        if (result.created) {
            chatRealtimeService.broadcastMessageCreated(request.targetDialogId, result.message)
        }
        return chatRestMapper.toChatMessageResponse(result.message)
    }

    @GetMapping("/{dialogId}/messages/search")
    fun searchMessages(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @RequestParam query: String,
        @RequestParam(defaultValue = "20") limit: Int,
        @RequestParam(required = false) cursor: Long?,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatSearchMessagePageResponse {
        return chatMessageQueryService.searchMessages(dialogId, currentUser, query, limit, cursor)
    }

    @GetMapping("/{dialogId}/messages/context")
    fun getMessageContext(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @RequestParam @Positive(message = "Идентификатор сообщения должен быть положительным") messageId: Long,
        @RequestParam(defaultValue = "25") before: Int,
        @RequestParam(defaultValue = "25") after: Int,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<ChatMessageResponse> {
        return chatMessageQueryService.getMessageContext(dialogId, currentUser, messageId, before, after)
            .map(chatRestMapper::toChatMessageResponse)
    }

    @GetMapping("/{dialogId}/attachments/{attachmentId}/download-url")
    fun getAttachmentDownloadUrl(
        @PathVariable
        @Positive(message = "Идентификатор диалога должен быть положительным")
        dialogId: Long,
        @PathVariable
        @Positive(message = "Идентификатор вложения должен быть положительным")
        attachmentId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatAttachmentDownloadUrlResponse {
        return chatMessageCommandService.getAttachmentDownloadUrl(
            dialogId = dialogId,
            attachmentId = attachmentId,
            currentUser = currentUser,
        )
    }

    private fun collectAttachmentFiles(file: MultipartFile?, files: List<MultipartFile>?): List<MultipartFile> {
        return listOfNotNull(file) + files.orEmpty()
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

    @PostMapping("/{dialogId}/unread")
    fun markUnread(
        @PathVariable @Positive(message = "Идентификатор диалога должен быть положительным") dialogId: Long,
        @Valid @RequestBody request: MarkUnreadRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ChatDialogResponse {
        chatReadService.markUnread(dialogId, currentUser, request.fromMessageId)
        chatRealtimeService.broadcastReadStateUpdated(dialogId, currentUser)
        return chatRestMapper.toChatDialogResponse(chatDialogQueryService.getDialog(dialogId, currentUser))
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
