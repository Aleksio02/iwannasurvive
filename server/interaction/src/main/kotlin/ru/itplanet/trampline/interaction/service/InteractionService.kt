package ru.itplanet.trampline.interaction.service

import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse

interface InteractionService {
    fun apply(userId: Long, request: OpportunityResponseRequest): OpportunityResponseResponse
    fun updateApplicationStatus(
        applicationId: Long,
        currentUserId: Long,
        request: OpportunityResponseStatusUpdateRequest
    ): OpportunityResponseResponse

    fun getUserApplications(userId: Long): List<OpportunityResponseResponse>

    fun getOpportunityApplications(
        opportunityId: Long,
        currentUserId: Long
    ): List<OpportunityResponseResponse>

    fun addToFavorites(userId: Long, opportunityId: Long): FavoriteResponse

    fun removeFromFavorites(userId: Long, opportunityId: Long)

    fun getUserFavorites(userId: Long): List<FavoriteResponse>

    fun addContact(userId: Long, request: ContactRequest): ContactResponse

    fun respondContact(userId: Long, contactUserId: Long, status: ContactStatus): ContactResponse

    fun removeContact(userId: Long, contactUserId: Long)

    fun getUserContacts(userId: Long): List<ContactResponse>
}