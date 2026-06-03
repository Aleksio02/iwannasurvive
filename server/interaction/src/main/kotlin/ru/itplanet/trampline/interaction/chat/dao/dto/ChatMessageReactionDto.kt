package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.io.Serializable
import java.time.OffsetDateTime

@Embeddable
data class ChatMessageReactionId(
    @Column(name = "message_id")
    var messageId: Long = 0,

    @Column(name = "user_id")
    var userId: Long = 0,
) : Serializable

@Entity
@Table(name = "chat_message_reaction")
open class ChatMessageReactionDto {
    @EmbeddedId
    var id: ChatMessageReactionId = ChatMessageReactionId()

    @Column(name = "reaction", nullable = false, length = 32)
    var reaction: String = ""

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null

    constructor()

    constructor(messageId: Long, userId: Long, reaction: String) {
        this.id = ChatMessageReactionId(messageId, userId)
        this.reaction = reaction
    }
}
