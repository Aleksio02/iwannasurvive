package ru.itplanet.trampline.geo.controller

import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.geo.service.GeoService

@Validated
@RestController
@RequestMapping("/api/geo/opportunities")
class GeoController(
    private val geoService: GeoService,
) {

    @GetMapping("/nearby")
    fun getNearby(
        @RequestParam
        @DecimalMin(value = "-90.0", message = "Широта должна быть не меньше -90")
        @DecimalMax(value = "90.0", message = "Широта должна быть не больше 90")
        lat: Double,

        @RequestParam
        @DecimalMin(value = "-180.0", message = "Долгота должна быть не меньше -180")
        @DecimalMax(value = "180.0", message = "Долгота должна быть не больше 180")
        lng: Double,

        @RequestParam(defaultValue = "150")
        @Positive(message = "Радиус поиска должен быть больше нуля")
        radius: Double,

        @RequestParam(defaultValue = "0")
        @PositiveOrZero(message = "Номер страницы не может быть отрицательным")
        pageNumber: Int,

        @RequestParam(defaultValue = "50")
        @Positive(message = "Размер страницы должен быть больше нуля")
        pageSize: Int,
    ) = geoService.findNearbyOpportunities(lat, lng, radius, pageNumber, pageSize)
}
