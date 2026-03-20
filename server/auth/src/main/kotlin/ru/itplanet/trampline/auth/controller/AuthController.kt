package ru.itplanet.trampline.auth.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.service.AuthService

@Validated
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/register")
    fun register(
        @Valid @ModelAttribute request: Authorization
    ): AuthResponse {
        return authService.register(request)
    }

    @GetMapping("/login")
    fun login(
        @Valid @ModelAttribute request: Authorization
    ): AuthResponse {
        return authService.login(request)
    }
}