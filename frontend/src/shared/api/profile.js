const API_BASE = '/api'
const GEO_API_BASE = '/api/geo'

import {
    archiveEmployerOpportunity,
    closeEmployerOpportunity,
    createEmployerOpportunity,
    getEmployerOpportunity,
    listEmployerOpportunities,
    returnToDraftEmployerOpportunity,
    updateEmployerOpportunity,
} from './opportunities'
import {
    getContacts,
    addContact as addContactApi,
    acceptContactRequest,
    declineContactRequest,
    removeContact as removeContactApi,
    getMyResponses,
    createResponse,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    createRecommendation,
    getIncomingRecommendations,
    getOutgoingRecommendations,
    deleteRecommendation,
    getEmployerResponses,
    updateResponseStatus as updateInteractionResponseStatus,
} from './interaction'
import {
    getLocalFavoriteOpportunityIds,
    setLocalFavoriteOpportunityIds,
} from '@/shared/lib/utils/favoriteStorage'
import { invalidateSavedFavoritesCache } from './favorites'
import {
    getSessionUserFromApi,
    getSessionUserIdFromApi,
    getRequiredCurrentUserPayload,
    clearSessionUserCache,
    httpJson,
} from './http'
import { translateStatusTokensInText } from '@/shared/lib/utils/statusLabels'
import {
    detectContactMethodType,
    normalizeSocialLinkUrl,
} from '@/shared/lib/utils/contactLinks'

function createApiError(message, status = 0, extra = {}) {
    const error = new Error(translateStatusTokensInText(message))
    error.status = status
    error.code = extra.code || null
    error.details = extra.details || {}
    error.payload = extra.payload || null
    return error
}

let applicantProfileCache = null
let applicantProfileCacheAt = 0
let applicantProfileInFlight = null
let applicantProfileCacheUserId = null
let profileOnboardingStatusCache = null
let profileOnboardingStatusCacheUserId = null
let profileOnboardingStatusInFlight = null
const APPLICANT_PROFILE_CACHE_TTL_MS = 30_000
const GEO_CITY_SEARCH_CACHE_TTL_MS = 2 * 60_000
const GEO_ADDRESS_SUGGEST_CACHE_TTL_MS = 60_000
const geoCitySearchCache = new Map()
const geoCitySearchInFlight = new Map()
const geoAddressSuggestCache = new Map()
const geoAddressSuggestInFlight = new Map()

function clearApplicantProfileCache() {
    applicantProfileCache = null
    applicantProfileCacheAt = 0
    applicantProfileInFlight = null
    applicantProfileCacheUserId = null
}

function setApplicantProfileCache(profile, userId = applicantProfileCacheUserId) {
    applicantProfileCache = profile || null
    applicantProfileCacheAt = Date.now()
    applicantProfileInFlight = null
    applicantProfileCacheUserId = userId || null
    return applicantProfileCache
}

export function invalidateProfileOnboardingStatusCache() {
    profileOnboardingStatusCache = null
    profileOnboardingStatusCacheUserId = null
    profileOnboardingStatusInFlight = null
}

async function parseApiResponse(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (isJson) {
        try {
            return await response.json()
        } catch {
            return null
        }
    }

    try {
        const text = await response.text()
        return text || null
    } catch {
        return null
    }
}

export async function getCurrentSessionUser(options = {}) {
    return getSessionUserFromApi(options)
}

async function getAuthenticatedUserPayload() {
    return getRequiredCurrentUserPayload()
}

export async function apiRequest(url, options = {}) {
    const { body, headers = {}, ...restOptions } = options

    const isFormData = body instanceof FormData

    const finalHeaders = {
        ...headers,
    }

    if (!isFormData && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
        ...restOptions,
        headers: finalHeaders,
        body,
        credentials: 'include',
    })

    if (!response.ok) {
        let errorPayload = null

        try {
            errorPayload = await response.json()
        } catch {
            errorPayload = null
        }

        const error = new Error(
            translateStatusTokensInText(errorPayload?.message || `HTTP error ${response.status}`)
        )
        error.status = response.status
        error.code = errorPayload?.code || null
        error.details = errorPayload?.details || {}
        error.payload = errorPayload || null
        throw error
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        return response.json()
    }

    return response.text()
}

function normalizeProfileOnboardingStatus(data = {}) {
    return {
        role: data?.role || null,
        completed: Boolean(data?.completed),
        requiredPath: data?.requiredPath || '/profile/edit',
        missingFields: Array.isArray(data?.missingFields) ? data.missingFields : [],
        issues: Array.isArray(data?.issues) ? data.issues : [],
    }
}

export async function getProfileOnboardingStatus(options = {}) {
    const currentUser = await getAuthenticatedUserPayload()
    const currentUserId = currentUser?.userId ?? currentUser?.id ?? null

    if (
        !options.force &&
        profileOnboardingStatusCache &&
        profileOnboardingStatusCacheUserId === currentUserId
    ) {
        return profileOnboardingStatusCache
    }

    if (
        !options.force &&
        profileOnboardingStatusInFlight &&
        profileOnboardingStatusCacheUserId === currentUserId
    ) {
        return profileOnboardingStatusInFlight
    }

    const encodedUser = encodeURIComponent(JSON.stringify(currentUser))
    profileOnboardingStatusCacheUserId = currentUserId
    profileOnboardingStatusInFlight = apiRequest(`${API_BASE}/profile/onboarding/status?currentUser=${encodedUser}`)
        .then((data) => {
            profileOnboardingStatusCache = normalizeProfileOnboardingStatus(data)
            return profileOnboardingStatusCache
        })
        .finally(() => {
            profileOnboardingStatusInFlight = null
        })

    return profileOnboardingStatusInFlight
}

async function multipartRequest(endpoint, formData, options = {}) {
    let response
    try {
        response = await fetch(endpoint, {
            credentials: 'include',
            method: options.method || 'POST',
            body: formData,
            ...options,
        })
    } catch {
        throw createApiError('Сервер недоступен. Попробуйте позже.', 0)
    }

    const data = await parseApiResponse(response)

    if (!response.ok) {
        const errorMessage =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Ошибка загрузки файла'

        if (response.status === 401) {
            clearSessionUserCache()
        }

        throw createApiError(errorMessage, response.status, {
            code: typeof data === 'object' ? data?.code : null,
            details: typeof data === 'object' ? data?.details : {},
            payload: data,
        })
    }

    return data
}

async function createMultipartWithCurrentUser(file) {
    const currentUser = await getAuthenticatedUserPayload()
    const formData = new FormData()

    formData.append('file', file)
    formData.append(
        'currentUser',
        new Blob([JSON.stringify(currentUser)], { type: 'application/json' })
    )

    return formData
}

// ========== HELPERS ==========

function normalizeProfileLinks(links) {
    if (!links) return []

    if (Array.isArray(links)) {
        return links
            .map((item, index) => {
                if (typeof item === 'string') {
                    const url = item.trim()
                    if (!url) return null
                    return {
                        label: `Ссылка ${index + 1}`,
                        url,
                    }
                }

                if (item && typeof item === 'object') {
                    const rawUrl = item.url?.trim?.() || ''
                    const label = item.label?.trim?.() || item.title?.trim?.() || `Ссылка ${index + 1}`
                    const url = normalizeSocialLinkUrl(rawUrl, label)
                    if (!url) return null

                    return {
                        label,
                        url,
                    }
                }

                return null
            })
            .filter(Boolean)
    }

    if (typeof links === 'object') {
        return Object.entries(links)
            .map(([label, url], index) => {
                const normalizedLabel = label?.trim?.() || `Ссылка ${index + 1}`
                const normalizedUrl = normalizeSocialLinkUrl(
                    typeof url === 'string' ? url.trim() : '',
                    normalizedLabel
                )
                if (!normalizedUrl) return null

                return {
                    label: normalizedLabel,
                    url: normalizedUrl,
                }
            })
            .filter(Boolean)
    }

    return []
}

function detectContactType(value = '', label = '') {
    return detectContactMethodType(value, label)
}

function normalizeContactMethods(contacts) {
    if (!contacts) return []

    if (Array.isArray(contacts)) {
        return contacts
            .map((item, index) => {
                if (typeof item === 'string') {
                    const value = item.trim()
                    if (!value) return null

                    return {
                        type: detectContactType(value),
                        value,
                        label: `Контакт ${index + 1}`,
                    }
                }

                if (item && typeof item === 'object') {
                    const value =
                        item.value?.trim?.() ||
                        item.url?.trim?.() ||
                        ''

                    if (!value) return null

                    const label =
                        item.label?.trim?.() ||
                        item.title?.trim?.() ||
                        `Контакт ${index + 1}`
                    const detectedType = detectContactType(value, label)
                    const persistedType = ['EMAIL', 'PHONE', 'TELEGRAM', 'WHATSAPP', 'VK', 'LINKEDIN', 'OTHER'].includes(item.type)
                        ? item.type
                        : null

                    return {
                        type: detectedType === 'TELEGRAM'
                            ? 'TELEGRAM'
                            : persistedType || detectedType,
                        value,
                        label,
                    }
                }

                return null
            })
            .filter(Boolean)
    }

    if (typeof contacts === 'object') {
        return Object.entries(contacts)
            .map(([label, value], index) => {
                const normalizedValue = typeof value === 'string' ? value.trim() : ''
                if (!normalizedValue) return null

                const normalizedLabel = label?.trim?.() || `Контакт ${index + 1}`

                return {
                    type: detectContactType(normalizedValue, normalizedLabel),
                    value: normalizedValue,
                    label: normalizedLabel,
                }
            })
            .filter(Boolean)
    }

    return []
}

function normalizeApplicantProfile(data = {}) {
    return {
        ...data,
        cityId: data.city?.id ?? data.cityId ?? null,
        cityName: data.city?.name ?? data.cityName ?? '',
        portfolioLinks: normalizeProfileLinks(data.portfolioLinks),
        contactLinks: normalizeContactMethods(data.contactLinks),
        portfolioFiles: Array.isArray(data.portfolioFiles) ? data.portfolioFiles : [],
        avatar: data.avatar || null,
        resumeFile: data.resumeFile || null,
        skills: Array.isArray(data.skills) ? data.skills : [],
        interests: Array.isArray(data.interests) ? data.interests : [],
        moderationStatus: data.moderationStatus || 'DRAFT',
    }
}

function normalizeLocation(data = {}) {
    return {
        ...data,
        id: data.id ?? null,
        cityId: data.cityId ?? data.city?.id ?? null,
        cityName: data.city?.name ?? data.cityName ?? '',
        regionName: data.city?.regionName ?? data.regionName ?? '',
        addressLine: data.addressLine || '',
        addressLine2: data.addressLine2 || '',
        postalCode: data.postalCode || '',
        latitude: data.latitude ?? data.coordinates?.lat ?? null,
        longitude: data.longitude ?? data.coordinates?.lng ?? null,
        fiasId: data.fiasId || '',
        unrestrictedValue: data.unrestrictedValue || '',
        qcGeo: data.qcGeo ?? null,
        title: data.title || '',
        source: data.source || '',
        isActive: data.isActive ?? true,
    }
}

function normalizeEmployerProfile(data = {}) {
    return {
        ...data,
        cityId: data.city?.id ?? data.cityId ?? null,
        cityName: data.city?.name ?? data.cityName ?? '',
        locationId: data.location?.id ?? data.locationId ?? null,
        locationPreview: data.location ? normalizeLocation(data.location) : (data.locationPreview || null),
        socialLinks: normalizeProfileLinks(data.socialLinks),
        publicContacts: normalizeContactMethods(data.publicContacts),
        logo: data.logo || null,
        moderationStatus: data.moderationStatus || 'DRAFT',
    }
}

function normalizeGeoCity(data = {}) {
    return {
        ...data,
        id: data.id ?? null,
        name: data.name || '',
        regionName: data.regionName || '',
        countryCode: data.countryCode || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
    }
}

function normalizeAddressSuggestion(data = {}) {
    return {
        value: data.value || '',
        unrestrictedValue: data.unrestrictedValue || '',
        cityId: data.cityId ?? null,
        cityName: data.cityName || '',
        regionName: data.regionName || '',
        addressLine: data.addressLine || '',
        postalCode: data.postalCode || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        qcGeo: data.qcGeo ?? null,
        fiasId: data.fiasId || '',
    }
}

function normalizeAddressResolveResponse(data = {}) {
    return {
        value: data.value || '',
        unrestrictedValue: data.unrestrictedValue || '',
        cityId: data.cityId ?? null,
        cityName: data.cityName || '',
        regionName: data.regionName || '',
        addressLine: data.addressLine || '',
        postalCode: data.postalCode || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        qcGeo: data.qcGeo ?? null,
        fiasId: data.fiasId || '',
        source: data.source || '',
    }
}

function buildEmployerLocationPayload(location = {}) {
    return {
        title: location.title?.trim?.() || '',
        cityId: location.cityId ? Number(location.cityId) : null,
        addressLine: location.addressLine?.trim?.() || '',
        addressLine2: location.addressLine2?.trim?.() || '',
        postalCode: location.postalCode?.trim?.() || '',
        latitude:
            location.latitude !== '' && location.latitude != null
                ? Number(location.latitude)
                : null,
        longitude:
            location.longitude !== '' && location.longitude != null
                ? Number(location.longitude)
                : null,
        fiasId: location.fiasId?.trim?.() || '',
        unrestrictedValue: location.unrestrictedValue?.trim?.() || '',
        qcGeo:
            location.qcGeo !== '' && location.qcGeo != null
                ? Number(location.qcGeo)
                : null,
    }
}

export function getFileDownloadUrlByUserAndFile(role, userId, fileId) {
    if (!userId || !fileId) return null

    if (role === 'EMPLOYER') {
        return `${API_BASE}/profile/employer/${userId}/files/${fileId}`
    }

    return `${API_BASE}/profile/applicant/${userId}/files/${fileId}`
}

// localStorage ниже оставлен только для гостевых фич (избранное).
// Аутентификация и профильные запросы на них больше не завязаны.

function normalizeInteractionContact(contact = {}) {
    const fullName = String(contact.contactName || '').trim()
    const nameParts = fullName ? fullName.split(/\s+/) : []

    return {
        id: contact.contactUserId,
        contactUserId: contact.contactUserId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' '),
        fullName,
        contactName: fullName,
        status: contact.status || 'PENDING',
        direction: contact.direction || (contact.status === 'ACCEPTED' ? 'CONFIRMED' : null),
        createdAt: contact.createdAt || null,
    }
}

function getGuestFavoritesStorageKey() {
    return 'tramplin_guest_favorite_opportunities'
}

function readGuestFavorites() {
    try {
        const raw = localStorage.getItem(getGuestFavoritesStorageKey())
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function writeGuestFavorites(items) {
    localStorage.setItem(getGuestFavoritesStorageKey(), JSON.stringify(items))
}

export function getGuestFavoriteOpportunityIds() {
    return readGuestFavorites()
}

export function isGuestFavoriteOpportunity(opportunityId) {
    return readGuestFavorites().includes(Number(opportunityId))
}

export function addGuestFavoriteOpportunity(opportunityId) {
    const id = Number(opportunityId)
    const current = readGuestFavorites()
    if (!current.includes(id)) {
        const next = [...current, id]
        writeGuestFavorites(next)
        window.dispatchEvent(new CustomEvent('favorites-updated', {
            detail: { action: 'added', opportunityId: id, scope: 'guest' }
        }))
    }
}

export function removeGuestFavoriteOpportunity(opportunityId) {
    const id = Number(opportunityId)
    const next = readGuestFavorites().filter((item) => item !== id)
    writeGuestFavorites(next)
    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'removed', opportunityId: id, scope: 'guest' }
    }))
}

export async function migrateGuestFavoritesToAccount() {
    const user = await getCurrentSessionUser()
    if (!user?.id) return

    const guestIds = readGuestFavorites()
    if (!guestIds.length) return

    for (const opportunityId of guestIds) {
        try {
            await addToFavorites(opportunityId)
        } catch {
            // не прерываем миграцию
        }
    }

    writeGuestFavorites([])
    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'migrated', opportunityIds: guestIds, scope: 'guest' }
    }))
}

// ========== MEDIA / FILES ==========

export async function uploadApplicantAvatar(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/applicant/profile/avatar`, formData, {
        method: 'PUT',
    })

    return setApplicantProfileCache(normalizeApplicantProfile(data))
}

export async function uploadApplicantResumeFile(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/applicant/profile/resume-file`, formData, {
        method: 'PUT',
    })

    return setApplicantProfileCache(normalizeApplicantProfile(data))
}

export async function uploadApplicantPortfolioFile(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/applicant/profile/portfolio/files`, formData, {
        method: 'POST',
    })

    return setApplicantProfileCache(normalizeApplicantProfile(data))
}

export async function deleteApplicantFile(fileId) {
    if (!fileId) throw createApiError('Не указан fileId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const data = await apiRequest(`${API_BASE}/applicant/profile/files/${fileId}?currentUser=${currentUser}`, {
        method: 'DELETE',
    })

    return setApplicantProfileCache(normalizeApplicantProfile(data))
}

export async function uploadEmployerLogo(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/employer/profile/logo`, formData, {
        method: 'PUT',
    })

    return normalizeEmployerProfile(data)
}

export async function deleteEmployerOwnedFile(fileId) {
    if (!fileId) throw createApiError('Не указан fileId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const data = await apiRequest(`${API_BASE}/employer/files/${fileId}?currentUser=${currentUser}`, {
        method: 'DELETE',
    })

    return normalizeEmployerProfile(data)
}

export async function deleteEmployerFile(fileId) {
    return deleteEmployerOwnedFile(fileId)
}

export async function createEmployerVerification(payload, files = []) {
    const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : []

    if (normalizedFiles.length > 0) {
        const currentUser = await getRequiredCurrentUserPayload()
        const formData = new FormData()

        formData.append(
            'request',
            new Blob([JSON.stringify(payload)], { type: 'application/json' })
        )

        normalizedFiles.forEach((file) => {
            formData.append('files', file)
        })

        formData.append(
            'currentUser',
            new Blob([JSON.stringify(currentUser)], { type: 'application/json' })
        )

        return apiRequest(`${API_BASE}/employer/verification`, {
            method: 'POST',
            body: formData,
        })
    }

    const userId = await getSessionUserIdFromApi()

    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return apiRequest(`${API_BASE}/employer/verification?employerUserId=${userId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function deleteEmployerVerificationAttachment(verificationId, attachmentId) {
    if (!verificationId) throw createApiError('Не указан verificationId', 400)
    if (!attachmentId) throw createApiError('Не указан attachmentId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    return apiRequest(
        `${API_BASE}/employer/verifications/${verificationId}/attachments/${attachmentId}?currentUser=${currentUser}`,
        { method: 'DELETE' }
    )
}

export async function uploadEmployerVerificationAttachment(verificationId, file) {
    const currentUser = await getRequiredCurrentUserPayload()

    const formData = new FormData()
    formData.append('file', file)
    formData.append(
        'currentUser',
        new Blob([JSON.stringify(currentUser)], { type: 'application/json' })
    )

    return apiRequest(`${API_BASE}/employer/verifications/${verificationId}/attachments`, {
        method: 'POST',
        body: formData,
    })
}

export async function getEmployerVerificationAttachments(verificationId) {
    if (!verificationId) throw createApiError('Не указан verificationId', 400)

    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    const currentUser = await getAuthenticatedUserPayload()

    // Важно: currentUser нужно передавать как JSON строку
    const currentUserParam = encodeURIComponent(JSON.stringify(currentUser))

    return apiRequest(`/api/employer/verifications/${verificationId}/attachments?currentUser=${currentUserParam}`, {
        method: 'GET',
    })
}

export async function getEmployerVerificationAttachmentOpenUrl(verificationId, fileId) {
    if (!verificationId) throw createApiError('Не указан verificationId', 400)
    if (!fileId) throw createApiError('Не указан fileId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    return `${API_BASE}/employer/verifications/${verificationId}/attachments/${fileId}?currentUser=${currentUser}`
}

export async function getEmployerVerificationModerationTask(verificationId) {
    const userId = await getSessionUserIdFromApi()

    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return apiRequest(
        `${API_BASE}/employer/verification/${verificationId}/moderation-task?employerUserId=${userId}`,
        {
            method: 'GET',
        }
    )
}

export async function cancelEmployerVerificationModerationTask(verificationId) {
    const userId = await getSessionUserIdFromApi()

    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return apiRequest(
        `${API_BASE}/employer/verification/${verificationId}/moderation-task/cancel?employerUserId=${userId}`,
        {
            method: 'POST',
        }
    )
}

function normalizeOpportunity(item = {}) {
    return {
        ...item,
        cityId: item.cityId ?? item.city?.id ?? null,
        cityName: item.cityName ?? item.city?.name ?? '',
        locationId: item.locationId ?? item.location?.id ?? null,
        locationPreview: item.locationPreview || item.location || null,
        resourceLinks: normalizeProfileLinks(item.resourceLinks),
        tagIds: Array.isArray(item.tags) ? item.tags.map((tag) => tag.id) : (item.tagIds || []),
        contactEmail: item.contactInfo?.email || '',
        contactPhone: item.contactInfo?.phone || '',
        contactTelegram: item.contactInfo?.telegram || '',
        contactPerson: item.contactInfo?.contactPerson || '',
    }
}

function buildOpportunityPayload(opportunity) {
    const normalizedResourceLinks = Array.isArray(opportunity.resourceLinks)
        ? opportunity.resourceLinks
            .map((item, index) => {
                if (!item) return null

                const url = item.url?.trim?.() || item.value?.trim?.() || ''
                if (!url) return null

                return {
                    label: item.label?.trim?.() || item.title?.trim?.() || `Ссылка ${index + 1}`,
                    linkType: item.linkType || 'RESOURCE',
                    url,
                }
            })
            .filter(Boolean)
        : []

    let expiresAt = null

    if (opportunity.expiresAt) {
        const rawValue = String(opportunity.expiresAt).trim()

        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
            expiresAt = rawValue
        } else {
            const parsed = new Date(rawValue)
            if (!Number.isNaN(parsed.getTime())) {
                expiresAt = parsed.toISOString()
            }
        }
    }

    return {
        title: opportunity.title?.trim(),
        shortDescription: opportunity.shortDescription?.trim() || '',
        fullDescription:
            opportunity.fullDescription?.trim() ||
            opportunity.shortDescription?.trim() ||
            '',
        requirements: opportunity.requirements?.trim() || null,
        companyName:
            opportunity.companyName?.trim() ||
            opportunity.profileCompanyName ||
            'Компания работодателя',
        type: opportunity.type || 'VACANCY',
        workFormat: opportunity.workFormat || opportunity.format || 'REMOTE',
        employmentType: opportunity.employmentType || 'FULL_TIME',
        grade: opportunity.grade || opportunity.experienceLevel || 'JUNIOR',
        salaryFrom:
            opportunity.salaryFrom !== '' && opportunity.salaryFrom != null
                ? Number(opportunity.salaryFrom)
                : null,
        salaryTo:
            opportunity.salaryTo !== '' && opportunity.salaryTo != null
                ? Number(opportunity.salaryTo)
                : null,
        salaryCurrency: (opportunity.salaryCurrency || 'RUB').trim().toUpperCase(),
        expiresAt,
        eventDate: opportunity.eventDate || null,
        cityId: opportunity.cityId ? Number(opportunity.cityId) : null,
        locationId: opportunity.locationId ? Number(opportunity.locationId) : null,
        contactInfo: {
            email: opportunity.contactEmail?.trim?.() || opportunity.contactInfo?.email || null,
            phone: opportunity.contactPhone?.trim?.() || opportunity.contactInfo?.phone || null,
            telegram: opportunity.contactTelegram?.trim?.() || opportunity.contactInfo?.telegram || null,
            contactPerson: opportunity.contactPerson?.trim?.() || opportunity.contactInfo?.contactPerson || null,
        },
        resourceLinks: normalizedResourceLinks,
        tagIds: Array.isArray(opportunity.tagIds)
            ? opportunity.tagIds
                .map(Number)
                .filter((id) => Number.isFinite(id) && id > 0)
            : [],
    }
}

// ========== GEO API ==========

export async function searchGeoCities(search, limit = 20) {
    const normalizedSearch = String(search || '').trim()
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50)
    if (!normalizedSearch) return []

    const cacheKey = `${normalizedSearch.toLowerCase()}|${normalizedLimit}`
    const cached = geoCitySearchCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.items
    }

    const inFlight = geoCitySearchInFlight.get(cacheKey)
    if (inFlight) {
        return inFlight
    }

    const params = new URLSearchParams({
        search: normalizedSearch,
        limit: String(normalizedLimit),
    })

    const requestPromise = apiRequest(`${GEO_API_BASE}/cities?${params.toString()}`)
        .then((data) => {
            const items = Array.isArray(data) ? data.map(normalizeGeoCity) : []
            geoCitySearchCache.set(cacheKey, {
                items,
                expiresAt: Date.now() + GEO_CITY_SEARCH_CACHE_TTL_MS,
            })
            return items
        })
        .finally(() => {
            geoCitySearchInFlight.delete(cacheKey)
        })

    geoCitySearchInFlight.set(cacheKey, requestPromise)
    return requestPromise
}

export async function searchCities(query) {
    const normalizedQuery = String(query || '').trim()
    if (normalizedQuery.length < 2) return []
    return searchGeoCities(normalizedQuery, 20)
}

export async function suggestGeoAddress(payload) {
    const body = {
        query: payload?.query?.trim?.() || '',
        cityId: payload?.cityId ? Number(payload.cityId) : undefined,
    }

    if (!body.query) return []

    const cacheKey = `${String(body.cityId || '')}|${body.query.toLowerCase()}`
    const cached = geoAddressSuggestCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.items
    }

    const inFlight = geoAddressSuggestInFlight.get(cacheKey)
    if (inFlight) {
        return inFlight
    }

    const requestPromise = apiRequest(`${GEO_API_BASE}/address/suggest`, {
            method: 'POST',
            body: JSON.stringify(body),
        })
        .then((data) => {
            const items = Array.isArray(data) ? data.map(normalizeAddressSuggestion) : []
            geoAddressSuggestCache.set(cacheKey, {
                items,
                expiresAt: Date.now() + GEO_ADDRESS_SUGGEST_CACHE_TTL_MS,
            })
            return items
        })
        .finally(() => {
            geoAddressSuggestInFlight.delete(cacheKey)
    })

    geoAddressSuggestInFlight.set(cacheKey, requestPromise)
    return requestPromise
}

export async function resolveGeoAddress(unrestrictedValue) {
    const value = String(unrestrictedValue || '').trim()
    if (!value) {
        throw createApiError('Не указан unrestrictedValue', 400)
    }

    const data = await apiRequest(`${GEO_API_BASE}/address/resolve`, {
        method: 'POST',
        body: JSON.stringify({ unrestrictedValue: value }),
    })

    return normalizeAddressResolveResponse(data)
}

export async function getGeoCity(cityId) {
    if (!cityId) throw createApiError('Не указан cityId', 400)
    const data = await apiRequest(`${GEO_API_BASE}/cities/${cityId}`)
    return normalizeGeoCity(data)
}

export async function getGeoLocation(locationId) {
    if (!locationId) throw createApiError('Не указан locationId', 400)
    const data = await apiRequest(`${GEO_API_BASE}/locations/${locationId}`)
    return normalizeLocation(data)
}

// ========== СОИСКАТЕЛЬ ==========

export async function getApplicantProfile() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        clearApplicantProfileCache()
        return null
    }

    const isFresh =
        applicantProfileCache &&
        applicantProfileCacheUserId === userId &&
        Date.now() - applicantProfileCacheAt < APPLICANT_PROFILE_CACHE_TTL_MS

    if (isFresh) {
        return applicantProfileCache
    }

    if (applicantProfileInFlight) {
        return applicantProfileInFlight
    }

    try {
        applicantProfileInFlight = apiRequest(`${API_BASE}/profile/applicant/${userId}?currentUserId=${userId}`)
            .then((data) => setApplicantProfileCache(normalizeApplicantProfile(data), userId))
            .catch((error) => {
                applicantProfileInFlight = null
                throw error
            })

        return await applicantProfileInFlight
    } catch (error) {
        if (error.status === 404) {
            clearApplicantProfileCache()
            return null
        }
        throw error
    }
}

export async function getApplicantProfileWorkspace(userId) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const data = await apiRequest(`${API_BASE}/profile/applicant/${userId}/workspace?currentUser=${currentUser}`)

    const currentProfile = normalizeApplicantProfile(data?.currentProfile || {})
    const publicProfile = data?.publicProfile
        ? normalizeApplicantProfile(data.publicProfile)
        : null

    return {
        currentProfile,
        publicProfile,
        moderationStatus: data?.moderationStatus || currentProfile.moderationStatus || 'DRAFT',
        hasApprovedPublicVersion: Boolean(data?.hasApprovedPublicVersion),
    }
}

export async function updateApplicantProfile(profile) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const skillTagIds = Array.isArray(profile.skillTagIds)
        ? profile.skillTagIds
        : Array.isArray(profile.skills)
            ? profile.skills.map((tag) => tag.id).filter(Boolean)
            : undefined
    const interestTagIds = Array.isArray(profile.interestTagIds)
        ? profile.interestTagIds
        : Array.isArray(profile.interests)
            ? profile.interests.map((tag) => tag.id).filter(Boolean)
            : undefined

    const payload = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        middleName: profile.middleName || null,
        universityName: profile.universityName || null,
        facultyName: profile.facultyName || null,
        studyProgram: profile.studyProgram || null,
        course: profile.course ? Number(profile.course) : null,
        graduationYear: profile.graduationYear ? Number(profile.graduationYear) : null,
        cityId: profile.cityId || null,
        about: profile.about || null,
        resumeText: profile.resumeText || null,
        portfolioLinks: normalizeProfileLinks(profile.portfolioLinks),
        contactLinks: normalizeContactMethods(profile.contactLinks),
        profileVisibility: profile.profileVisibility || 'AUTHENTICATED',
        resumeVisibility: profile.resumeVisibility || 'AUTHENTICATED',
        applicationsVisibility: profile.applicationsVisibility || 'PRIVATE',
        contactsVisibility: profile.contactsVisibility || 'AUTHENTICATED',
        openToWork: profile.openToWork ?? true,
        openToEvents: profile.openToEvents ?? true,
        skillTagIds,
        interestTagIds,
    }

    const data = await apiRequest(`${API_BASE}/profile/applicant?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    invalidateProfileOnboardingStatusCache()
    return setApplicantProfileCache(normalizeApplicantProfile(data))
}

// ========== РАБОТОДАТЕЛЬ ==========

export async function getEmployerProfile() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        return null
    }

    return getPublicEmployerProfile(userId)
}

export async function getPublicEmployerProfile(userId, options = {}) {
    const normalizedUserId = Number(userId)
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
        return null
    }

    const currentUserId = await getSessionUserIdFromApi()
    const query = currentUserId ? `?currentUserId=${currentUserId}` : ''

    try {
        const data = await httpJson(`${API_BASE}/profile/employer/${normalizedUserId}${query}`, {
            dedupe: true,
            cacheTtlMs: options.cacheTtlMs ?? 30_000,
        })
        return normalizeEmployerProfile(data)
    } catch (error) {
        if (error.status === 404) {
            return null
        }

        throw error
    }
}

export async function updateEmployerProfile(profile) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const payload = {
        companyName: profile.companyName || null,
        description: profile.description || null,
        industry: profile.industry || null,
        websiteUrl: profile.websiteUrl || null,
        cityId: profile.cityId || null,
        locationId: profile.locationId || null,
        companySize: profile.companySize || null,
        foundedYear: profile.foundedYear ? Number(profile.foundedYear) : null,
        socialLinks: normalizeProfileLinks(profile.socialLinks),
        publicContacts: normalizeContactMethods(profile.publicContacts),
    }

    const data = await apiRequest(`${API_BASE}/profile/employer?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    invalidateProfileOnboardingStatusCache()
    return normalizeEmployerProfile(data)
}

export async function updateEmployerCompanyData(companyData) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const payload = {
        legalName: companyData.legalName || '',
        inn: companyData.inn || '',
    }

    const data = await apiRequest(`${API_BASE}/profile/employer/company?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    invalidateProfileOnboardingStatusCache()
    return normalizeEmployerProfile(data)
}

export async function submitEmployerProfileForModeration() {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    return apiRequest(`${API_BASE}/profile/employer/moderation/submit?currentUser=${currentUser}`, {
        method: 'POST',
    })
}

export async function submitVerification(payload, files = []) {
    const body = {
        verificationMethod: payload.verificationMethod,
        corporateEmail: payload.corporateEmail || null,
        professionalLinks: Array.isArray(payload.professionalLinks)
            ? payload.professionalLinks.filter(Boolean)
            : [],
        submittedComment: payload.submittedComment || null,
    }

    return createEmployerVerification(body, files)
}

// ========== EMPLOYER LOCATIONS ==========

export async function getEmployerLocations() {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const data = await apiRequest(`${API_BASE}/profile/employer/locations?currentUser=${currentUser}`)
    return Array.isArray(data) ? data.map(normalizeLocation) : []
}

export async function createEmployerLocation(location) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const payload = buildEmployerLocationPayload(location)

    const data = await apiRequest(`${API_BASE}/profile/employer/locations?currentUser=${currentUser}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })

    return normalizeLocation(data)
}

export async function updateEmployerLocation(locationId, location) {
    if (!locationId) throw createApiError('Не указан locationId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const payload = buildEmployerLocationPayload(location)

    const data = await apiRequest(`${API_BASE}/profile/employer/locations/${locationId}?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    return normalizeLocation(data)
}

export async function deleteEmployerLocation(locationId) {
    if (!locationId) throw createApiError('Не указан locationId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    return apiRequest(`${API_BASE}/profile/employer/locations/${locationId}?currentUser=${currentUser}`, {
        method: 'DELETE',
    })
}

// ========== INTERACTION API: СОИСКАТЕЛЬ ==========

const WRITABLE_RESPONSE_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW', 'RESERVE', 'ACCEPTED'])

function normalizeChatSummary(raw, status) {
    if (raw) {
        return {
            dialogId: raw.dialogId ?? null,
            hasChat: Boolean(raw.hasChat),
            unreadCount: Number(raw.unreadCount || 0),
            canSend: Boolean(raw.canSend),
            lastMessageAt: raw.lastMessageAt || null,
        }
    }

    return {
        dialogId: null,
        hasChat: false,
        unreadCount: 0,
        canSend: WRITABLE_RESPONSE_STATUSES.has(status),
        lastMessageAt: null,
    }
}

function mapProfileApplicationSummary(application, index) {
    const opportunityId = application.opportunityId ?? application.opportunity?.id ?? null
    const fallbackTitle = opportunityId ? `Вакансия #${opportunityId}` : `Отклик #${application.id ?? index + 1}`
    const status = application.status || 'SUBMITTED'

    return {
        id: application.id ?? `${opportunityId ?? 'unknown'}-${application.createdAt ?? index}`,
        opportunityId,
        position: application.opportunityTitle || application.title || fallbackTitle,
        title: application.opportunityTitle || application.title || fallbackTitle,
        companyName: application.companyName || 'Компания',
        status,
        message: application.employerComment || application.applicantComment || 'Отклик отправлен',
        appliedAt: application.createdAt,
        createdAt: application.createdAt,
        chatSummary: normalizeChatSummary(application.chatSummary, status),
    }
}

async function getApplicantApplicationsViaProfile(userId) {
    const normalizedUserId = Number(userId)
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
        return []
    }

    const requestProfileApplications = async (querySuffix) => {
        const data = await apiRequest(
            `${API_BASE}/profile/applicant/${normalizedUserId}/applications?${querySuffix}`
        )
        if (!Array.isArray(data)) return []
        return data.map(mapProfileApplicationSummary)
    }

    try {
        const currentUser = encodeURIComponent(JSON.stringify(await getRequiredCurrentUserPayload()))
        return await requestProfileApplications(`currentUser=${currentUser}`)
    } catch (error) {
        if (![401, 403, 404, 500, 502, 503].includes(error?.status) && error?.status !== 0) {
            throw error
        }

        return requestProfileApplications(`currentUserId=${normalizedUserId}`)
    }
}

export async function getSeekerContacts() {
    try {
        const contacts = await getContacts()

        if (!Array.isArray(contacts)) {
            return []
        }

        return contacts.map(normalizeInteractionContact)
    } catch (error) {
        if (error?.code === 'applicant_networking_requires_approved_profile') {
            throw error
        }

        if (error?.status === 401) {
            return []
        }

        if ([403, 404, 500, 502, 503].includes(error?.status) || error?.status === 0) {
            return []
        }

        throw error
    }
}

export async function addContact(contactUserId) {
    return addContactApi(contactUserId)
}

export async function acceptContact(contactUserId) {
    return acceptContactRequest(contactUserId)
}

export async function declineContact(contactUserId) {
    return declineContactRequest(contactUserId)
}

export async function removeContact(contactUserId) {
    return removeContactApi(contactUserId)
}

function mapInteractionApplications(responses) {
    if (!Array.isArray(responses)) return []

    return responses.map((response, index) => {
        const opportunityId = response.opportunityId ?? response.opportunity?.id ?? null
        const fallbackTitle = opportunityId ? `Вакансия #${opportunityId}` : `Отклик #${response.id ?? index + 1}`
        const status = response.status || 'SUBMITTED'

        return {
            id: response.id ?? `${opportunityId ?? 'unknown'}-${response.createdAt ?? index}`,
            opportunityId,
            position: response.opportunityTitle || response.opportunity?.title || fallbackTitle,
            title: response.opportunityTitle || response.opportunity?.title || fallbackTitle,
            companyName: response.companyName || 'Компания',
            status,
            message: response.employerComment || response.applicantComment || 'Отклик отправлен',
            appliedAt: response.createdAt,
            createdAt: response.createdAt,
            chatSummary: normalizeChatSummary(response.chatSummary, status),
        }
    })
}

export async function getSeekerApplications() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    try {
        const responses = await getMyResponses()
        return mapInteractionApplications(responses)
    } catch (error) {
        if ([401, 403, 404, 500, 502, 503].includes(error.status) || error.status === 0) {
            try {
                return await getApplicantApplicationsViaProfile(userId)
            } catch {
                return []
            }
        }

        throw error
    }
}

export async function applyToOpportunity(opportunityId, message = '') {
    try {
        return await createResponse(opportunityId, message)
    } catch (error) {
        if (error.message?.toLowerCase().includes('already')) {
            throw createApiError('already_applied', error.status || 409)
        }
        throw error
    }
}

export async function getSeekerSaved() {
    try {
        const favorites = await getFavorites()
        if (!Array.isArray(favorites)) return []

        return favorites
            .map((f, index) => {
                const opportunityId =
                    f.targetId ??
                    f.opportunityId ??
                    f.opportunity_id ??
                    f.opportunity?.id ??
                    f.id ??
                    null

                const opportunityTitle =
                    f.opportunityTitle ||
                    f.title ||
                    f.opportunity?.title ||
                    (opportunityId ? `Вакансия #${opportunityId}` : `Вакансия ${index + 1}`)

                return {
                    id: opportunityId,
                    title: opportunityTitle,
                    companyName: f.companyName || f.subtitle || f.opportunity?.companyName || 'Компания',
                    shortDescription: f.shortDescription || f.opportunity?.shortDescription || '',
                    salaryFrom: f.salaryFrom ?? f.opportunity?.salaryFrom ?? null,
                    salaryTo: f.salaryTo ?? f.opportunity?.salaryTo ?? null,
                    salaryCurrency: f.salaryCurrency ?? f.opportunity?.salaryCurrency ?? null,
                    type: f.type ?? f.opportunity?.type ?? null,
                    workFormat: f.workFormat ?? f.opportunity?.workFormat ?? null,
                    savedAt: f.createdAt || f.savedAt || null,
                }
            })
            .filter((item) => item.id !== null && item.id !== undefined)
    } catch (error) {
        if ([401, 403, 404, 500, 502, 503].includes(error.status) || error.status === 0) {
            return []
        }

        throw error
    }
}

export async function addToSaved(opportunity) {
    const opportunityId = Number(typeof opportunity === 'object' ? opportunity.id : opportunity)
    let result = null

    try {
        result = await addToFavorites(opportunityId)
    } catch (error) {
        if (![404, 0, 502, 503].includes(error?.status)) {
            throw error
        }
    }

    if (Number.isFinite(opportunityId) && opportunityId > 0) {
        const nextIds = getLocalFavoriteOpportunityIds()
        if (!nextIds.includes(opportunityId)) {
            setLocalFavoriteOpportunityIds([...nextIds, opportunityId])
        }
    }

    invalidateSavedFavoritesCache()

    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'added', opportunityId }
    }))

    return result
}

export async function removeFromSaved(opportunityId) {
    const normalizedId = Number(opportunityId)
    let result = null

    try {
        result = await removeFromFavorites(normalizedId)
    } catch (error) {
        if (![404, 0, 502, 503].includes(error?.status)) {
            throw error
        }
    }

    if (Number.isFinite(normalizedId) && normalizedId > 0) {
        setLocalFavoriteOpportunityIds(
            getLocalFavoriteOpportunityIds().filter((id) => id !== normalizedId)
        )
    }

    invalidateSavedFavoritesCache()

    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'removed', opportunityId: normalizedId }
    }))

    return result
}

export async function getSeekerRecommendations() {
    try {
        const [incoming, outgoing] = await Promise.all([
            getIncomingRecommendations(),
            getOutgoingRecommendations(),
        ])

        return {
            incoming: Array.isArray(incoming) ? incoming : [],
            outgoing: Array.isArray(outgoing) ? outgoing : [],
        }
    } catch (error) {
        if (error?.code === 'applicant_networking_requires_approved_profile') {
            throw error
        }

        if ([401, 403, 404, 500, 502, 503].includes(error.status) || error.status === 0) {
            return { incoming: [], outgoing: [] }
        }

        throw error
    }
}

export async function sendSeekerRecommendation(data) {
    return createRecommendation(data)
}

export async function removeSeekerRecommendation(recommendationId) {
    return deleteRecommendation(recommendationId)
}

// ========== EMPLOYER OPPORTUNITIES ==========

export async function getEmployerOpportunities(params = {}) {
    try {
        const page = await listEmployerOpportunities({
            limit: params.limit || 50,
            offset: params.offset || 0,
            sortBy: params.sortBy || 'UPDATED_AT',
            sortDirection: params.sortDirection || 'DESC',
            status: params.status,
            group: params.group,
            type: params.type,
            workFormat: params.workFormat,
            search: params.search,
        })

        const safePage = page || { items: [], total: 0, limit: 50, offset: 0 }
        return {
            ...safePage,
            items: Array.isArray(safePage.items) ? safePage.items.map(normalizeOpportunity) : [],
        }
    } catch (error) {
        if ([500, 503].includes(error?.status)) {
            return { items: [], total: 0, limit: 50, offset: 0 }
        }
        throw error
    }
}

export async function getEmployerOpportunityById(opportunityId) {
    const data = await getEmployerOpportunity(opportunityId)
    return normalizeOpportunity(data)
}

export async function createOpportunity(opportunity) {
    const payload = buildOpportunityPayload(opportunity)
    const created = await createEmployerOpportunity(payload)
    return normalizeOpportunity(created)
}

export async function updateOpportunity(opportunityId, opportunity) {
    const payload = buildOpportunityPayload(opportunity)
    const updated = await updateEmployerOpportunity(opportunityId, payload)
    return normalizeOpportunity(updated)
}

export async function updateOpportunityStatus(opportunityId, action) {
    if (action === 'close') {
        return closeEmployerOpportunity(opportunityId)
    }

    if (action === 'archive') {
        return archiveEmployerOpportunity(opportunityId)
    }

    if (action === 'draft') {
        return returnToDraftEmployerOpportunity(opportunityId)
    }

    throw createApiError('Неизвестное действие со статусом', 400)
}

export async function deleteOpportunity(opportunityId) {
    await archiveEmployerOpportunity(opportunityId)
    return { success: true }
}

// ========== EMPLOYER RESPONSES ==========

export async function getEmployerApplications(params = {}) {
    try {
        const page = await getEmployerResponses({
            limit: params.limit || 50,
            offset: params.offset || 0,
            sortBy: params.sortBy || 'CREATED_AT',
            sortDirection: params.sortDirection || 'DESC',
            opportunityId: params.opportunityId,
            status: params.status,
            search: params.search,
        })

        return {
            ...page,
            items: Array.isArray(page?.items) ? page.items : [],
        }
    } catch (error) {
        if ([500, 503].includes(error?.status)) {
            return { items: [], total: 0, limit: params.limit || 50, offset: params.offset || 0 }
        }
        throw error
    }
}

export async function updateApplicationStatus(applicationId, status, employerComment = '') {
    return updateInteractionResponseStatus(applicationId, status, employerComment)
}

export async function submitApplicantProfileForModeration() {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const data = await apiRequest(`${API_BASE}/profile/applicant/moderation/submit?currentUser=${currentUser}`, {
        method: 'POST',
    })

    invalidateProfileOnboardingStatusCache()
    return normalizeApplicantProfile(data)
}

export async function completeApplicantOnboarding(profile) {
    const saved = await updateApplicantProfile(profile)

    try {
        await submitApplicantProfileForModeration()
    } catch (error) {
        if (error?.status !== 409) {
            throw error
        }
    }

    invalidateProfileOnboardingStatusCache()
    return saved
}

export async function getEmployerProfileWorkspace(userId) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    return apiRequest(`${API_BASE}/profile/employer/${userId}/workspace?currentUser=${currentUser}`)
}

export async function completeEmployerOnboarding({
                                                     companyData,
                                                     publicProfile,
                                                     verification,
                                                 }) {
    await updateEmployerCompanyData(companyData)
    await updateEmployerProfile(publicProfile)

    if (verification) {
        try {
            await submitVerification(verification)
        } catch (error) {
            const code = String(error?.code || '').toLowerCase()
            if (
                error?.status !== 409 &&
                code !== 'employer_verification_already_exists' &&
                code !== 'verification_already_exists'
            ) {
                throw error
            }
        }
    }

    try {
        await submitEmployerProfileForModeration()
    } catch (error) {
        if (error?.status !== 409) {
            throw error
        }
    }

    invalidateProfileOnboardingStatusCache()

    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return getEmployerProfileWorkspace(userId)
}

// ========== VERIFICATION ATTACHMENTS ==========

export function getVerificationAttachmentDownloadUrl(employerUserId, fileId) {
    if (!employerUserId || !fileId) return null
    return `${API_BASE}/profile/employer/${employerUserId}/files/${fileId}`
}

export async function openVerificationAttachment(attachment) {
    const fileId = attachment?.fileId || attachment?.file?.fileId || attachment?.attachmentId || attachment?.id
    const verificationId = attachment?.entityId || attachment?.verificationId

    if (verificationId && fileId) {
        const url = await getEmployerVerificationAttachmentOpenUrl(verificationId, fileId)
        window.open(url, '_blank', 'noopener,noreferrer')
        return
    }

    const ownerUserId = attachment?.ownerUserId || attachment?.file?.ownerUserId

    if (ownerUserId && fileId) {
        const url = `${API_BASE}/profile/employer/${ownerUserId}/files/${fileId}`
        window.open(url, '_blank', 'noopener,noreferrer')
        return
    }

    throw new Error('Невозможно открыть файл: отсутствует URL')
}

export async function deleteVerificationAttachment(fileId) {
    if (!fileId) throw createApiError('Не указан fileId', 400)

    return deleteEmployerFile(fileId)
}
