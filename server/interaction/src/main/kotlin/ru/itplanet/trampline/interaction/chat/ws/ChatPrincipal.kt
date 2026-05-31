package ru.itplanet.trampline.interaction.chat.ws

import ru.itplanet.trampline.commons.model.Role
import java.io.Serializable
import java.security.Principal

data class ChatPrincipal(
    val userId: Long,
    val email: String,
    val role: Role,
) : Principal, Serializable {

    override fun getName(): String = userId.toString()
}
