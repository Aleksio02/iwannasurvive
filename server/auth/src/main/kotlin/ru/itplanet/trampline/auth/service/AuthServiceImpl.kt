package ru.itplanet.trampline.auth.service

import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.util.PasswordEncoder

@Primary
@Service
class AuthServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val sessionService: SessionService
) : AuthService {
    @Transactional
    override fun register(request: Authorization): AuthResponse {
        if (!request.validToRegistration()) {
            throw RuntimeException("You should fill all fields!")
        }
        userDao.findByUsernameOrEmail(request.login!!, request.email!!)
            ?.let { throw RuntimeException("User with this username or email exists") }

        request.password = PasswordEncoder.encode(request.password)

        val newUser = userDao.save(userConverter.toUserDto(request))
        val sessionId = sessionService.createSession(newUser.id!!)
        return AuthResponse(
            sessionId = sessionId,
            user = userConverter.fromDtoToUser(newUser)
        )
    }

    @Transactional(readOnly = true)
    override fun login(request: Authorization): AuthResponse {
        TODO("Not yet implemented")
    }
}