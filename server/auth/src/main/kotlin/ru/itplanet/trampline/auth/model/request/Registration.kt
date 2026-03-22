package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class Registration(
    @field:Email
    @field:NotBlank(message = "Email must not be empty")
    val email: String?,
    @field:Size(min = 4, message = "Login should be longer than 3 characters")
    @field:NotBlank(message = "Login must not be empty")
    val login: String?,
    @field:Size(min = 8, max = 16, message = "Password should be between 8 and 16 characters")
    @field:NotBlank(message = "Password must not be empty")
    val password: String?
)