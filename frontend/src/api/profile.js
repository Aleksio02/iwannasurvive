const API_BASE = '/api'

import { CITIES } from '../constants/cities'
import {
    archiveEmployerOpportunity,
    createEmployerOpportunity,
    listEmployerOpportunities
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
} from './interaction'
import { clearSessionUser, getSessionUser, getSessionUserId } from '../utils/sessionStore'

function createApiError(message, status = 0) {
    const error = new Error(message)
    error.status = status
    return error
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

async function apiRequest(endpoint, options = {}) {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`)

    let response
    try {
        response = await fetch(endpoint, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
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
            'Ошибка запроса'

        if (response.status === 401 || response.status === 403) {
            clearSessionUser()
        }

        throw createApiError(errorMessage, response.status)
    }

    return data
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
                    const url = item.url?.trim?.() || ''
                    if (!url) return null

                    return {
                        label: item.label?.trim?.() || item.title?.trim?.() || `Ссылка ${index + 1}`,
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
                const normalizedUrl = typeof url === 'string' ? url.trim() : ''
                if (!normalizedUrl) return null

                return {
                    label: label?.trim?.() || `Ссылка ${index + 1}`,
                    url: normalizedUrl,
                }
            })
            .filter(Boolean)
    }

    return []
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
                        type: 'OTHER',
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

                    return {
                        type: item.type || 'OTHER',
                        value,
                        label: item.label?.trim?.() || item.title?.trim?.() || `Контакт ${index + 1}`,
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

                return {
                    type: 'OTHER',
                    value: normalizedValue,
                    label: label?.trim?.() || `Контакт ${index + 1}`,
                }
            })
            .filter(Boolean)
    }

    return []
}

// ========== ПОИСК ГОРОДОВ (локальная версия) ==========

export async function searchCities(query) {
    if (!query || query.length < 2) return []

    const lowerQuery = query.toLowerCase()
    const filtered = CITIES.filter(city =>
        city.name.toLowerCase().includes(lowerQuery)
    )

    console.log('[API] Cities found (local):', filtered)
    return filtered.slice(0, 10)
}

// ========== СОИСКАТЕЛЬ ==========

export async function getApplicantProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/applicant/${userId}`
    console.log('[API] GET applicant profile:', url)

    try {
        const data = await apiRequest(url)
        console.log('[API] Applicant profile received:', data)

        return {
            ...data,
            portfolioLinks: normalizeProfileLinks(data.portfolioLinks),
            contactLinks: normalizeContactMethods(data.contactLinks),
        }
    } catch (error) {
        if ([401, 403, 404, 500, 503].includes(error.status)) {
            console.log('[API] Applicant profile unavailable:', error.message)
            return null
        }

        throw error
    }
}

export async function updateApplicantProfile(profile) {
    const user = getSessionUser()
    if (!user) {
        throw createApiError('Пользователь не авторизован', 401)
    }

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
    }

    console.log('[API] Saving applicant profile with PATCH:', payload)

    return apiRequest(`${API_BASE}/profile/applicant`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}

// ========== РАБОТОДАТЕЛЬ ==========

export async function getEmployerProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/employer/${userId}`

    try {
        const data = await apiRequest(url)
        console.log('[API] Employer profile received:', data)

        return {
            ...data,
            socialLinks: normalizeProfileLinks(data.socialLinks),
            publicContacts: normalizeContactMethods(data.publicContacts),
        }
    } catch (error) {
        if ([401, 403, 404, 500, 503].includes(error.status)) {
            console.log('[API] Employer profile unavailable:', error.message)
            return null
        }

        throw error
    }
}

export async function updateEmployerProfile(profile) {
    const user = getSessionUser()
    if (!user) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    const payload = {
        companyName: profile.companyName || '',
        legalName: profile.legalName || null,
        inn: profile.inn || '',
        description: profile.description || null,
        industry: profile.industry || null,
        websiteUrl: profile.websiteUrl || null,
        cityId: profile.cityId || null,
        locationId: profile.locationId || null,
        companySize: profile.companySize || null,
        foundedYear: profile.foundedYear ? Number(profile.foundedYear) : null,
        socialLinks: normalizeProfileLinks(profile.socialLinks),
        publicContacts: normalizeContactMethods(profile.publicContacts),
        verificationStatus: profile.verificationStatus || 'PENDING',
    }

    console.log('[API] Saving employer profile with PATCH:', JSON.stringify(payload, null, 2))

    return apiRequest(`${API_BASE}/profile/employer`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}

export async function submitVerification(payload) {
    const user = getSessionUser()
    if (!user) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    console.log('[API] Submitting verification:', payload)

    return apiRequest(`${API_BASE}/employer/verification`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

// ========== INTERACTION API: СОИСКАТЕЛЬ ==========

export async function getSeekerContacts() {
    try {
        const contacts = await getContacts()
        if (!Array.isArray(contacts)) return []

        return contacts.map((c) => ({
            id: c.contactUserId,
            firstName: c.contactName?.split(' ')[0] || '',
            lastName: c.contactName?.split(' ').slice(1).join(' ') || '',
            status: c.status,
            createdAt: c.createdAt,
        }))
    } catch (error) {
        if ([401, 403, 500, 503].includes(error.status)) {
            console.error('[API] Failed to load contacts:', error.message)
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

export async function getSeekerApplications() {
    try {
        const responses = await getMyResponses()
        if (!Array.isArray(responses)) return []

        return responses.map((r, index) => {
            const opportunityId = r.opportunityId ?? r.opportunity?.id ?? null
            const fallbackTitle = opportunityId ? `Вакансия #${opportunityId}` : `Отклик #${r.id ?? index + 1}`

            return {
                id: r.id ?? `${opportunityId ?? 'unknown'}-${r.createdAt ?? index}`,
                opportunityId,
                position: r.opportunityTitle || r.opportunity?.title || fallbackTitle,
                title: r.opportunityTitle || r.opportunity?.title || fallbackTitle,
                companyName: r.companyName || 'Компания',
                status: r.status || 'SUBMITTED',
                message: r.employerComment || r.applicantComment || 'Отклик отправлен',
                appliedAt: r.createdAt,
                createdAt: r.createdAt,
            }
        })
    } catch (error) {
        if ([401, 403, 500, 503].includes(error.status)) {
            console.error('[API] Failed to load applications:', error.message)
            return []
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
        if ([401, 403, 500, 503].includes(error.status)) {
            console.error('[API] Failed to load favorites:', error.message)
            return []
        }

        throw error
    }
}

export async function addToSaved(opportunity) {
    const opportunityId = typeof opportunity === 'object' ? opportunity.id : opportunity
    const result = await addToFavorites(opportunityId)

    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'added', opportunityId }
    }))

    return result
}

export async function removeFromSaved(opportunityId) {
    const result = await removeFromFavorites(opportunityId)

    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'removed', opportunityId }
    }))

    return result
}

export async function getEmployerOpportunities(params = {}) {
    const page = await listEmployerOpportunities({
        limit: params.limit || 20,
        offset: params.offset || 0,
        sortBy: params.sortBy || 'UPDATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        status: params.status,
        group: params.group,
        type: params.type,
        workFormat: params.workFormat,
        search: params.search,
    })

    return page?.items || []
}

function normalizeTagIds(tagIds) {
    if (!Array.isArray(tagIds)) return []
    return tagIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
}

export async function createOpportunity(opportunity) {
    const payload = {
        title: opportunity.title?.trim(),
        shortDescription: opportunity.shortDescription?.trim() || opportunity.description?.trim() || '',
        fullDescription: opportunity.fullDescription?.trim() || opportunity.description?.trim() || '',
        requirements: opportunity.requirements?.trim() || null,
        companyName: opportunity.companyName?.trim() || opportunity.profileCompanyName || 'Компания работодателя',
        type: opportunity.type || 'VACANCY',
        workFormat: opportunity.workFormat || opportunity.format || 'REMOTE',
        employmentType: opportunity.employmentType || 'FULL_TIME',
        grade: opportunity.grade || opportunity.experienceLevel || 'JUNIOR',
        salaryFrom: opportunity.salaryFrom ? Number(opportunity.salaryFrom) : null,
        salaryTo: opportunity.salaryTo ? Number(opportunity.salaryTo) : null,
        salaryCurrency: opportunity.salaryCurrency || 'RUB',
        expiresAt: opportunity.expiresAt || opportunity.deadline || null,
        eventDate: opportunity.eventDate || null,
        cityId: opportunity.cityId ? Number(opportunity.cityId) : null,
        locationId: opportunity.locationId ? Number(opportunity.locationId) : null,
        contactInfo: {
            email: opportunity.contactEmail || null,
            phone: opportunity.contactPhone || null,
            telegram: opportunity.contactTelegram || null,
            contactPerson: opportunity.contactPerson || null,
        },
        resourceLinks: Array.isArray(opportunity.resourceLinks) ? opportunity.resourceLinks : [],
        tagIds: normalizeTagIds(opportunity.tagIds),
    }

    return createEmployerOpportunity(payload)
}

export async function deleteOpportunity(opportunityId) {
    await archiveEmployerOpportunity(opportunityId)
    return { success: true }
}

export async function getEmployerApplications() {
    const user = getSessionUser()
    if (!user) return []

    const key = `employer_applications_${user.email}`
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
}

export async function updateApplicationStatus(applicationId, status) {
    const user = getSessionUser()
    if (!user) throw createApiError('Пользователь не авторизован', 401)

    const key = `employer_applications_${user.email}`
    const saved = localStorage.getItem(key)
    const applications = saved ? JSON.parse(saved) : []

    const updated = applications.map(app =>
        app.id === applicationId ? { ...app, status } : app
    )

    localStorage.setItem(key, JSON.stringify(updated))
    return { success: true }
}