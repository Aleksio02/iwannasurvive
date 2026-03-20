package ru.itplanet.trampline.auth.config

import jakarta.validation.Validator
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean

@Configuration
class ValidationConfig {
    @Bean
    fun validator(): Validator {
        return LocalValidatorFactoryBean()
    }
}