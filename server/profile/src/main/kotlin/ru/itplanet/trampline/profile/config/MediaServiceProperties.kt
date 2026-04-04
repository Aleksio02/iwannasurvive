package ru.itplanet.trampline.profile.config

import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties(prefix = "media.service")
data class MediaServiceProperties(
    @field:NotBlank(message = "URL media-сервиса обязателен")
    var url: String = "",
)
