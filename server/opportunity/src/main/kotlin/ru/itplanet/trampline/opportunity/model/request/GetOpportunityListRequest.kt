package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.opportunity.model.enums.OpportunitySortBy
import ru.itplanet.trampline.opportunity.model.enums.SortDirection

data class GetOpportunityListRequest(
    @field:Min(value = 1, message = "Параметр limit должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр limit должен быть не больше 100")
    val limit: Int = 20,

    @field:Min(value = 0, message = "Параметр offset не может быть отрицательным")
    val offset: Long = 0,

    val sortBy: OpportunitySortBy = OpportunitySortBy.PUBLISHED_AT,
    val sortDirection: SortDirection = SortDirection.DESC,

    val type: OpportunityType? = null,
    val workFormat: WorkFormat? = null,

    @field:Positive(message = "Идентификатор города должен быть положительным")
    val cityId: Long? = null,

    val tagIds: List<@Positive(message = "Идентификатор тега должен быть положительным") Long> = emptyList(),

    @field:Min(value = 0, message = "Минимальная зарплата не может быть отрицательной")
    val salaryFrom: Int? = null,

    @field:Min(value = 0, message = "Максимальная зарплата не может быть отрицательной")
    val salaryTo: Int? = null,

    val search: String? = null,
)
