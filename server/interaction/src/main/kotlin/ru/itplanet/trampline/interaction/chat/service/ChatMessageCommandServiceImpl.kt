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
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatAttachmentKind
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageAttachmentDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageType
import ru.itplanet.trampline.interaction.chat.mapper.ChatDomainMapper
import ru.itplanet.trampline.interaction.chat.model.ChatMessageCommandResult
import ru.itplanet.trampline.interaction.chat.model.response.ChatAttachmentDownloadUrlResponse
import ru.itplanet.trampline.interaction.client.MediaServiceClient
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.security.AuthenticatedUser
import java.time.OffsetDateTime

@Service
class ChatMessageCommandServiceImpl(
    private val chatAccessService: ChatAccessService,
    private val chatDialogDao: ChatDialogDao,
    private val chatMessageDao: ChatMessageDao,
    private val chatMessageAttachmentDao: ChatMessageAttachmentDao,
    private val chatParticipantStateService: ChatParticipantStateService,
    private val chatDomainMapper: ChatDomainMapper,
    private val mediaServiceClient: MediaServiceClient,
) : ChatMessageCommandService {

    @Transactional
    override fun sendMessage(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String,
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
            message = chatDomainMapper.toChatMessage(savedMessage),
            created = true,
        )
    }

    @Transactional
    override fun sendAttachment(
        dialogId: Long,
        currentUser: AuthenticatedUser,
        clientMessageId: String,
        body: String?,
        file: MultipartFile,
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
        val uploadedFile = mediaServiceClient.upload(
            file = file,
            ownerUserId = currentUser.userId,
            kind = FileAssetKind.CHAT_ATTACHMENT,
            visibility = FileAssetVisibility.PRIVATE,
        )
        val attachmentKind = if (uploadedFile.mediaType.startsWith("image/")) {
            ChatAttachmentKind.IMAGE
        } else {
            ChatAttachmentKind.FILE
        }
        val message = ChatMessageDto(
            dialogId = dialogId,
            senderUserId = currentUser.userId,
            senderRole = chatDomainMapper.toSenderRole(currentUser.role),
            body = normalizedBody,
            clientMessageId = normalizedClientMessageId,
            messageType = if (normalizedBody == null) ChatMessageType.ATTACHMENT else ChatMessageType.MIXED,
        )
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

        val savedMessage = chatMessageDao.saveAndFlush(message)
        val savedMessageId = savedMessage.id
            ?: throw IllegalStateException("Идентификатор сохранённого сообщения чата не должен быть null")

        mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = uploadedFile.fileId,
                entityType = FileAttachmentEntityType.CHAT_MESSAGE,
                entityId = savedMessageId,
                attachmentRole = FileAttachmentRole.ATTACHMENT,
            ),
        )

        val timestamp = savedMessage.createdAt ?: OffsetDateTime.now()
        dialog.lastMessageId = savedMessageId
        dialog.lastMessagePreview = chatDomainMapper.buildPreview(
            body = normalizedBody,
            attachmentFileName = uploadedFile.originalFileName,
            isImage = attachmentKind == ChatAttachmentKind.IMAGE,
        )
        dialog.lastMessageAt = timestamp
        chatDialogDao.save(dialog)
        chatParticipantStateService.onMessageSent(
            dialog = dialog,
            senderUserId = currentUser.userId,
            messageId = savedMessageId,
            timestamp = timestamp,
        )

        return ChatMessageCommandResult(
            message = chatDomainMapper.toChatMessage(savedMessage),
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

        val attachment = chatMessageAttachmentDao.findByIdAndMessageDialogId(
            id = attachmentId,
            dialogId = dialogId,
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
}
