package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.ProfileOnboardingStatus
import ru.itplanet.trampline.profile.security.AuthenticatedUser

@Service
class ProfileOnboardingStatusService(
    private val profileService: ProfileService,
    private val onboardingPolicy: ProfileOnboardingPolicy,
) {

    fun getStatus(currentUser: AuthenticatedUser): ProfileOnboardingStatus {
        return when (currentUser.role) {
            Role.APPLICANT -> applicantStatus(currentUser)
            Role.EMPLOYER -> employerStatus(currentUser)
            Role.CURATOR,
            Role.ADMIN -> ProfileOnboardingStatus(
                role = currentUser.role,
                completed = true,
                requiredPath = "/",
                missingFields = emptyList(),
                issues = emptyList(),
            )
        }
    }

    private fun applicantStatus(currentUser: AuthenticatedUser): ProfileOnboardingStatus {
        val profile = try {
            profileService.getApplicantProfile(currentUser.userId, currentUser.userId)
        } catch (_: ProfileNotFoundException) {
            null
        }

        val missingFields = profile?.let(onboardingPolicy::applicantMissingFields)
            ?: listOf("firstName", "lastName", "universityName", "city", "courseOrGraduationYear", "professionalSignal")
        val issues = profile?.let(onboardingPolicy::applicantIssues)
            ?: listOf("заполните профиль соискателя")

        return ProfileOnboardingStatus(
            role = currentUser.role,
            completed = missingFields.isEmpty(),
            requiredPath = "/profile/edit",
            missingFields = missingFields,
            issues = issues,
        )
    }

    private fun employerStatus(currentUser: AuthenticatedUser): ProfileOnboardingStatus {
        val profile = try {
            profileService.getEmployerProfile(currentUser.userId, currentUser.userId)
        } catch (_: ProfileNotFoundException) {
            null
        }

        val missingFields = profile?.let(onboardingPolicy::employerMissingFields)
            ?: listOf("companyName", "legalName", "inn", "industry", "description", "cityOrLocation", "publicChannel")
        val issues = profile?.let(onboardingPolicy::employerIssues)
            ?: listOf("заполните профиль компании")

        return ProfileOnboardingStatus(
            role = currentUser.role,
            completed = missingFields.isEmpty(),
            requiredPath = "/profile/edit",
            missingFields = missingFields,
            issues = issues,
        )
    }
}
