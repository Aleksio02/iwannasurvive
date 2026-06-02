package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.commons.model.enums.EmploymentType
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat

data class AiOpportunityDescriptionRequest(
    @field:Size(max = 200, message = "Название не должно превышать 200 символов")
    val title: String? = null,

    val type: OpportunityType? = null,
    val workFormat: WorkFormat? = null,
    val employmentType: EmploymentType? = null,
    val grade: Grade? = null,

    @field:Min(value = 0, message = "Зарплата от не может быть отрицательной")
    val salaryFrom: Int? = null,

    @field:Min(value = 0, message = "Зарплата до не может быть отрицательной")
    val salaryTo: Int? = null,

    @field:Pattern(regexp = "^[A-Za-z]{3}$", message = "Код валюты должен состоять из 3 латинских букв")
    val salaryCurrency: String? = "RUB",

    @field:Size(max = 200, message = "Название города не должно превышать 200 символов")
    val cityName: String? = null,

    @field:Size(max = 200, message = "Название компании не должно превышать 200 символов")
    val companyName: String? = null,

    @field:Size(max = 2000, message = "Требования не должны превышать 2000 символов")
    val requirements: String? = null,

    @field:Size(max = 2000, message = "Тезисы не должны превышать 2000 символов")
    val notes: String? = null,
)
