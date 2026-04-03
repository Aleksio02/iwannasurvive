package ru.itplanet.trampline.interaction.chat.mapper

import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatSenderRole
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.dao.dto.ContactInfoApplicantProfileDto

@Component
class ChatDomainMapper {

    fun toChatMessage(
        dto: ChatMessageDto,
    ): ChatMessage {
        val messageId = dto.id
            ?: throw IllegalStateException("Chat message id must not be null")

        return ChatMessage(
            id = messageId,
            dialogId = dto.dialogId,
            senderUserId = dto.senderUserId,
            senderRole = toRole(dto.senderRole),
            messageType = dto.messageType,
            body = dto.body,
            clientMessageId = dto.clientMessageId,
            createdAt = dto.createdAt,
            editedAt = dto.editedAt,
            deletedAt = dto.deletedAt,
        )
    }

    fun toSenderRole(
        role: Role,
    ): ChatSenderRole {
        return when (role) {
            Role.APPLICANT -> ChatSenderRole.APPLICANT
            Role.EMPLOYER -> ChatSenderRole.EMPLOYER
            else -> throw AccessDeniedException("Only applicant or employer can send chat messages")
        }
    }

    fun buildApplicantDisplayName(
        applicant: ContactInfoApplicantProfileDto,
    ): String {
        val fullName = listOfNotNull(
            applicant.firstName.takeIf { it.isNotBlank() },
            applicant.middleName?.takeIf { it.isNotBlank() },
            applicant.lastName.takeIf { it.isNotBlank() },
        ).joinToString(" ").trim()

        return fullName.ifBlank { "Applicant #${applicant.userId}" }
    }

    fun buildPreview(
        body: String,
    ): String {
        return body
            .replace(Regex("\\s+"), " ")
            .trim()
            .take(300)
    }

    private fun toRole(
        senderRole: ChatSenderRole,
    ): Role {
        return when (senderRole) {
            ChatSenderRole.APPLICANT -> Role.APPLICANT
            ChatSenderRole.EMPLOYER -> Role.EMPLOYER
        }
    }
}
