package ru.itplanet.trampline.geo.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.geo.dao.OpportunityDao
import ru.itplanet.trampline.geo.model.*

@Service
class GeoService(
    private val opportunityDao: OpportunityDao
) {

    fun findNearbyOpportunities(
        lat: Double,
        lng: Double,
        radiusKm: Double,
        offset: Int,
        limit: Int
    ): List<NearbyOpportunity> {
        require(lat in -90.0..90.0 && lng in -180.0..180.0) { "Invalid coordinates" }

        val projections = opportunityDao.findWithinRadius(lat, lng, radiusKm, offset, limit)

        return projections.map { proj ->
            NearbyOpportunity(
                opportunityId = proj.getOpportunityId(),
                title = proj.getTitle(),
                fullDescription = proj.getFullDescription(),
                salary = if (proj.getSalaryFrom() != null || proj.getSalaryTo() != null) {
                    Salary(
                        from = proj.getSalaryFrom(),
                        to = proj.getSalaryTo(),
                        currency = proj.getSalaryCurrency()
                    )
                } else null,
                type = proj.getType(),
                employer = if (proj.getEmployerId() != null) {
                    Employer(proj.getEmployerId(), proj.getCompanyName())
                } else null,
                location = if (proj.getLocationId() != null) {
                    Location(
                        id = proj.getLocationId(),
                        addressLine = proj.getAddress(),
                        coordinates = GeoPoint.fromPoint(proj.getLocationPoint())
                    )
                } else null,
                city = if (proj.getCityId() != null) {
                    City(proj.getCityId(), proj.getCityName())
                } else null
            )
        }
    }
}