import {
    getSessionUser,
    setSessionUser,
    clearSessionUser,
} from './sessionStore'

/**
 * Получение текущего пользователя из единого sessionStore
 */
export function getCurrentUser() {
    return getSessionUser()
}

/**
 * Сохранение текущего пользователя в sessionStore
 */
export function setCurrentUser(user) {
    return setSessionUser(user)
}

/**
 * Очистка данных пользователя (при выходе)
 */
export function clearCurrentUser() {
    clearSessionUser()
}

/**
 * Получение роли текущего пользователя
 */
export function getUserRole() {
    const user = getCurrentUser()
    return user?.role || null
}

/**
 * Проверка, является ли пользователь работодателем
 */
export function isEmployer() {
    return getUserRole() === 'EMPLOYER'
}

/**
 * Проверка, является ли пользователь соискателем
 */
export function isApplicant() {
    return getUserRole() === 'APPLICANT'
}

/**
 * Проверка, является ли пользователь куратором или администратором
 */
export function isCurator() {
    const role = getUserRole()
    return role === 'CURATOR' || role === 'ADMIN'
}