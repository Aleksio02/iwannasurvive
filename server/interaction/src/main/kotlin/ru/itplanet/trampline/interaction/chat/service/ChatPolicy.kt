package ru.itplanet.trampline.interaction.chat.service

import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogStatus
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus

object ChatPolicy {
    val WRITABLE_RESPONSE_STATUSES: Set<OpportunityResponseStatus> = linkedSetOf(
        OpportunityResponseStatus.SUBMITTED,
        OpportunityResponseStatus.IN_REVIEW,
        OpportunityResponseStatus.RESERVE,
        OpportunityResponseStatus.ACCEPTED,
    )

    val TERMINAL_RESPONSE_STATUSES: Set<OpportunityResponseStatus> = linkedSetOf(
        OpportunityResponseStatus.REJECTED,
        OpportunityResponseStatus.WITHDRAWN,
    )

    fun canWrite(
        dialogStatus: ChatDialogStatus,
        responseStatus: OpportunityResponseStatus,
    ): Boolean {
        return dialogStatus == ChatDialogStatus.OPEN &&
                responseStatus in WRITABLE_RESPONSE_STATUSES
    }
}
