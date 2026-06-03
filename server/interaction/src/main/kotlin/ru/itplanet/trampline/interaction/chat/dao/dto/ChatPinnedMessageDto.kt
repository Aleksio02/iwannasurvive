package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "chat_pinned_message")
open class ChatPinnedMessageDto {
    @Id
    @Column(name = "dialog_id")
    var dialogId: Long = 0

    @Column(name = "message_id", nullable = false)
    var messageId: Long = 0

    @Column(name = "pinned_by_user_id", nullable = false)
    var pinnedByUserId: Long = 0

    @CreationTimestamp
    @Column(name = "pinned_at", nullable = false, updatable = false)
    var pinnedAt: OffsetDateTime? = null

    constructor()

    constructor(dialogId: Long, messageId: Long, pinnedByUserId: Long) {
        this.dialogId = dialogId
        this.messageId = messageId
        this.pinnedByUserId = pinnedByUserId
    }
}
