package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "chat_participant_state")
open class ChatParticipantStateDto {

    @EmbeddedId
    var id: ChatParticipantStateDtoId = ChatParticipantStateDtoId()

    @Column(name = "last_read_message_id")
    var lastReadMessageId: Long? = null

    @Column(name = "last_read_at")
    var lastReadAt: OffsetDateTime? = null

    @Column(name = "archived_at")
    var archivedAt: OffsetDateTime? = null

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    var joinedAt: OffsetDateTime? = null

    constructor()

    constructor(id: ChatParticipantStateDtoId) {
        this.id = id
    }
}
