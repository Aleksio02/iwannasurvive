package ru.itplanet.trampline.auth.dao.dto

import jakarta.persistence.*
import ru.itplanet.trampline.auth.model.Role
import ru.itplanet.trampline.auth.model.Status
import java.util.*

@Entity
@Table(name = "users")
open class UserDto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = 0

    @Column(name = "display_name", nullable = false)
    var displayName: String = ""

    @Column(name = "email", nullable = false, unique = true)
    var email: String = ""

    @Column(name = "password_hash", nullable = false)
    var password: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    var role: Role = Role.APPLICANT

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: Status = Status.PENDING_VERIFICATION

    constructor() {}

    constructor(displayName: String, email: String, password: String, role: Role, status: Status) {
        this.displayName = displayName
        this.email = email
        this.password = password
        this.role = role
        this.status = status
    }
}