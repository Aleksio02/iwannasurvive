package ru.itplanet.trampline.auth.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.auth.dao.dto.UserDto
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.Authorization

@Component
class UserConverter {
    fun toUserDto(source: Authorization): UserDto {
        return UserDto(
            source.login!!,
            source.email!!,
            source.password!!
        )
    }

    fun fromDtoToUser(source: UserDto): User {
        return User(
            id = source.id!!,
            email = source.email,
            username = source.username
        )
    }
}