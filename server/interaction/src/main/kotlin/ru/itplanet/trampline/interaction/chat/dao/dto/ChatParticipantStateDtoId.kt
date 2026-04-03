package ru.itplanet.trampline.interaction.chat.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import java.io.Serializable

@Embeddable
data class ChatParticipantStateDtoId(
    @Column(name = "dialog_id", nullable = false)
    val dialogId: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long = 0,
) : Serializable
