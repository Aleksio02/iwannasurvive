package ru.itplanet.trampline.interaction.service

import jakarta.persistence.EntityNotFoundException
import org.apache.coyote.BadRequestException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.interaction.client.OpportunityServiceClient
import ru.itplanet.trampline.interaction.dao.ContactDao
import ru.itplanet.trampline.interaction.dao.FavoriteDao
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse
import org.springframework.security.access.AccessDeniedException
import ru.itplanet.trampline.interaction.dao.ContactInfoApplicantProfileDao
import ru.itplanet.trampline.interaction.dao.dto.ContactDto
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import ru.itplanet.trampline.interaction.dao.dto.FavoriteDto
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse


@Service
@Transactional
class InteractionServiceImpl(
    private val opportunityResponseDao: OpportunityResponseDao,
    private val favoriteDao: FavoriteDao,
    private val contactRepository: ContactDao,
    private val contactInfoApplicantProfileDao: ContactInfoApplicantProfileDao,
    private val opportunityServiceClient: OpportunityServiceClient
): InteractionService {

    // ----- Отклики -----
    override fun apply(userId: Long, request: OpportunityResponseRequest): OpportunityResponseResponse {
        val opportunity = opportunityServiceClient.getPublicOpportunity(request.opportunityId)

        if (opportunityResponseDao.existsByUserIdAndOpportunityId(userId, request.opportunityId)) {
            throw RuntimeException("You have already applied to this opportunity")
        }

        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw BadRequestException("This opportunity is not open for applications")
        }
        val opportunityResponseDto =
            OpportunityResponseDto(userId, request.opportunityId, request.comment)
        val saved = opportunityResponseDao.save(opportunityResponseDto)
        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun updateApplicationStatus(
        applicationId: Long,
        currentUserId: Long,
        request: OpportunityResponseStatusUpdateRequest
    ): OpportunityResponseResponse {
        val application = opportunityResponseDao.findById(applicationId)
            .orElseThrow { EntityNotFoundException("Application not found") }

        val opportunity = opportunityServiceClient.getPublicOpportunity(application.opportunityId)

        if (opportunity.employerUserId != currentUserId) {
            throw AccessDeniedException("You are not the owner of this opportunity")
        }
        application.status = request.status
        application.comment = request.comment ?: application.comment
        val saved = opportunityResponseDao.save(application)
        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun getUserApplications(userId: Long): List<OpportunityResponseResponse> {
        return opportunityResponseDao.findByUserId(userId).map { app ->
            val opportunityResponse =
                opportunityServiceClient.getPublicOpportunity(app.opportunityId)
            toOpportunityResponseResponse(app, opportunityResponse.title)
        }
    }

    override fun getOpportunityApplications(
        opportunityId: Long,
        currentUserId: Long
    ): List<OpportunityResponseResponse> {
        val opportunity = opportunityServiceClient.getPublicOpportunity(opportunityId)
        if (opportunity.employerUserId != currentUserId) {
            throw AccessDeniedException("You are not the owner of this opportunity")
        }
        return opportunityResponseDao.findByOpportunityId(opportunityId).map { app ->
            toOpportunityResponseResponse(app, opportunity.title)
        }
    }

    // ----- Избранное -----
    override fun addToFavorites(userId: Long, opportunityId: Long): FavoriteResponse {
        if (!favoriteDao.existsByUserIdAndOpportunityId(userId, opportunityId)) {
            val favoriteDto = FavoriteDto(userId, opportunityId)
            favoriteDao.save(favoriteDto)
        }
        val opportunity = opportunityServiceClient.getPublicOpportunity(opportunityId)
        return FavoriteResponse(opportunityId, opportunity.title, null)
    }

    override fun removeFromFavorites(userId: Long, opportunityId: Long) {
        favoriteDao.deleteByUserIdAndOpportunityId(userId, opportunityId)
    }

    override fun getUserFavorites(userId: Long): List<FavoriteResponse> {
        return favoriteDao.findByUserId(userId).map { fav ->
            val opportunity = opportunityServiceClient.getPublicOpportunity(fav.opportunityId)
            FavoriteResponse(fav.opportunityId, opportunity.title, fav.createdAt)
        }
    }

    // ----- Контакты (нетворкинг) -----
    override fun addContact(userId: Long, request: ContactRequest): ContactResponse {
        if (userId == request.contactUserId) {
            throw BadRequestException("You cannot add yourself as a contact")
        }
        if (contactRepository.existsByUserIdAndContactUserId(userId, request.contactUserId)) {
            throw RuntimeException("Contact already exists")
        }
        // Создаём контакт со статусом PENDING (ожидает подтверждения)
        val contactDto = ContactDto(userId, request.contactUserId)
        val saved = contactRepository.save(contactDto)
        return toContactResponse(userId, saved)
    }

    override fun acceptContact(userId: Long, contactUserId: Long): ContactResponse {
        val contact = contactRepository.findByUserIdAndContactUserId(contactUserId, userId)
            ?: throw EntityNotFoundException("Contact request not found")
        if (contact.userId != contactUserId && contact.contactUserId != userId) {
            throw AccessDeniedException("You are not the recipient of this request")
        }
        contact.status = ContactStatus.ACCEPTED
        val saved = contactRepository.save(contact)
        return toContactResponse(userId, saved)
    }

    override fun removeContact(userId: Long, contactUserId: Long) {
        val contact = contactRepository.findByUserIdAndContactUserId(userId, contactUserId)
            ?: throw EntityNotFoundException("Contact not found")
        contactRepository.delete(contact)
    }

    override fun getUserContacts(userId: Long): List<ContactResponse> {
        val asUser = contactRepository.findByUserIdAndStatus(userId, ContactStatus.ACCEPTED)
        val asContact =
            contactRepository.findByContactUserIdAndStatus(userId, ContactStatus.ACCEPTED)
        return (asUser + asContact).map { toContactResponse(userId, it) }.distinctBy { it.contactUserId }
    }

    private fun toOpportunityResponseResponse(app: OpportunityResponseDto, title: String?) =
        OpportunityResponseResponse(
            id = app.id!!,
            opportunityId = app.opportunityId,
            opportunityTitle = title,
            status = app.status,
            comment = app.comment,
            createdAt = app.createdAt
        )

    private fun toContactResponse(currentUserId: Long, contact: ContactDto): ContactResponse {
        val contactUserId = if (contact.userId == currentUserId) contact.contactUserId else contact.userId
        val userDto = contactInfoApplicantProfileDao.findById(contactUserId)
            .orElseThrow { EntityNotFoundException("User $contactUserId not found") }
        val contactName = "${userDto.firstName} ${userDto.middleName} ${userDto.lastName}"
        return ContactResponse(contactUserId, contactName, contact.status, contact.createdAt)
    }
}