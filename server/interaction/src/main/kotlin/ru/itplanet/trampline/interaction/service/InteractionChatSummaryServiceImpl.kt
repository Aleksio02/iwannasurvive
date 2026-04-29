package ru.itplanet.trampline.interaction.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.interaction.chat.dao.ChatResponseSummaryQueryDao
import ru.itplanet.trampline.interaction.chat.model.ChatResponseSummary
import ru.itplanet.trampline.interaction.chat.service.ChatPolicy
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import ru.itplanet.trampline.interaction.model.response.ChatSummaryResponse
import ru.itplanet.trampline.interaction.model.response.EmployerOpportunityResponseItem
import ru.itplanet.trampline.interaction.model.response.EmployerResponsePage
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse

@Service
class InteractionChatSummaryServiceImpl(
    private val chatResponseSummaryQueryDao: ChatResponseSummaryQueryDao,
) : InteractionChatSummaryService {

    override fun enrichApplicantResponses(
        currentUserId: Long,
        responses: List<OpportunityResponseResponse>,
    ): List<OpportunityResponseResponse> {
        if (responses.isEmpty()) {
            return responses
        }

        val summaryByResponseId = buildChatSummaryByResponseId(
            currentUserId = currentUserId,
            responseStatuses = responses.associate { it.id to it.status },
        )

        return responses.map { response ->
            response.copy(
                chatSummary = summaryByResponseId.getValue(response.id),
            )
        }
    }

    override fun enrichEmployerResponses(
        currentUserId: Long,
        page: EmployerResponsePage<EmployerOpportunityResponseItem>,
    ): EmployerResponsePage<EmployerOpportunityResponseItem> {
        if (page.items.isEmpty()) {
            return page
        }

        val summaryByResponseId = buildChatSummaryByResponseId(
            currentUserId = currentUserId,
            responseStatuses = page.items.associate { it.id to it.status },
        )

        return EmployerResponsePage(
            items = page.items.map { item ->
                item.copy(
                    chatSummary = summaryByResponseId.getValue(item.id),
                )
            },
            limit = page.limit,
            offset = page.offset,
            total = page.total,
        )
    }

    private fun buildChatSummaryByResponseId(
        currentUserId: Long,
        responseStatuses: Map<Long, OpportunityResponseStatus>,
    ): Map<Long, ChatSummaryResponse> {
        if (responseStatuses.isEmpty()) {
            return emptyMap()
        }

        val existingSummaries = chatResponseSummaryQueryDao.findByOpportunityResponseIds(
            currentUserId = currentUserId,
            opportunityResponseIds = responseStatuses.keys,
        )

        return responseStatuses.mapValues { (responseId, responseStatus) ->
            existingSummaries[responseId]?.let(::toChatSummaryResponse)
                ?: ChatSummaryResponse.noChat(
                    canSend = responseStatus in ChatPolicy.WRITABLE_RESPONSE_STATUSES,
                )
        }
    }

    private fun toChatSummaryResponse(
        summary: ChatResponseSummary,
    ): ChatSummaryResponse {
        return ChatSummaryResponse(
            dialogId = summary.dialogId,
            hasChat = true,
            unreadCount = summary.unreadCount,
            canSend = summary.canSend,
            lastMessageAt = summary.lastMessageAt,
        )
    }
}
