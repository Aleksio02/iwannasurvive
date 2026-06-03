package ru.itplanet.trampline.interaction.chat.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageAttachmentDao
import ru.itplanet.trampline.interaction.chat.dao.ChatDialogDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageDao
import ru.itplanet.trampline.interaction.chat.dao.ChatMessageUserStateDao
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatAttachmentKind
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageAttachmentDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageUserStateDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageUserStateId
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.chat.model.response.ChatAttachmentDownloadUrlResponse
import ru.itplanet.trampline.interaction.client.MediaServiceClient
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import ru.itplanet.trampline.interaction.exception.InteractionForbiddenException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatMessageCommandServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatDialogDao: ChatDialogDao,
    private val chatMessageDao: ChatMessageDao,
    private val chatMessageAttachmentDao: ChatMessageAttachmentDao,
    private val chatMessageUserStateDao: ChatMessageUserStateDao,
    private val chatParticipantStateService: ChatParticipantStateService,
    private val chatDomainMapper: ChatDomainMapper,
    private val chatMessageEnrichmentService: ChatMessageEnrichmentService,
    private val mediaServiceClient: MediaServiceClient,
) : ChatMessageCommandService {
    private companion object {
        const val MAX_MESSAGE_ATTACHMENTS = 10
    }

    @Transactional
    override fun sendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
        replyToMessageId: Long?,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)

        val normalizedClientMessageId = normalizeClientMessageId(clientMessageId)

        chatMessageDao.findByDialogIdAndSenderUserIdAndClientMessageId(
            dialogId = dialogId,
            senderUserId = currentUser.userId,
            clientMessageId = normalizedClientMessageId,
        )?.let(chatDomainMapper::toChatMessage)?.let {
            return ChatMessageCommandResult(
                message = it,
                created = false,
            )
        }

        val normalizedBody = normalizeBody(body)
        validateReplyToMessage(dialogId, currentUser.userId, replyToMessageId)
        val senderRole = chatDomainMapper.toSenderRole(currentUser.role)

        val savedMessage = try {
            chatMessageDao.saveAndFlush(
                ChatMessageDto(
                    dialogId = dialogId,
                    senderUserId = currentUser.userId,
                    senderRole = senderRole,
                    body = normalizedBody,
                    clientMessageId = normalizedClientMessageId,
                    replyToMessageId = replyToMessageId,
                ),
            )
        } catch (ex: DataIntegrityViolationException) {
            chatMessageDao.findByDialogIdAndSenderUserIdAndClientMessageId(
                dialogId = dialogId,
                senderUserId = currentUser.userId,
                clientMessageId = normalizedClientMessageId,
            )?.let(chatDomainMapper::toChatMessage)?.let {
                return ChatMessageCommandResult(
                    message = it,
                    created = false,
                )
            }

            throw ex
        }

        val savedMessageId = savedMessage.id
            ?: throw IllegalStateException("Идентификатор сохранённого сообщения чата не должен быть null")

        val timestamp = savedMessage.createdAt ?: OffsetDateTime.now()

        dialog.lastMessageId = savedMessageId
        dialog.lastMessagePreview = chatDomainMapper.buildPreview(normalizedBody)
        dialog.lastMessageAt = timestamp
        chatDialogDao.save(dialog)

        chatParticipantStateService.onMessageSent(
            dialog = dialog,
            senderUserId = currentUser.userId,
            messageId = savedMessageId,
            timestamp = timestamp,
        )

        return ChatMessageCommandResult(
            message = chatMessageEnrichmentService.enrich(
                chatDomainMapper.toChatMessage(savedMessage),
                currentUser.userId,
            ),
            created = true,
        )
    }

    @Transactional
    override fun sendAttachment(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String?,
        files: List<MultipartFile>,
        replyToMessageId: Long?,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)

        val normalizedClientMessageId = normalizeClientMessageId(clientMessageId)
        chatMessageDao.findByDialogIdAndSenderUserIdAndClientMessageId(
            dialogId = dialogId,
            senderUserId = currentUser.userId,
            clientMessageId = normalizedClientMessageId,
        )?.let(chatDomainMapper::toChatMessage)?.let {
            return ChatMessageCommandResult(message = it, created = false)
        }

        val normalizedBody = normalizeOptionalBody(body)
        val normalizedFiles = normalizeAttachmentFiles(files)
        validateReplyToMessage(dialogId, currentUser.userId, replyToMessageId)
        val uploadedFiles = normalizedFiles.map { uploadChatAttachment(it, currentUser.userId) }
        val message = ChatMessageDto(
            dialogId = dialogId,
            senderUserId = currentUser.userId,
            senderRole = chatDomainMapper.toSenderRole(currentUser.role),
            body = normalizedBody,
            clientMessageId = normalizedClientMessageId,
            messageType = if (normalizedBody == null) ChatMessageType.ATTACHMENT else ChatMessageType.MIXED,
            replyToMessageId = replyToMessageId,
        )
        uploadedFiles.forEach { uploadedFile ->
            message.attachments.add(
                ChatMessageAttachmentDto().apply {
                    this.message = message
                    fileId = uploadedFile.fileId
                    originalFileName = uploadedFile.originalFileName
                    mediaType = uploadedFile.mediaType
                    sizeBytes = uploadedFile.sizeBytes
                    this.attachmentKind = toAttachmentKind(uploadedFile.mediaType)
                },
            )
        }

        val savedMessage = chatMessageDao.saveAndFlush(message)
        val savedMessageId = savedMessage.id
            ?: throw IllegalStateException("Идентификатор сохранённого сообщения чата не должен быть null")

        uploadedFiles.forEach { uploadedFile ->
            mediaServiceClient.createAttachment(
                InternalCreateFileAttachmentRequest(
                    fileId = uploadedFile.fileId,
                    entityType = FileAttachmentEntityType.CHAT_MESSAGE,
                    entityId = savedMessageId,
                    attachmentRole = FileAttachmentRole.ATTACHMENT,
                ),
            )
        }

        val timestamp = savedMessage.createdAt ?: OffsetDateTime.now()
        val previewAttachment = savedMessage.attachments.firstOrNull()
        dialog.lastMessageId = savedMessageId
        dialog.lastMessagePreview = buildAttachmentPreview(normalizedBody, previewAttachment, savedMessage.attachments.size)
        dialog.lastMessageAt = timestamp
        chatDialogDao.save(dialog)
        chatParticipantStateService.onMessageSent(
            dialog = dialog,
            senderUserId = currentUser.userId,
            messageId = savedMessageId,
            timestamp = timestamp,
        )

        return ChatMessageCommandResult(
            message = chatMessageEnrichmentService.enrich(
                chatDomainMapper.toChatMessage(savedMessage),
                currentUser.userId,
            ),
            created = true,
        )
    }

    @Transactional
    override fun editMessage(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
        body: String,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        val message = requireVisibleMessageInDialog(dialogId, messageId, currentUser.userId)
        if (message.senderUserId != currentUser.userId) {
            throw InteractionForbiddenException(
                message = "Редактировать можно только своё сообщение",
                code = "chat_message_edit_own_required",
            )
        }
        if (message.deletedAt != null) {
            throw InteractionBadRequestException(
                message = "Удалённое сообщение нельзя редактировать",
                code = "chat_message_deleted",
            )
        }

        val normalizedBody = normalizeBody(body)
        if (message.messageType == ChatMessageType.ATTACHMENT && message.attachments.isEmpty()) {
            throw InteractionBadRequestException(
                message = "Сообщение нельзя редактировать",
                code = "chat_message_edit_not_allowed",
            )
        }
        message.body = normalizedBody
        if (message.messageType == ChatMessageType.ATTACHMENT) {
            message.messageType = ChatMessageType.MIXED
        }
        message.editedAt = OffsetDateTime.now()
        val saved = chatMessageDao.saveAndFlush(message)

        if (dialog.lastMessageId == messageId) {
            dialog.lastMessagePreview = chatDomainMapper.buildPreview(
                body = normalizedBody,
                attachmentFileName = message.attachments.firstOrNull()?.originalFileName,
                isImage = message.attachments.firstOrNull()?.attachmentKind == ChatAttachmentKind.IMAGE,
            )
            chatDialogDao.save(dialog)
        }

        return ChatMessageCommandResult(
            message = chatMessageEnrichmentService.enrich(chatDomainMapper.toChatMessage(saved), currentUser.userId),
            created = false,
        )
    }

    @Transactional
    override fun editMessageContent(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
        body: String?,
        removeAttachmentIds: List<Long>,
        files: List<MultipartFile>,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanWrite(dialog, currentUser)
        val message = requireVisibleMessageInDialog(dialogId, messageId, currentUser.userId)
        if (message.senderUserId != currentUser.userId) {
            throw InteractionForbiddenException(
                message = "Редактировать можно только своё сообщение",
                code = "chat_message_edit_own_required",
            )
        }
        if (message.deletedAt != null) {
            throw InteractionBadRequestException(
                message = "Удалённое сообщение нельзя редактировать",
                code = "chat_message_deleted",
            )
        }

        val normalizedBody = normalizeOptionalBody(body)
        val normalizedFiles = files.filter { !it.isEmpty }
        if (normalizedFiles.size > MAX_MESSAGE_ATTACHMENTS) {
            throw InteractionBadRequestException(
                message = "К сообщению можно прикрепить не больше $MAX_MESSAGE_ATTACHMENTS файлов",
                code = "chat_attachment_limit_exceeded",
            )
        }
        val messageAttachmentIds = message.attachments.mapNotNull { it.id }.toSet()
        val requestedRemoveIds = removeAttachmentIds.toSet()
        if (!messageAttachmentIds.containsAll(requestedRemoveIds)) {
            throw InteractionNotFoundException(
                message = "Вложение чата не найдено",
                code = "chat_attachment_not_found",
            )
        }

        if (requestedRemoveIds.isNotEmpty()) {
            message.attachments.removeIf { it.id in requestedRemoveIds }
        }

        if (message.attachments.size + normalizedFiles.size > MAX_MESSAGE_ATTACHMENTS) {
            throw InteractionBadRequestException(
                message = "К сообщению можно прикрепить не больше $MAX_MESSAGE_ATTACHMENTS файлов",
                code = "chat_attachment_limit_exceeded",
            )
        }

        if (normalizedFiles.isNotEmpty()) {
            val messageIdValue = message.id
                ?: throw IllegalStateException("Идентификатор сообщения чата не должен быть null")
            val uploadedFiles = normalizedFiles.map { uploadChatAttachment(it, currentUser.userId) }
            uploadedFiles.forEach { uploadedFile ->
                val attachmentKind = toAttachmentKind(uploadedFile.mediaType)
                message.attachments.add(
                    ChatMessageAttachmentDto().apply {
                        this.message = message
                        fileId = uploadedFile.fileId
                        originalFileName = uploadedFile.originalFileName
                        mediaType = uploadedFile.mediaType
                        sizeBytes = uploadedFile.sizeBytes
                        this.attachmentKind = attachmentKind
                    },
                )
                mediaServiceClient.createAttachment(
                    InternalCreateFileAttachmentRequest(
                        fileId = uploadedFile.fileId,
                        entityType = FileAttachmentEntityType.CHAT_MESSAGE,
                        entityId = messageIdValue,
                        attachmentRole = FileAttachmentRole.ATTACHMENT,
                    ),
                )
            }
        }

        if (normalizedBody == null && message.attachments.isEmpty()) {
            throw InteractionBadRequestException(
                message = "Добавьте текст или файл",
                code = "chat_message_empty",
            )
        }

        message.body = normalizedBody
        message.messageType = when {
            normalizedBody != null && message.attachments.isNotEmpty() -> ChatMessageType.MIXED
            normalizedBody != null -> ChatMessageType.TEXT
            else -> ChatMessageType.ATTACHMENT
        }
        message.editedAt = OffsetDateTime.now()
        val saved = chatMessageDao.saveAndFlush(message)

        if (dialog.lastMessageId == messageId) {
            dialog.lastMessagePreview = buildAttachmentPreview(
                body = saved.body,
                attachment = saved.attachments.firstOrNull(),
                attachmentCount = saved.attachments.size,
            )
            chatDialogDao.save(dialog)
        }

        return ChatMessageCommandResult(
            message = chatMessageEnrichmentService.enrich(chatDomainMapper.toChatMessage(saved), currentUser.userId),
            created = false,
        )
    }

    private fun normalizeAttachmentFiles(files: List<MultipartFile>): List<MultipartFile> {
        val normalizedFiles = files.filter { !it.isEmpty }
        if (normalizedFiles.isEmpty()) {
            throw InteractionBadRequestException(
                message = "Добавьте файл",
                code = "chat_attachment_required",
            )
        }
        if (normalizedFiles.size > MAX_MESSAGE_ATTACHMENTS) {
            throw InteractionBadRequestException(
                message = "К сообщению можно прикрепить не больше $MAX_MESSAGE_ATTACHMENTS файлов",
                code = "chat_attachment_limit_exceeded",
            )
        }
        return normalizedFiles
    }

    private fun uploadChatAttachment(file: MultipartFile, ownerUserId: Long) =
        mediaServiceClient.upload(
            file = file,
            ownerUserId = ownerUserId,
            kind = FileAssetKind.CHAT_ATTACHMENT,
            visibility = FileAssetVisibility.PRIVATE,
        )

    private fun toAttachmentKind(mediaType: String): ChatAttachmentKind {
        return if (mediaType.startsWith("image/")) ChatAttachmentKind.IMAGE else ChatAttachmentKind.FILE
    }

    private fun buildAttachmentPreview(
        body: String?,
        attachment: ChatMessageAttachmentDto?,
        attachmentCount: Int,
    ): String {
        if (attachmentCount > 1 && body == null) {
            return "$attachmentCount вложений"
        }
        return chatDomainMapper.buildPreview(
            body = body,
            attachmentFileName = attachment?.originalFileName,
            isImage = attachment?.attachmentKind == ChatAttachmentKind.IMAGE,
        )
    }

    @Transactional
    override fun deleteForMe(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
    ) {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)
        requireMessageInDialog(dialogId, messageId)

        val id = ChatMessageUserStateId(messageId, currentUser.userId)
        val state = chatMessageUserStateDao.findById(id)
            .orElse(ChatMessageUserStateDto(messageId, currentUser.userId, null))
        state.hiddenAt = OffsetDateTime.now()
        chatMessageUserStateDao.save(state)
    }

    @Transactional
    override fun deleteForEveryone(
        dialogId: Long,
        messageId: Long,
        currentUser: AuthenticatedUser,
    ): ChatMessageCommandResult {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)
        val message = requireVisibleMessageInDialog(dialogId, messageId, currentUser.userId)
        if (message.senderUserId != currentUser.userId) {
            throw InteractionForbiddenException(
                message = "Удалить сообщение у всех может только отправитель",
                code = "chat_message_delete_own_required",
            )
        }
        if (message.deletedAt == null) {
            message.deletedAt = OffsetDateTime.now()
        }
        val saved = chatMessageDao.save(message)

        if (dialog.lastMessageId == messageId) {
            dialog.lastMessagePreview = "Сообщение удалено"
            chatDialogDao.save(dialog)
        }

        return ChatMessageCommandResult(
            message = chatMessageEnrichmentService.enrich(chatDomainMapper.toChatMessage(saved), currentUser.userId),
            created = false,
        )
    }

    @Transactional
    override fun forwardMessage(
        sourceDialogId: Long,
        messageId: Long,
        targetDialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
    ): ChatMessageCommandResult {
        val sourceDialog = chatAccessService.assertDialogParticipant(sourceDialogId, currentUser.userId)
        chatAccessService.assertCanRead(sourceDialog, currentUser)
        val targetDialog = chatAccessService.assertDialogParticipant(targetDialogId, currentUser.userId)
        chatAccessService.assertCanRead(targetDialog, currentUser)
        val normalizedClientMessageId = normalizeClientMessageId(clientMessageId)

        chatMessageDao.findByDialogIdAndSenderUserIdAndClientMessageId(
            dialogId = targetDialogId,
            senderUserId = currentUser.userId,
            clientMessageId = normalizedClientMessageId,
        )?.let { existingMessage ->
            return ChatMessageCommandResult(
                message = chatMessageEnrichmentService.enrich(
                    chatDomainMapper.toChatMessage(existingMessage),
                    currentUser.userId,
                ),
                created = false,
            )
        }

        chatAccessService.assertCanWrite(targetDialog, currentUser)
        val source = requireVisibleMessageInDialog(sourceDialogId, messageId, currentUser.userId)
        if (source.deletedAt != null) {
            throw InteractionBadRequestException(
                message = "Сообщение нельзя переслать",
                code = "chat_message_forward_not_allowed",
            )
        }
        val senderRole = chatDomainMapper.toSenderRole(currentUser.role)
        val senderName = when (source.senderUserId) {
            sourceDialog.applicantUserId -> sourceDialog.applicantNameSnapshot
            sourceDialog.employerUserId -> sourceDialog.companyNameSnapshot
            else -> "Участник"
        }

        val forwarded = ChatMessageDto(
            dialogId = targetDialogId,
            senderUserId = currentUser.userId,
            senderRole = senderRole,
            body = source.body,
            clientMessageId = normalizedClientMessageId,
            messageType = source.messageType,
            forwardedFromMessageId = source.id,
            forwardedFromSenderName = senderName,
        )
        source.attachments.forEach { attachment ->
            forwarded.attachments.add(
                ChatMessageAttachmentDto().apply {
                    this.message = forwarded
                    fileId = attachment.fileId
                    originalFileName = attachment.originalFileName
                    mediaType = attachment.mediaType
                    sizeBytes = attachment.sizeBytes
                    attachmentKind = attachment.attachmentKind
                },
            )
        }
        val saved = chatMessageDao.saveAndFlush(forwarded)
        val savedMessageId = saved.id ?: throw IllegalStateException("Идентификатор сохранённого сообщения чата не должен быть null")
        val timestamp = saved.createdAt ?: OffsetDateTime.now()
        targetDialog.lastMessageId = savedMessageId
        targetDialog.lastMessagePreview = chatDomainMapper.buildPreview(
            body = saved.body,
            attachmentFileName = saved.attachments.firstOrNull()?.originalFileName,
            isImage = saved.attachments.firstOrNull()?.attachmentKind == ChatAttachmentKind.IMAGE,
        )
        targetDialog.lastMessageAt = timestamp
        chatDialogDao.save(targetDialog)
        chatParticipantStateService.onMessageSent(targetDialog, currentUser.userId, savedMessageId, timestamp)

        return ChatMessageCommandResult(
            message = chatMessageEnrichmentService.enrich(chatDomainMapper.toChatMessage(saved), currentUser.userId),
            created = true,
        )
    }

    @Transactional(readOnly = true)
    override fun getAttachmentDownloadUrl(
        dialogId: Long,
        attachmentId: Long,
        currentUser: AuthenticatedUser,
    ): ChatAttachmentDownloadUrlResponse {
        val dialog = chatAccessService.assertDialogParticipant(dialogId, currentUser.userId)
        chatAccessService.assertCanRead(dialog, currentUser)

        val attachment = chatMessageAttachmentDao.findVisibleByIdAndMessageDialogIdForUser(
            id = attachmentId,
            dialogId = dialogId,
            currentUserId = currentUser.userId,
        ) ?: throw InteractionNotFoundException(
            message = "Вложение чата не найдено",
            code = "chat_attachment_not_found",
        )
        val downloadUrl = mediaServiceClient.getDownloadUrl(attachment.fileId)

        return ChatAttachmentDownloadUrlResponse(
            url = downloadUrl.url,
            expiresAt = downloadUrl.expiresAt,
        )
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

    private fun normalizeOptionalBody(
        value: String?,
    ): String? {
        val normalized = value?.trim()?.takeIf { it.isNotBlank() }

        if (normalized != null && normalized.length > 4000) {
            throw InteractionBadRequestException(
                message = "Текст сообщения не должен превышать 4000 символов",
                code = "chat_message_body_too_long",
            )
        }

        return normalized
    }

    private fun requireMessageInDialog(
        dialogId: Long,
        messageId: Long,
    ): ChatMessageDto {
        val message = chatMessageDao.findById(messageId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Сообщение чата не найдено",
                    code = "chat_message_not_found",
                )
            }
        if (message.dialogId != dialogId) {
            throw InteractionNotFoundException(
                message = "Сообщение чата не найдено",
                code = "chat_message_not_found",
            )
        }
        return message
    }

    private fun requireVisibleMessageInDialog(
        dialogId: Long,
        messageId: Long,
        currentUserId: Long,
    ): ChatMessageDto {
        return chatMessageDao.findVisibleByIdAndDialogIdForUser(
            messageId = messageId,
            dialogId = dialogId,
            currentUserId = currentUserId,
        ) ?: throw InteractionNotFoundException(
            message = "Сообщение чата не найдено",
            code = "chat_message_not_found",
        )
    }

    private fun validateReplyToMessage(
        dialogId: Long,
        currentUserId: Long,
        replyToMessageId: Long?,
    ) {
        if (replyToMessageId == null) return
        requireVisibleMessageInDialog(dialogId, replyToMessageId, currentUserId)
    }
}
