import { httpJson, toQuery } from './http'

const API_BASE = '/api'

function normalizeSearchItem(item = {}) {
    return {
        userId: item.userId || null,
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        middleName: item.middleName || '',
        universityName: item.universityName || '',
        facultyName: item.facultyName || '',
        studyProgram: item.studyProgram || '',
        course: item.course ?? null,
        graduationYear: item.graduationYear ?? null,
        city: item.city || null,
        about: item.about || '',
        avatar: item.avatar || null,
        skills: Array.isArray(item.skills) ? item.skills : [],
        interests: Array.isArray(item.interests) ? item.interests : [],
        openToWork: Boolean(item.openToWork),
        openToEvents: Boolean(item.openToEvents),
    }
}

function normalizeSearchPage(page = {}) {
    return {
        items: Array.isArray(page.items)
            ? page.items.map((item) => normalizeSearchItem(item))
            : [],
        limit: Number(page.limit) || 12,
        offset: Number(page.offset) || 0,
        total: Number(page.total) || 0,
    }
}

export async function searchApplicantProfiles(params = {}) {
    const query = toQuery({
        limit: params.limit ?? 12,
        offset: params.offset ?? 0,
        cityId: params.cityId || undefined,
        skillTagIds: Array.isArray(params.skillTagIds) ? params.skillTagIds : undefined,
        interestTagIds: Array.isArray(params.interestTagIds) ? params.interestTagIds : undefined,
        openToWork: params.openToWork ? true : undefined,
        openToEvents: params.openToEvents ? true : undefined,
        search: params.search?.trim() || undefined,
    })

    const data = await httpJson(`${API_BASE}/profile/applicants${query ? `?${query}` : ''}`)
    return normalizeSearchPage(data)
}