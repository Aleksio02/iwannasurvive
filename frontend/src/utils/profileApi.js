const API_BASE = '/api'
import { CITIES } from '../constants/cities'
import {
    archiveEmployerOpportunity,
    createEmployerOpportunity,
    listEmployerOpportunities
} from '../api/opportunities'
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
} from '../api/interaction'
import { getSessionUser, getSessionUserId } from './sessionStore'

async function apiRequest(endpoint, options = {}) {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`)

    const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    })

    if (!response.ok) {
        let errorMessage = 'Ошибка запроса'
        try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
            // ignore
        }
        throw new Error(errorMessage)
    }

    return response.json()
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

/**
 * Получение профиля соискателя
 * GET /api/profile/applicant/{userId}
 */
export async function getApplicantProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/applicant/${userId}`

    try {
        const data = await apiRequest(url)
        console.log('[API] Applicant profile received:', data)
        return data
    } catch (error) {
        console.log('[API] Profile not found:', error.message)
        return null
    }
}

/**
 * Обновление профиля соискателя
 * PATCH /api/profile/applicant (текущий пользователь из сессии)
 */
export async function updateApplicantProfile(profile) {
    const user = getSessionUser()
    if (!user) {
        throw new Error('Пользователь не авторизован')
    }

    // Если приходит массив объектов, преобразуем в массив строк
    let portfolioLinks = []
    let contactLinks = []

    if (profile.portfolioLinks) {
        if (Array.isArray(profile.portfolioLinks)) {
            // Если это массив строк
            if (profile.portfolioLinks.length > 0 && typeof profile.portfolioLinks[0] === 'string') {
                portfolioLinks = profile.portfolioLinks
            }
            // Если это массив объектов
            else if (profile.portfolioLinks.length > 0 && profile.portfolioLinks[0].url) {
                portfolioLinks = profile.portfolioLinks.map(link => link.url)
            }
        } else if (typeof profile.portfolioLinks === 'object') {
            // Если это объект
            portfolioLinks = Object.values(profile.portfolioLinks)
        }
    }

    if (profile.contactLinks) {
        if (Array.isArray(profile.contactLinks)) {
            if (profile.contactLinks.length > 0 && typeof profile.contactLinks[0] === 'string') {
                contactLinks = profile.contactLinks
            } else if (profile.contactLinks.length > 0 && profile.contactLinks[0].url) {
                contactLinks = profile.contactLinks.map(link => link.url)
            }
        } else if (typeof profile.contactLinks === 'object') {
            contactLinks = Object.values(profile.contactLinks)
        }
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
        portfolioLinks: portfolioLinks,
        contactLinks: contactLinks,
        profileVisibility: profile.profileVisibility || 'AUTHENTICATED',
        resumeVisibility: profile.resumeVisibility || 'AUTHENTICATED',
        applicationsVisibility: profile.applicationsVisibility || 'PRIVATE',
        contactsVisibility: profile.contactsVisibility || 'AUTHENTICATED',
        openToWork: profile.openToWork ?? true,
        openToEvents: profile.openToEvents ?? true,
    }

    console.log('[API] Saving applicant profile with PATCH:', payload)

    const url = `${API_BASE}/profile/applicant`
    const data = await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
    return data
}

// ========== РАБОТОДАТЕЛЬ ==========

/**
 * Получение профиля работодателя
 * GET /api/profile/employer/{userId}
 */
export async function getEmployerProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/employer/${userId}`

    try {
        const data = await apiRequest(url)
        console.log('[API] Employer profile received:', data)

        // Преобразуем socialLinks (массив строк) в формат для LinksEditor
        const socialLinksArray = data.socialLinks && Array.isArray(data.socialLinks)
            ? data.socialLinks.map((url, index) => ({
                id: index,
                title: `Ссылка ${index + 1}`,
                url: url
            }))
            : []

        // Преобразуем publicContacts (объект) в формат для LinksEditor
        const publicContactsArray = data.publicContacts && typeof data.publicContacts === 'object'
            ? Object.entries(data.publicContacts).map(([title, url], index) => ({
                id: index,
                title: title,
                url: url
            }))
            : []

        return {
            ...data,
            socialLinks: socialLinksArray,
            publicContacts: publicContactsArray,
        }
    } catch (error) {
        console.log('[API] Profile not found:', error.message)
        return null
    }
}

/**
 * Обновление профиля работодателя
 * PATCH /api/profile/employer (текущий пользователь из сессии)
 */
export async function updateEmployerProfile(profile) {
    const user = getSessionUser()
    if (!user) {
        throw new Error('Пользователь не авторизован')
    }

    // Преобразуем socialLinks - ожидается массив строк
    let socialLinks = []
    if (profile.socialLinks) {
        if (Array.isArray(profile.socialLinks)) {
            // Если это массив объектов с title/url
            if (profile.socialLinks.length > 0 && profile.socialLinks[0].title !== undefined) {
                socialLinks = profile.socialLinks
                    .filter(link => link.url?.trim())
                    .map(link => link.url.trim())
            }
            // Если это уже массив строк
            else if (profile.socialLinks.length > 0 && typeof profile.socialLinks[0] === 'string') {
                socialLinks = profile.socialLinks.filter(url => url?.trim())
            }
        } else if (typeof profile.socialLinks === 'object') {
            // Если это объект, преобразуем в массив значений
            socialLinks = Object.values(profile.socialLinks).filter(url => url?.trim())
        }
    }

    // Преобразуем publicContacts - ожидается объект Map<String, String>
    let publicContacts = {}
    if (profile.publicContacts) {
        if (Array.isArray(profile.publicContacts)) {
            // Если это массив объектов с title/url
            if (profile.publicContacts.length > 0 && profile.publicContacts[0].title !== undefined) {
                profile.publicContacts.forEach(contact => {
                    const title = contact.title?.trim()
                    const url = contact.url?.trim()
                    if (title && url) {
                        publicContacts[title] = url
                    }
                })
            }
            // Если это массив строк
            else if (profile.publicContacts.length > 0 && typeof profile.publicContacts[0] === 'string') {
                profile.publicContacts.forEach((url, index) => {
                    if (url?.trim()) {
                        publicContacts[`contact_${index + 1}`] = url.trim()
                    }
                })
            }
        } else if (typeof profile.publicContacts === 'object') {
            // Если это уже объект
            publicContacts = profile.publicContacts
        }
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
        socialLinks: socialLinks,
        publicContacts: publicContacts,
        verificationStatus: profile.verificationStatus || 'PENDING',
    }

    console.log('[API] Saving employer profile with PATCH:', JSON.stringify(payload, null, 2))

    const url = `${API_BASE}/profile/employer`
    console.log('[API] PATCH employer profile:', url)

    const data = await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
    console.log('[API] Employer profile saved:', data)
    return data
}

/**
 * Отправка на верификацию
 * POST /api/employer/verification
 */
export async function submitVerification(payload) {
    const user = getSessionUser()
    if (!user) {
        throw new Error('Пользователь не авторизован')
    }

    const url = `${API_BASE}/employer/verification`
    console.log('[API] Submitting verification:', payload)

    const data = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
    console.log('[API] Verification response:', data)
    return data
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
        console.error('[API] Failed to load contacts:', error)
        return []
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
        console.error('[API] Failed to load applications:', error)
        return []
    }
}

export async function applyToOpportunity(opportunityId, message = '') {
    try {
        return await createResponse(opportunityId, message)
    } catch (error) {
        if (error.message?.toLowerCase().includes('already')) {
            throw new Error('already_applied')
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
        console.error('[API] Failed to load favorites:', error)
        return []
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
    if (!user) throw new Error('Пользователь не авторизован')
    const key = `employer_applications_${user.email}`
    const saved = localStorage.getItem(key)
    const applications = saved ? JSON.parse(saved) : []
    const updated = applications.map(app =>
        app.id === applicationId ? { ...app, status } : app
    )
    localStorage.setItem(key, JSON.stringify(updated))
    return { success: true }
}