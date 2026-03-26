package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import java.io.Serializable

@Embeddable
data class ContactDtoId(
    @Column(name = "user_low_id", nullable = false)
    val userLowId: Long = 0,

    @Column(name = "user_high_id", nullable = false)
    val userHighId: Long = 0
) : Serializable