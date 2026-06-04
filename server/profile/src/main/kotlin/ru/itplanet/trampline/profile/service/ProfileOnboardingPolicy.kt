package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile

@Component
class ProfileOnboardingPolicy {

    fun applicantIssues(profile: ApplicantProfile): List<String> {
        val issues = mutableListOf<String>()

        if (profile.firstName.isNullOrBlank()) issues += "укажите имя"
        if (profile.lastName.isNullOrBlank()) issues += "укажите фамилию"
        if (profile.universityName.isNullOrBlank()) issues += "укажите вуз"
        if (profile.city == null) issues += "укажите город"
        if (profile.course == null && profile.graduationYear == null) {
            issues += "укажите курс или год выпуска"
        }

        val hasProfessionalSignal =
            !profile.resumeText.isNullOrBlank() ||
                profile.resumeFile != null ||
                profile.portfolioLinks.isNotEmpty() ||
                profile.portfolioFiles.isNotEmpty() ||
                profile.skills.isNotEmpty()

        if (!hasProfessionalSignal) {
            issues += "добавьте хотя бы один профессиональный сигнал: resumeText, resumeFile, portfolio или skills"
        }

        return issues
    }

    fun applicantMissingFields(profile: ApplicantProfile): List<String> {
        val fields = mutableListOf<String>()

        if (profile.firstName.isNullOrBlank()) fields += "firstName"
        if (profile.lastName.isNullOrBlank()) fields += "lastName"
        if (profile.universityName.isNullOrBlank()) fields += "universityName"
        if (profile.city == null) fields += "city"
        if (profile.course == null && profile.graduationYear == null) fields += "courseOrGraduationYear"

        val hasProfessionalSignal =
            !profile.resumeText.isNullOrBlank() ||
                profile.resumeFile != null ||
                profile.portfolioLinks.isNotEmpty() ||
                profile.portfolioFiles.isNotEmpty() ||
                profile.skills.isNotEmpty()

        if (!hasProfessionalSignal) fields += "professionalSignal"

        return fields
    }

    fun applicantIssues(
        profile: ApplicantProfileDto,
        hasSkillTag: Boolean,
    ): List<String> {
        val issues = mutableListOf<String>()

        if (profile.firstName.isNullOrBlank()) issues += "укажите имя"
        if (profile.lastName.isNullOrBlank()) issues += "укажите фамилию"
        if (profile.universityName.isNullOrBlank()) issues += "укажите вуз"
        if (profile.city == null) issues += "укажите город"
        if (profile.course == null && profile.graduationYear == null) {
            issues += "укажите курс или год выпуска"
        }

        if (!hasApplicantProfessionalSignal(profile, hasSkillTag)) {
            issues += "добавьте хотя бы один профессиональный сигнал: resumeText, resumeFile, portfolio или skills"
        }

        return issues
    }

    fun applicantMissingFields(
        profile: ApplicantProfileDto,
        hasSkillTag: Boolean,
    ): List<String> {
        val fields = mutableListOf<String>()

        if (profile.firstName.isNullOrBlank()) fields += "firstName"
        if (profile.lastName.isNullOrBlank()) fields += "lastName"
        if (profile.universityName.isNullOrBlank()) fields += "universityName"
        if (profile.city == null) fields += "city"
        if (profile.course == null && profile.graduationYear == null) fields += "courseOrGraduationYear"
        if (!hasApplicantProfessionalSignal(profile, hasSkillTag)) fields += "professionalSignal"

        return fields
    }

    fun employerIssues(profile: EmployerProfile): List<String> {
        val issues = mutableListOf<String>()

        if (profile.companyName.isNullOrBlank()) issues += "укажите название компании"
        if (profile.legalName.isNullOrBlank()) issues += "укажите юридическое название"
        if (profile.inn.isNullOrBlank() || !profile.inn.matches(Regex("^(\\d{10}|\\d{12})$"))) {
            issues += "укажите валидный ИНН"
        }
        if (profile.industry.isNullOrBlank()) issues += "укажите сферу деятельности"
        if (profile.description.isNullOrBlank()) issues += "добавьте описание компании"
        if (profile.city == null && profile.location == null) issues += "укажите город или локацию компании"

        val hasPublicChannel =
            !profile.websiteUrl.isNullOrBlank() ||
                profile.socialLinks.isNotEmpty() ||
                profile.publicContacts.isNotEmpty()

        if (!hasPublicChannel) {
            issues += "добавьте хотя бы один публичный канал связи: websiteUrl, socialLinks или publicContacts"
        }

        return issues
    }

    fun employerMissingFields(profile: EmployerProfile): List<String> {
        val fields = mutableListOf<String>()

        if (profile.companyName.isNullOrBlank()) fields += "companyName"
        if (profile.legalName.isNullOrBlank()) fields += "legalName"
        if (profile.inn.isNullOrBlank() || !profile.inn.matches(Regex("^(\\d{10}|\\d{12})$"))) fields += "inn"
        if (profile.industry.isNullOrBlank()) fields += "industry"
        if (profile.description.isNullOrBlank()) fields += "description"
        if (profile.city == null && profile.location == null) fields += "cityOrLocation"

        val hasPublicChannel =
            !profile.websiteUrl.isNullOrBlank() ||
                profile.socialLinks.isNotEmpty() ||
                profile.publicContacts.isNotEmpty()

        if (!hasPublicChannel) fields += "publicChannel"

        return fields
    }

    fun employerIssues(profile: EmployerProfileDto): List<String> {
        val issues = mutableListOf<String>()

        if (profile.companyName.isNullOrBlank()) issues += "укажите название компании"
        if (profile.legalName.isNullOrBlank()) issues += "укажите юридическое название"
        if (!hasValidInn(profile.inn)) issues += "укажите валидный ИНН"
        if (profile.industry.isNullOrBlank()) issues += "укажите сферу деятельности"
        if (profile.description.isNullOrBlank()) issues += "добавьте описание компании"
        if (profile.city == null && profile.location == null) issues += "укажите город или локацию компании"
        if (!hasEmployerPublicChannel(profile)) {
            issues += "добавьте хотя бы один публичный канал связи: websiteUrl, socialLinks или publicContacts"
        }

        return issues
    }

    fun employerMissingFields(profile: EmployerProfileDto): List<String> {
        val fields = mutableListOf<String>()

        if (profile.companyName.isNullOrBlank()) fields += "companyName"
        if (profile.legalName.isNullOrBlank()) fields += "legalName"
        if (!hasValidInn(profile.inn)) fields += "inn"
        if (profile.industry.isNullOrBlank()) fields += "industry"
        if (profile.description.isNullOrBlank()) fields += "description"
        if (profile.city == null && profile.location == null) fields += "cityOrLocation"
        if (!hasEmployerPublicChannel(profile)) fields += "publicChannel"

        return fields
    }

    private fun hasApplicantProfessionalSignal(
        profile: ApplicantProfileDto,
        hasSkillTag: Boolean,
    ): Boolean {
        return !profile.resumeText.isNullOrBlank() ||
            profile.portfolioLinks.isNotEmpty() ||
            hasSkillTag
    }

    private fun hasValidInn(inn: String?): Boolean {
        return !inn.isNullOrBlank() && inn.matches(Regex("^(\\d{10}|\\d{12})$"))
    }

    private fun hasEmployerPublicChannel(profile: EmployerProfileDto): Boolean {
        return !profile.websiteUrl.isNullOrBlank() ||
            profile.socialLinks.isNotEmpty() ||
            profile.publicContacts.isNotEmpty()
    }
}
