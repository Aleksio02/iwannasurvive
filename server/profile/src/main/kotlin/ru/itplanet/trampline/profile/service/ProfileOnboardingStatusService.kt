package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.ApplicantTagDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.model.ProfileOnboardingStatus
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType
import ru.itplanet.trampline.profile.security.AuthenticatedUser

@Service
class ProfileOnboardingStatusService(
    private val applicantProfileDao: ApplicantProfileDao,
    private val applicantTagDao: ApplicantTagDao,
    private val employerProfileDao: EmployerProfileDao,
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
        val profile = applicantProfileDao.findById(currentUser.userId).orElse(null)
        val missingFields = mutableListOf<String>()
        val issues = mutableListOf<String>()

        if (profile == null) {
            missingFields += listOf("firstName", "lastName", "universityName", "city", "courseOrGraduationYear", "professionalSignal")
            issues += "заполните профиль соискателя"
        } else {
            val hasSkillTag = applicantTagDao.findAllByApplicantUserId(currentUser.userId)
                .any { it.relationType == ApplicantTagRelationType.SKILL }
            missingFields += onboardingPolicy.applicantMissingFields(profile, hasSkillTag)
            issues += onboardingPolicy.applicantIssues(profile, hasSkillTag)
        }

        return ProfileOnboardingStatus(
            role = currentUser.role,
            completed = missingFields.isEmpty(),
            requiredPath = "/profile/edit",
            missingFields = missingFields,
            issues = issues,
        )
    }

    private fun employerStatus(currentUser: AuthenticatedUser): ProfileOnboardingStatus {
        val profile = employerProfileDao.findById(currentUser.userId).orElse(null)
        val missingFields = mutableListOf<String>()
        val issues = mutableListOf<String>()

        if (profile == null) {
            missingFields += listOf("companyName", "legalName", "inn", "industry", "description", "cityOrLocation", "publicChannel")
            issues += "заполните профиль компании"
        } else {
            missingFields += onboardingPolicy.employerMissingFields(profile)
            issues += onboardingPolicy.employerIssues(profile)
        }

        return ProfileOnboardingStatus(
            role = currentUser.role,
            completed = missingFields.isEmpty(),
            requiredPath = "/profile/edit",
            missingFields = missingFields,
            issues = issues,
        )
    }
}
