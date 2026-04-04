package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CreateCuratorRequest(
    @field:NotBlank(message = "Отображаемое имя обязательно")
    @field:Size(max = 120, message = "Отображаемое имя не должно превышать 120 символов")
    val displayName: String,

    @field:Email(message = "Укажите корректный адрес электронной почты")
    @field:NotBlank(message = "Электронная почта обязательна")
    val email: String,

    @field:Size(min = 8, max = 16, message = "Пароль должен содержать от 8 до 16 символов")
    @field:NotBlank(message = "Пароль обязателен")
    val password: String,
)
