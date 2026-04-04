package ru.itplanet.trampline.profile.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class EmployerVerificationRequest(
    @field:NotBlank(message = "Способ верификации обязателен")
    val verificationMethod: String,

    @field:Email(message = "Укажите корректный корпоративный адрес электронной почты")
    val corporateEmail: String?,

    @field:Pattern(regexp = "\\d{10,12}", message = "ИНН должен содержать от 10 до 12 цифр")
    val inn: String? = null,

    val professionalLinks: List<String> = emptyList(),

    val submittedComment: String? = null,
)
