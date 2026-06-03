package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/employer/files")
class EmployerFileController(
    private val profileService: ProfileService,
) {

    @DeleteMapping("/{fileId}")
    fun deleteEmployerFile(
        @PathVariable @Positive(message = "Идентификатор файла должен быть положительным") fileId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может удалять файлы работодателя",
                code = "employer_role_required",
            )
        }

        return profileService.deleteEmployerFileUniversal(currentUser.userId, fileId)
    }
}
