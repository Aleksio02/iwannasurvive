package ru.itplanet.trampline.geo.dao.dto

import jakarta.persistence.*
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto

@Entity
@Table(name = "opportunity")
open class GeoOpportunityDto(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    var title: String,
    var fullDescription: String?,
    var salaryFrom: Int?,
    var salaryTo: Int?,
    var salaryCurrency: String?,
    var type: String?,
    @ManyToOne
    @JoinColumn(name = "employer_user_id")
    var employerProfile: EmployerProfileDto?,
    @ManyToOne
    @JoinColumn(name = "location_id")
    var location: LocationDto?,
    @ManyToOne
    @JoinColumn(name = "city_id")
    var city: CityDto?
)