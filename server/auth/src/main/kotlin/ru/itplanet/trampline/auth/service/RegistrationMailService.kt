package ru.itplanet.trampline.auth.service

import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.RegistrationVerificationProperties

@Service
class RegistrationMailService(
    private val mailSender: JavaMailSender,
    private val registrationVerificationProperties: RegistrationVerificationProperties
) {

    fun sendRegistrationCode(email: String, code: String) {
        val message = SimpleMailMessage()

        if (registrationVerificationProperties.mailFrom.isNotBlank()) {
            message.from = registrationVerificationProperties.mailFrom
        }

        message.setTo(email)
        message.subject = registrationVerificationProperties.subject
        message.text = """
            Здравствуйте!

            Вы начали регистрацию в Tramplin.
            Код подтверждения: $code

            Код действует ${registrationVerificationProperties.codeTtlMinutes} минут.
            Если это были не вы, просто проигнорируйте это письмо.
        """.trimIndent()

        mailSender.send(message)
    }
}
