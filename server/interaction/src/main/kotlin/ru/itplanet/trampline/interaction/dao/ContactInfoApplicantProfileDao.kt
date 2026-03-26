package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.ContactInfoApplicantProfileDto

interface ContactInfoApplicantProfileDao: JpaRepository<ContactInfoApplicantProfileDto, Long>