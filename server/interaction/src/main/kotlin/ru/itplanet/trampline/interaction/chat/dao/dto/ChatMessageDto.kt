package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "chat_message")
open class ChatMessageDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "dialog_id", nullable = false)
    var dialogId: Long = 0

    @Column(name = "sender_user_id", nullable = false)
    var senderUserId: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_role", nullable = false, length = 32)
    var senderRole: ChatSenderRole = ChatSenderRole.APPLICANT

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 16)
    var messageType: ChatMessageType = ChatMessageType.TEXT

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    var body: String = ""

    @Column(name = "client_message_id", nullable = false, length = 100)
    var clientMessageId: String = ""

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null

    @Column(name = "edited_at")
    var editedAt: OffsetDateTime? = null

    @Column(name = "deleted_at")
    var deletedAt: OffsetDateTime? = null

    constructor()

    constructor(
        dialogId: Long,
        senderUserId: Long,
        senderRole: ChatSenderRole,
        body: String,
        clientMessageId: String,
        messageType: ChatMessageType = ChatMessageType.TEXT,
    ) {
        this.dialogId = dialogId
        this.senderUserId = senderUserId
        this.senderRole = senderRole
        this.body = body
        this.clientMessageId = clientMessageId
        this.messageType = messageType
    }
}

enum class ChatSenderRole {
    APPLICANT,
    EMPLOYER,
}

enum class ChatMessageType {
    TEXT,
}
