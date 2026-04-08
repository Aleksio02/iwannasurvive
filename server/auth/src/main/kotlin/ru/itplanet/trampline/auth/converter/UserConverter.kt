package ru.itplanet.trampline.auth.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.commons.dao.dto.UserDto
import ru.itplanet.trampline.commons.model.Role

@Component
class UserConverter {

    fun toUserDto(
        source: Registration,
        normalizedEmail: String,
        passwordHash: String,
    ): UserDto {
        val user = UserDto(
            displayName = source.displayName.trim(),
            email = normalizedEmail,
            passwordHash = passwordHash,
            role = source.role,
        )
        user.emailVerified = true
        return user
    }

    fun toUserDto(
        displayName: String,
        normalizedEmail: String,
        passwordHash: String,
        role: Role,
        emailVerified: Boolean,
    ): UserDto {
        val user = UserDto(
            displayName = displayName.trim(),
            email = normalizedEmail,
            passwordHash = passwordHash,
            role = role,
        )
        user.emailVerified = emailVerified
        return user
    }

    fun toCuratorUserDto(
        source: CreateCuratorRequest,
        normalizedEmail: String,
        passwordHash: String
    ): UserDto {
        return UserDto(
            displayName = source.displayName.trim(),
            email = normalizedEmail,
            passwordHash = passwordHash,
            role = Role.CURATOR,
        )
    }

    fun fromDtoToUser(source: UserDto): User {
        return User(
            id = source.id!!,
            displayName = source.displayName,
            email = source.email,
            role = source.role,
            twoFactorEnabled = source.twoFactorEnabled,
        )
    }
}
