package ru.itplanet.trampline.geo.service

import org.locationtech.jts.geom.Point
import org.locationtech.jts.io.WKTReader
import org.springframework.context.annotation.Primary
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import ru.itplanet.trampline.geo.dao.OpportunityDao
import ru.itplanet.trampline.geo.exception.GeoBadRequestException
import ru.itplanet.trampline.geo.model.City
import ru.itplanet.trampline.geo.model.Employer
import ru.itplanet.trampline.geo.model.GeoPoint
import ru.itplanet.trampline.geo.model.Location
import ru.itplanet.trampline.geo.model.NearbyOpportunity
import ru.itplanet.trampline.geo.model.Salary

@Primary
@Service
class GeoServiceImpl(
    private val opportunityDao: OpportunityDao,
) : GeoService {

    override fun findNearbyOpportunities(
        lat: Double,
        lng: Double,
        radiusKm: Double,
        pageNumber: Int,
        pageSize: Int,
    ): List<NearbyOpportunity> {
        if (lat !in -90.0..90.0 || lng !in -180.0..180.0) {
            throw GeoBadRequestException(
                message = "Координаты указаны некорректно",
                code = "invalid_coordinates",
                details = mapOf(
                    "lat" to lat.toString(),
                    "lng" to lng.toString(),
                ),
            )
        }

        if (radiusKm <= 0.0) {
            throw GeoBadRequestException(
                message = "Радиус поиска должен быть больше нуля",
                code = "invalid_radius",
                details = mapOf("radiusKm" to radiusKm.toString()),
            )
        }

        if (pageNumber < 0) {
            throw GeoBadRequestException(
                message = "Номер страницы не может быть отрицательным",
                code = "invalid_page_number",
                details = mapOf("pageNumber" to pageNumber.toString()),
            )
        }

        if (pageSize <= 0) {
            throw GeoBadRequestException(
                message = "Размер страницы должен быть больше нуля",
                code = "invalid_page_size",
                details = mapOf("pageSize" to pageSize.toString()),
            )
        }

        val pageable = PageRequest.of(pageNumber, pageSize)
        val projections = opportunityDao.findWithinRadius(lng, lat, radiusKm, pageable)

        return projections.map { proj ->
            val locationPoint = proj.locationPoint.let { WKTReader().read(it) as? Point }

            NearbyOpportunity(
                id = proj.id,
                title = proj.title,
                fullDescription = proj.fullDescription,
                salary = if (proj.salaryFrom != null || proj.salaryTo != null) {
                    Salary(
                        from = proj.salaryFrom,
                        to = proj.salaryTo,
                        currency = proj.salaryCurrency,
                    )
                } else {
                    null
                },
                type = proj.type,
                employer = if (proj.employerUserId != null) {
                    Employer(proj.employerUserId, proj.companyName)
                } else {
                    null
                },
                location = if (proj.locationId != null) {
                    Location(
                        id = proj.locationId,
                        addressLine = proj.addressLine,
                        coordinates = GeoPoint(locationPoint?.y, locationPoint?.x),
                    )
                } else {
                    null
                },
                city = if (proj.cityId != null) {
                    City(proj.cityId, proj.cityName)
                } else {
                    null
                },
            )
        }
    }
}
