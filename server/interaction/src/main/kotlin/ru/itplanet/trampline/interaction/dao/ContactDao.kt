package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.ContactDto
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus

interface ContactDao : JpaRepository<ContactDto, Long> {
    fun findByUserIdAndStatus(userId: Long, status: ContactStatus): List<ContactDto>
    fun findByContactUserIdAndStatus(contactUserId: Long, status: ContactStatus): List<ContactDto>
    fun existsByUserIdAndContactUserId(userId: Long, contactUserId: Long): Boolean
    fun findByUserIdAndContactUserId(userId: Long, contactUserId: Long): ContactDto?
}