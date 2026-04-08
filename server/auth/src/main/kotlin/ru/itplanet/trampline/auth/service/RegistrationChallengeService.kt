package ru.itplanet.trampline.auth.service

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.RegistrationVerificationProperties
import ru.itplanet.trampline.auth.exception.InvalidRegistrationPendingTokenException
import ru.itplanet.trampline.auth.exception.InvalidRegistrationVerificationCodeException
import ru.itplanet.trampline.auth.model.response.RegistrationChallengeResponse
import ru.itplanet.trampline.auth.util.PasswordResetCodeGenerator
import ru.itplanet.trampline.commons.model.Role
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class RegistrationChallengeService(
    private val stringRedisTemplate: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    private val passwordEncoder: PasswordEncoder,
    private val registrationVerificationProperties: RegistrationVerificationProperties,
    private val registrationMailService: RegistrationMailService,
    private val codeGenerator: PasswordResetCodeGenerator
) {

    fun createChallenge(
        displayName: String,
        email: String,
        passwordHash: String,
        role: Role
    ): RegistrationChallengeResponse {
        val existingChallenge = findActiveChallenge(email)
        val now = Instant.now()

        if (existingChallenge != null) {
            if (existingChallenge.sentAt
                    .plusSeconds(registrationVerificationProperties.resendCooldownSeconds)
                    .isAfter(now)
            ) {
                return existingChallenge.toResponse()
            }

            return resendChallenge(existingChallenge.pendingToken)
        }

        val code = codeGenerator.generate()
        val challenge = StoredRegistrationChallenge(
            pendingToken = UUID.randomUUID().toString(),
            displayName = displayName,
            email = email,
            passwordHash = passwordHash,
            role = role,
            codeHash = passwordEncoder.encode(code),
            expiresAt = now.plusSeconds(registrationVerificationProperties.codeTtlMinutes * 60),
            sentAt = now,
            attempts = 0
        )

        saveChallenge(challenge)
        registrationMailService.sendRegistrationCode(email, code)

        return challenge.toResponse()
    }

    fun resendChallenge(pendingToken: String): RegistrationChallengeResponse {
        val challenge = getChallenge(pendingToken)
        val now = Instant.now()

        if (challenge.sentAt
                .plusSeconds(registrationVerificationProperties.resendCooldownSeconds)
                .isAfter(now)
        ) {
            return challenge.toResponse()
        }

        val code = codeGenerator.generate()
        val updatedChallenge = challenge.copy(
            codeHash = passwordEncoder.encode(code),
            expiresAt = now.plusSeconds(registrationVerificationProperties.codeTtlMinutes * 60),
            sentAt = now,
            attempts = 0
        )

        saveChallenge(updatedChallenge)
        registrationMailService.sendRegistrationCode(updatedChallenge.email, code)

        return updatedChallenge.toResponse()
    }

    fun verifyChallenge(
        pendingToken: String,
        code: String
    ): PendingRegistration {
        val challenge = getChallenge(pendingToken)

        if (challenge.attempts >= registrationVerificationProperties.maxVerifyAttempts) {
            deleteChallenge(challenge)
            throw InvalidRegistrationVerificationCodeException()
        }

        if (!passwordEncoder.matches(code, challenge.codeHash)) {
            val updatedChallenge = challenge.copy(
                attempts = challenge.attempts + 1
            )

            if (updatedChallenge.attempts >= registrationVerificationProperties.maxVerifyAttempts) {
                deleteChallenge(updatedChallenge)
            } else {
                saveChallenge(updatedChallenge)
            }

            throw InvalidRegistrationVerificationCodeException()
        }

        deleteChallenge(challenge)

        return PendingRegistration(
            displayName = challenge.displayName,
            email = challenge.email,
            passwordHash = challenge.passwordHash,
            role = challenge.role
        )
    }

    private fun getChallenge(pendingToken: String): StoredRegistrationChallenge {
        val token = pendingToken.takeIf { it.isNotBlank() }
            ?: throw InvalidRegistrationPendingTokenException()

        val rawJson = stringRedisTemplate.opsForValue().get(buildChallengeKey(token))
            ?: throw InvalidRegistrationPendingTokenException()

        val challenge = readAsChallengeOrNull(rawJson)
            ?: throw InvalidRegistrationPendingTokenException()

        if (challenge.expiresAt.isBefore(Instant.now())) {
            deleteChallenge(challenge)
            throw InvalidRegistrationPendingTokenException()
        }

        return challenge
    }

    private fun findActiveChallenge(email: String): StoredRegistrationChallenge? {
        val pendingToken = stringRedisTemplate.opsForValue()
            .get(buildIndexKey(email))
            ?.takeIf { it.isNotBlank() }
            ?: return null

        val rawJson = stringRedisTemplate.opsForValue().get(buildChallengeKey(pendingToken))
            ?: run {
                stringRedisTemplate.delete(buildIndexKey(email))
                return null
            }

        val challenge = readAsChallengeOrNull(rawJson)
            ?: run {
                stringRedisTemplate.delete(buildIndexKey(email))
                return null
            }

        if (challenge.email != email) {
            deleteChallenge(challenge)
            return null
        }

        if (challenge.expiresAt.isBefore(Instant.now())) {
            deleteChallenge(challenge)
            return null
        }

        return challenge
    }

    private fun saveChallenge(challenge: StoredRegistrationChallenge) {
        val ttl = Duration.between(Instant.now(), challenge.expiresAt)
            .takeIf { !it.isNegative && !it.isZero }
            ?: Duration.ofSeconds(1)

        stringRedisTemplate.opsForValue().set(
            buildChallengeKey(challenge.pendingToken),
            writeAsString(challenge),
            ttl
        )

        stringRedisTemplate.opsForValue().set(
            buildIndexKey(challenge.email),
            challenge.pendingToken,
            ttl
        )
    }

    private fun deleteChallenge(challenge: StoredRegistrationChallenge) {
        stringRedisTemplate.delete(
            listOf(
                buildChallengeKey(challenge.pendingToken),
                buildIndexKey(challenge.email)
            )
        )
    }

    private fun buildChallengeKey(pendingToken: String): String {
        return "registration:challenge:$pendingToken"
    }

    private fun buildIndexKey(email: String): String {
        return "registration:challenge:index:$email"
    }

    private fun writeAsString(challenge: StoredRegistrationChallenge): String {
        return try {
            objectMapper.writeValueAsString(challenge)
        } catch (_: JsonProcessingException) {
            throw IllegalStateException("Unable to store registration challenge")
        }
    }

    private fun readAsChallengeOrNull(rawJson: String): StoredRegistrationChallenge? {
        return try {
            objectMapper.readValue(rawJson, StoredRegistrationChallenge::class.java)
        } catch (_: JsonProcessingException) {
            null
        }
    }

    data class PendingRegistration(
        val displayName: String,
        val email: String,
        val passwordHash: String,
        val role: Role
    )

    private data class StoredRegistrationChallenge(
        val pendingToken: String,
        val displayName: String,
        val email: String,
        val passwordHash: String,
        val role: Role,
        val codeHash: String,
        val expiresAt: Instant,
        val sentAt: Instant,
        val attempts: Int
    ) {
        fun toResponse(): RegistrationChallengeResponse {
            return RegistrationChallengeResponse(
                pendingToken = pendingToken,
                expiresAt = expiresAt
            )
        }
    }
}
