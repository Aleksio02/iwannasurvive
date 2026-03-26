package ru.itplanet.trampline.opportunity.model.enums

enum class EmployerOpportunityCabinetGroup {
    ACTIVE,
    PLANNED,
    CLOSED;

    fun statuses(): Set<OpportunityStatus> {
        return when (this) {
            ACTIVE -> setOf(OpportunityStatus.PUBLISHED)

            PLANNED -> setOf(
                OpportunityStatus.DRAFT,
                OpportunityStatus.PENDING_MODERATION,
                OpportunityStatus.REJECTED,
                OpportunityStatus.PLANNED
            )

            CLOSED -> setOf(
                OpportunityStatus.CLOSED,
                OpportunityStatus.ARCHIVED
            )
        }
    }

    companion object {
        fun fromStatus(status: OpportunityStatus): EmployerOpportunityCabinetGroup {
            return when (status) {
                OpportunityStatus.PUBLISHED -> ACTIVE

                OpportunityStatus.DRAFT,
                OpportunityStatus.PENDING_MODERATION,
                OpportunityStatus.REJECTED,
                OpportunityStatus.PLANNED -> PLANNED

                OpportunityStatus.CLOSED,
                OpportunityStatus.ARCHIVED -> CLOSED
            }
        }
    }
}
