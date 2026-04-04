package ru.itplanet.trampline.interaction.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import ru.itplanet.trampline.interaction.model.enums.EmployerResponseSortBy
import ru.itplanet.trampline.interaction.model.enums.SortDirection

data class GetEmployerResponseListRequest(
    @field:Min(value = 1, message = "Параметр limit должен быть не меньше 1")
    @field:Max(value = 100, message = "Параметр limit должен быть не больше 100")
    val limit: Int = 20,

    @field:Min(value = 0, message = "Параметр offset не может быть отрицательным")
    val offset: Long = 0,

    val sortBy: EmployerResponseSortBy = EmployerResponseSortBy.CREATED_AT,
    val sortDirection: SortDirection = SortDirection.DESC,

    @field:Positive(message = "Идентификатор возможности должен быть положительным")
    val opportunityId: Long? = null,

    val status: OpportunityResponseStatus? = null,
    val search: String? = null,
)
