package ru.itplanet.trampline.interaction.chat.mapper

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatMessageDto
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatSenderRole
import ru.itplanet.trampline.interaction.chat.model.ChatMessage
import ru.itplanet.trampline.interaction.dao.dto.ContactInfoApplicantProfileDto
import ru.itplanet.trampline.interaction.exception.InteractionForbiddenException

@Component
class ChatDomainMapper {

    fun toChatMessage(
        dto: ChatMessageDto,
    ): ChatMessage {
        val messageId = dto.id
            ?: throw IllegalStateException("Идентификатор сообщения чата не должен быть null")

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
            else -> throw InteractionForbiddenException(
                message = "Отправлять сообщения в чате могут только соискатель или работодатель",
                code = "chat_sender_role_not_allowed",
            )
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

        return fullName.ifBlank { "Соискатель #${applicant.userId}" }
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
