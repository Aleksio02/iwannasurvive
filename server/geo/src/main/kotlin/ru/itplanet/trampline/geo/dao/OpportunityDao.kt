package ru.itplanet.trampline.geo.dao

import org.locationtech.jts.geom.Point
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.geo.dao.dto.GeoOpportunityDto

interface OpportunityDao : JpaRepository<GeoOpportunityDto, Long> {

    @Query(
        value = """
            SELECT
                o.id AS opportunity_id,
                o.title,
                o.full_description,
                o.salary_from,
                o.salary_to,
                o.salary_currency,
                o.type,
                ep.user_id AS employer_id,
                ep.company_name,
                l.id AS location_id,
                l.address_line as address,
                l.location_point AS location_point,
                c.id AS city_id,
                c.name AS city_name
            FROM opportunity o
            LEFT JOIN employer_profile ep ON o.employer_user_id = ep.user_id
            LEFT JOIN location l ON o.location_id = l.id
            LEFT JOIN city c ON o.city_id = c.id
            WHERE l.location_point IS NOT NULL
              AND o.status = 'PUBLISHED'
              AND ST_DWithin(l.location_point, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius * 1000)
            ORDER BY ST_Distance(l.location_point, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)
            LIMIT :limit OFFSET :offset
        """,
        nativeQuery = true
    )
    fun findWithinRadius(
        @Param("lat") lat: Double,
        @Param("lng") lng: Double,
        @Param("radius") radiusKm: Double,
        @Param("limit") limit: Int,
        @Param("offset") offset: Int
    ): List<OpportunityGeoProjection>
}

interface OpportunityGeoProjection {
    fun getOpportunityId(): Long
    fun getTitle(): String
    fun getFullDescription(): String?
    fun getSalaryFrom(): Int?
    fun getSalaryTo(): Int?
    fun getSalaryCurrency(): String?
    fun getType(): String?
    fun getEmployerId(): Long?
    fun getCompanyName(): String?
    fun getLocationId(): Long?
    fun getAddress(): String?
    fun getLocationPoint(): Point?
    fun getCityId(): Long?
    fun getCityName(): String?
}