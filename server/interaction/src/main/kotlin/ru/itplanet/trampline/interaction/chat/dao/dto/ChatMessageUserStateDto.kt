package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.io.Serializable
import java.time.OffsetDateTime

@Embeddable
data class ChatMessageUserStateId(
    @Column(name = "message_id")
    var messageId: Long = 0,

    @Column(name = "user_id")
    var userId: Long = 0,
) : Serializable

@Entity
@Table(name = "chat_message_user_state")
open class ChatMessageUserStateDto {
    @EmbeddedId
    var id: ChatMessageUserStateId = ChatMessageUserStateId()

    @Column(name = "hidden_at")
    var hiddenAt: OffsetDateTime? = null

    constructor()

    constructor(messageId: Long, userId: Long, hiddenAt: OffsetDateTime?) {
        this.id = ChatMessageUserStateId(messageId, userId)
        this.hiddenAt = hiddenAt
    }
}
