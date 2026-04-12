import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useToast } from '../../../hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import Label from '../../../components/Label'
import Textarea from '../../../components/Textarea'
import CustomSelect from '../../../components/CustomSelect'
import LinksEditor from '../../../components/LinksEditor'
import {
    getCurrentSessionUser,
    getEmployerProfile,
    updateEmployerProfile,
    updateEmployerCompanyData,
    submitEmployerProfileForModeration,
    submitVerification,
    uploadEmployerLogo,
    deleteEmployerFile,
    getFileDownloadUrlByUserAndFile,
    getEmployerOpportunities,
    getEmployerOpportunityById,
    createOpportunity,
    updateOpportunity,
    updateOpportunityStatus,
    getEmployerApplications,
    updateApplicationStatus,
    searchCities,
} from '../../../api/profile'
import {
    getEntityModerationHistory,
    getModerationTaskDetail,
} from '../../../api/moderation'
import { listTags, OPPORTUNITY_LABELS } from '../../../api/opportunities'
import '../DashboardBase.scss'
import './EmployerDashboard.scss'

import editIcon from '../../../assets/icons/edit.svg'
import linkIcon from '../../../assets/icons/link.svg'

const OPPORTUNITY_TYPES = [
    { value: 'VACANCY', label: 'Вакансия' },
    { value: 'INTERNSHIP', label: 'Стажировка' },
    { value: 'MENTORING', label: 'Менторская программа' },
    { value: 'EVENT', label: 'Мероприятие' },
]

const WORK_FORMATS = [
    { value: 'OFFICE', label: 'Офис' },
    { value: 'HYBRID', label: 'Гибрид' },
    { value: 'REMOTE', label: 'Удалённо' },
    { value: 'ONLINE', label: 'Онлайн' },
]

const EXPERIENCE_LEVELS = [
    { value: 'INTERN', label: 'Intern' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'MIDDLE', label: 'Middle' },
    { value: 'SENIOR', label: 'Senior' },
]

const EMPLOYMENT_TYPES = [
    { value: 'FULL_TIME', label: 'Полная занятость' },
    { value: 'PART_TIME', label: 'Частичная занятость' },
    { value: 'PROJECT', label: 'Проектная работа' },
]

const COMPANY_SIZE_OPTIONS = [
    { value: 'STARTUP', label: 'Стартап (1–10)' },
    { value: 'SMALL', label: 'Малый бизнес (11–50)' },
    { value: 'MEDIUM', label: 'Средний (51–200)' },
    { value: 'LARGE', label: 'Крупный (201–1000)' },
    { value: 'ENTERPRISE', label: 'Корпорация (1000+)' },
]

const VERIFICATION_METHODS = [
    { value: 'CORPORATE_EMAIL', label: 'Корпоративная почта' },
    { value: 'TIN', label: 'ИНН' },
    { value: 'PROFESSIONAL_LINKS', label: 'Профессиональные ссылки' },
]

const APPLICATION_STATUSES = [
    { value: '', label: 'Все статусы' },
    { value: 'SUBMITTED', label: 'Подан' },
    { value: 'IN_REVIEW', label: 'На рассмотрении' },
    { value: 'ACCEPTED', label: 'Принят' },
    { value: 'REJECTED', label: 'Отклонён' },
    { value: 'RESERVE', label: 'В резерве' },
    { value: 'WITHDRAWN', label: 'Отозван' },
]

const APPLICATION_SORT_OPTIONS = [
    { value: 'DESC', label: 'Сначала новые' },
    { value: 'ASC', label: 'Сначала старые' },
]

const EMPLOYER_LOGO_FORMATS_HINT = 'JPG, PNG, WEBP'

function createLinkRow(title = '', url = '') {
    return {
        id: Date.now() + Math.random(),
        title,
        url,
    }
}

function statusBucket(status) {
    if (status === 'DRAFT') return 'draft'
    if (status === 'PLANNED') return 'planned'
    if (['CLOSED', 'ARCHIVED', 'REJECTED'].includes(status)) return 'closed'
    return 'active'
}

function formatDate(date) {
    if (!date) return '—'

    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return '—'

    return parsed.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function renderContactMethod(contact) {
    if (!contact?.value) return null

    if (contact.type === 'EMAIL') {
        return <a href={`mailto:${contact.value}`}>{contact.value}</a>
    }

    if (contact.type === 'PHONE') {
        return <a href={`tel:${contact.value}`}>{contact.value}</a>
    }

    if (contact.type === 'TELEGRAM') {
        const value = contact.value.replace(/^@/, '')
        return (
            <a href={`https://t.me/${value}`} target="_blank" rel="noopener noreferrer">
                @{value}
            </a>
        )
    }

    if (contact.type === 'WHATSAPP') {
        const value = contact.value.replace(/[^\d+]/g, '')
        return (
            <a href={`https://wa.me/${value.replace(/^\+/, '')}`} target="_blank" rel="noopener noreferrer">
                {contact.value}
            </a>
        )
    }

    if (contact.type === 'VK' || contact.type === 'LINKEDIN' || contact.type === 'OTHER') {
        if (/^https?:\/\//i.test(contact.value)) {
            return (
                <a href={contact.value} target="_blank" rel="noopener noreferrer">
                    {contact.value}
                </a>
            )
        }
    }

    return <span>{contact.value}</span>
}

function detectEmployerContactType(value = '', label = '') {
    const normalizedValue = String(value).trim().toLowerCase()
    const normalizedLabel = String(label).trim().toLowerCase()

    if (
        normalizedLabel.includes('email') ||
        normalizedLabel.includes('mail') ||
        normalizedLabel.includes('почт') ||
        normalizedValue.includes('@')
    ) {
        return 'EMAIL'
    }

    if (
        normalizedLabel.includes('telegram') ||
        normalizedLabel.includes('tg') ||
        normalizedLabel.includes('телеграм') ||
        normalizedValue.startsWith('https://t.me/') ||
        normalizedValue.startsWith('http://t.me/') ||
        normalizedValue.startsWith('@')
    ) {
        return 'TELEGRAM'
    }

    if (normalizedLabel.includes('whatsapp') || normalizedLabel.includes('wa')) {
        return 'WHATSAPP'
    }

    if (normalizedLabel.includes('vk') || normalizedValue.includes('vk.com')) {
        return 'VK'
    }

    if (normalizedLabel.includes('linkedin') || normalizedValue.includes('linkedin.com')) {
        return 'LINKEDIN'
    }

    if (
        normalizedLabel.includes('phone') ||
        normalizedLabel.includes('tel') ||
        normalizedLabel.includes('тел') ||
        normalizedValue.startsWith('+') ||
        /^\d[\d\s\-()]+$/.test(normalizedValue)
    ) {
        return 'PHONE'
    }

    return 'OTHER'
}

function normalizeEmployerProfileState(profileData = {}, fallbackUser = null) {
    return {
        userId: profileData.userId ?? fallbackUser?.userId ?? fallbackUser?.id ?? null,
        companyName: profileData.companyName || fallbackUser?.displayName || '',
        legalName: profileData.legalName || '',
        inn: profileData.inn || '',
        description: profileData.description || '',
        industry: profileData.industry || '',
        websiteUrl: profileData.websiteUrl || '',
        cityId: profileData.cityId ?? profileData.city?.id ?? null,
        cityName: profileData.cityName || profileData.city?.name || '',
        locationId: profileData.locationId ?? profileData.location?.id ?? null,
        companySize: profileData.companySize || '',
        foundedYear: profileData.foundedYear ?? '',
        socialLinks: Array.isArray(profileData.socialLinks) ? profileData.socialLinks : [],
        publicContacts: Array.isArray(profileData.publicContacts) ? profileData.publicContacts : [],
        verificationStatus: profileData.verificationStatus || '',
        moderationStatus: profileData.moderationStatus || 'DRAFT',
        logo: profileData.logo || null,
    }
}

function getEmployerModerationStatusMeta(status) {
    switch (status) {
        case 'PENDING_MODERATION':
            return {
                label: 'На модерации',
                tone: 'pending',
                description: 'Профиль отправлен куратору и ожидает проверки.',
            }
        case 'APPROVED':
            return {
                label: 'Одобрен',
                tone: 'approved',
                description: 'Профиль работодателя прошёл модерацию.',
            }
        case 'NEEDS_REVISION':
            return {
                label: 'Нужны правки',
                tone: 'revision',
                description: 'Куратор вернул профиль на доработку. Исправьте данные и отправьте его повторно.',
            }
        default:
            return {
                label: 'Не отправлен на модерацию',
                tone: 'draft',
                description: 'Профиль ещё не отправлялся на проверку.',
            }
    }
}

function firstNonEmptyString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim()
        }
    }

    return ''
}

function normalizeFieldIssues(items = []) {
    const seen = new Set()

    return items
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            field: item.field || '',
            message: item.message || '',
            code: item.code || '',
        }))
        .filter((item) => item.message)
        .filter((item) => {
            const key = `${item.field}|${item.message}|${item.code}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
}

function extractModerationFeedback(historyItems = [], taskDetail = null) {
    const sortedHistory = [...historyItems].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

    const latestRevisionEvent =
        sortedHistory.find((item) => item?.action === 'REQUESTED_CHANGES') ||
        sortedHistory.find((item) => item?.action === 'REJECTED') ||
        null

    if (!latestRevisionEvent && !taskDetail) {
        return null
    }

    const payload = latestRevisionEvent?.payload && typeof latestRevisionEvent.payload === 'object'
        ? latestRevisionEvent.payload
        : {}

    const taskHistoryFieldIssues = Array.isArray(taskDetail?.history)
        ? taskDetail.history.flatMap((item) =>
            Array.isArray(item?.payload?.fieldIssues) ? item.payload.fieldIssues : []
        )
        : []

    const fieldIssues = normalizeFieldIssues([
        ...(Array.isArray(payload.fieldIssues) ? payload.fieldIssues : []),
        ...taskHistoryFieldIssues,
    ])

    const comment = firstNonEmptyString(
        payload.comment,
        payload.message,
        payload.text,
        payload.resolutionComment,
        taskDetail?.resolutionComment
    )

    if (!comment && fieldIssues.length === 0) {
        return null
    }

    return {
        action: latestRevisionEvent?.action || null,
        comment,
        fieldIssues,
        createdAt: latestRevisionEvent?.createdAt || taskDetail?.updatedAt || null,
        taskId: latestRevisionEvent?.taskId || taskDetail?.id || null,
    }
}

// FILE CONTINUES...

function EmployerDashboard() {
    const { toast } = useToast()

    const [activeTab, setActiveTab] = useState('opportunities')
    const [user, setUser] = useState(null)
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [isEditingCompanyData, setIsEditingCompanyData] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [errors, setErrors] = useState({})
    const [expandedOpportunityId, setExpandedOpportunityId] = useState(null)
    const [showVerificationModal, setShowVerificationModal] = useState(false)
    const [isLogoUploading, setIsLogoUploading] = useState(false)
    const [moderationFeedback, setModerationFeedback] = useState(null)
    const [isModerationFeedbackLoading, setIsModerationFeedbackLoading] = useState(false)

    const [opportunitySearchTerm, setOpportunitySearchTerm] = useState('')
    const [opportunityFilterStatus, setOpportunityFilterStatus] = useState('all')

    const [responseFilters, setResponseFilters] = useState({
        search: '',
        status: '',
        sortDirection: 'DESC',
    })

    const [selectedApplicant, setSelectedApplicant] = useState(null)
    const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false)

    const [isCitySearchOpen, setIsCitySearchOpen] = useState(false)
    const [citySearchQuery, setCitySearchQuery] = useState('')
    const [citySuggestions, setCitySuggestions] = useState([])
    const citySearchRef = useRef(null)
    const logoInputRef = useRef(null)

    const [socialRows, setSocialRows] = useState([createLinkRow()])
    const [contactRows, setContactRows] = useState([createLinkRow()])
    const [verificationLinkRows, setVerificationLinkRows] = useState([createLinkRow()])
    const [resourceRows, setResourceRows] = useState([createLinkRow()])

    const [verificationData, setVerificationData] = useState({
        verificationMethod: 'CORPORATE_EMAIL',
        corporateEmail: '',
        inn: '',
        submittedComment: '',
    })

    const [profile, setProfile] = useState({
        userId: null,
        companyName: '',
        legalName: '',
        inn: '',
        description: '',
        industry: '',
        websiteUrl: '',
        cityId: null,
        cityName: '',
        locationId: null,
        companySize: '',
        foundedYear: '',
        socialLinks: [],
        publicContacts: [],
        verificationStatus: '',
        moderationStatus: 'DRAFT',
        logo: null,
    })

    const [opportunityForm, setOpportunityForm] = useState({
        title: '',
        shortDescription: '',
        fullDescription: '',
        type: 'VACANCY',
        workFormat: 'REMOTE',
        cityId: null,
        cityName: '',
        expiresAt: '',
        eventDate: '',
        requirements: '',
        grade: 'JUNIOR',
        employmentType: 'FULL_TIME',
        salaryFrom: '',
        salaryTo: '',
        salaryCurrency: 'RUB',
        tagIds: [],
        contactEmail: '',
        contactPhone: '',
        contactTelegram: '',
        contactPerson: '',
        resourceLinks: [],
    })

    const [opportunityMode, setOpportunityMode] = useState('create')
    const [editingOpportunityId, setEditingOpportunityId] = useState(null)

    const [opportunities, setOpportunities] = useState([])
    const [responsesPage, setResponsesPage] = useState({ items: [], total: 0, limit: 50, offset: 0 })
    const [techTags, setTechTags] = useState([])

    const verificationState = profile.verificationStatus || 'NOT_STARTED'
    const moderationState = profile.moderationStatus || 'DRAFT'
    const isVerified = verificationState === 'APPROVED'
    const isVerificationRejected = verificationState === 'REJECTED'
    const moderationMeta = getEmployerModerationStatusMeta(moderationState)

    const logoUrl = profile.logo?.fileId && profile.userId
        ? getFileDownloadUrlByUserAndFile('EMPLOYER', profile.userId, profile.logo.fileId)
        : null

    const linksToRows = (items = []) =>
        items.length > 0
            ? items.map((item) => createLinkRow(item.label || '', item.url || item.value || ''))
            : [createLinkRow()]

    const rowsToLinks = (rows = []) =>
        rows
            .filter((row) => row.url?.trim())
            .map((row, index) => ({
                label: row.title?.trim() || `Ссылка ${index + 1}`,
                url: row.url.trim(),
            }))

    const buildEmployerProfilePayload = () => {
        const payload = {
            companyName: profile.companyName?.trim() || '',
            description: profile.description?.trim() || '',
            industry: profile.industry?.trim() || '',
            websiteUrl: profile.websiteUrl?.trim() || '',
            socialLinks: rowsToLinks(socialRows),
            publicContacts: contactRows
                .filter((row) => row.url?.trim())
                .map((row, index) => ({
                    type: detectEmployerContactType(row.url.trim(), row.title?.trim() || ''),
                    label: row.title?.trim() || `Контакт ${index + 1}`,
                    value: row.url.trim(),
                })),
        }

        if (profile.cityId) {
            payload.cityId = Number(profile.cityId)
        }

        if (profile.locationId) {
            payload.locationId = Number(profile.locationId)
        }

        if (profile.companySize) {
            payload.companySize = profile.companySize
        }

        if (
            profile.foundedYear !== '' &&
            profile.foundedYear !== null &&
            Number.isFinite(Number(profile.foundedYear))
        ) {
            payload.foundedYear = Number(profile.foundedYear)
        }

        return payload
    }

    const buildEmployerCompanyPayload = () => ({
        legalName: profile.legalName?.trim() || '',
        inn: profile.inn?.trim() || '',
    })

    const resetOpportunityForm = () => {
        setOpportunityMode('create')
        setEditingOpportunityId(null)
        setResourceRows([createLinkRow()])
        setOpportunityForm({
            title: '',
            shortDescription: '',
            fullDescription: '',
            type: 'VACANCY',
            workFormat: 'REMOTE',
            cityId: null,
            cityName: '',
            expiresAt: '',
            eventDate: '',
            requirements: '',
            grade: 'JUNIOR',
            employmentType: 'FULL_TIME',
            salaryFrom: '',
            salaryTo: '',
            salaryCurrency: 'RUB',
            tagIds: [],
            contactEmail: '',
            contactPhone: '',
            contactTelegram: '',
            contactPerson: '',
            resourceLinks: [],
        })
    }

    const syncProfileState = useCallback((profileData, fallbackUser = user) => {
        const normalized = normalizeEmployerProfileState(profileData, fallbackUser)

        setProfile(normalized)
        setSocialRows(linksToRows(normalized.socialLinks))
        setContactRows(
            normalized.publicContacts.length > 0
                ? normalized.publicContacts.map((item) =>
                    createLinkRow(item.label || item.type || 'Контакт', item.value || '')
                )
                : [createLinkRow()]
        )
        setCitySearchQuery(normalized.cityName || '')
        setVerificationData((prev) => ({
            ...prev,
            inn: normalized.inn || '',
            corporateEmail: prev.corporateEmail || fallbackUser?.email || '',
        }))

        return normalized
    }, [user])

    const loadModerationFeedback = useCallback(async (entityId) => {
        if (!entityId) {
            setModerationFeedback(null)
            return
        }

        setIsModerationFeedbackLoading(true)

        try {
            const history = await getEntityModerationHistory('EMPLOYER_PROFILE', entityId)
            const sortedHistory = Array.isArray(history)
                ? [...history].sort(
                    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                )
                : []

            const latestRevisionEvent =
                sortedHistory.find((item) => item?.action === 'REQUESTED_CHANGES') ||
                sortedHistory.find((item) => item?.action === 'REJECTED') ||
                null

            let taskDetail = null
            if (latestRevisionEvent?.taskId) {
                try {
                    taskDetail = await getModerationTaskDetail(latestRevisionEvent.taskId)
                } catch {
                    taskDetail = null
                }
            }

            setModerationFeedback(extractModerationFeedback(sortedHistory, taskDetail))
        } catch {
            setModerationFeedback(null)
        } finally {
            setIsModerationFeedbackLoading(false)
        }
    }, [])

    const reloadEmployerProfile = useCallback(async () => {
        const freshProfile = await getEmployerProfile()
        const normalized = syncProfileState(freshProfile || {}, user)
        await loadModerationFeedback(normalized.userId || user?.userId)
        return normalized
    }, [loadModerationFeedback, syncProfileState, user])

    const moderationMissingItems = useMemo(() => {
        const items = []

        if (!profile.companyName?.trim()) {
            items.push('название компании')
        }

        if (!profile.industry?.trim()) {
            items.push('сфера деятельности')
        }

        if (!profile.cityId && !profile.locationId) {
            items.push('город')
        }

        const hasPublicChannel =
            Boolean(profile.websiteUrl?.trim()) ||
            (Array.isArray(socialRows) && socialRows.some((item) => item.url?.trim())) ||
            (Array.isArray(contactRows) && contactRows.some((item) => item.url?.trim()))

        if (!hasPublicChannel) {
            items.push('сайт, соцсеть или контакт')
        }

        return items
    }, [profile, socialRows, contactRows])

    const canSubmitProfileToModeration =
        moderationState !== 'PENDING_MODERATION' &&
        moderationMissingItems.length === 0

    const moderationSubmitButtonText = useMemo(() => {
        if (moderationState === 'APPROVED') return 'Отправить обновления на модерацию'
        if (moderationState === 'NEEDS_REVISION') return 'Отправить исправления на модерацию'
        return 'Отправить профиль на модерацию'
    }, [moderationState])

    const validatePublicProfile = () => {
        const nextErrors = {}

        if (!profile.companyName?.trim()) {
            nextErrors.companyName = 'Укажите название компании'
        }

        if (!profile.industry?.trim()) {
            nextErrors.industry = 'Укажите сферу деятельности'
        }

        if (!profile.cityId && !profile.locationId) {
            nextErrors.city = 'Укажите город или локацию компании'
        }

        const hasPublicChannel =
            Boolean(profile.websiteUrl?.trim()) ||
            (Array.isArray(socialRows) && socialRows.some((item) => item.url?.trim())) ||
            (Array.isArray(contactRows) && contactRows.some((item) => item.url?.trim()))

        if (!hasPublicChannel) {
            nextErrors.publicContacts = 'Добавьте сайт, социальную сеть или контакт для связи'
        }

        setErrors(nextErrors)

        return {
            isValid: Object.keys(nextErrors).length === 0,
            nextErrors,
        }
    }

    const validateCompanyData = () => {
        const nextErrors = {}

        if (!profile.legalName?.trim()) {
            nextErrors.legalName = 'Укажите юридическое название'
        }

        if (!profile.inn?.trim() || !/^\d{10}(\d{2})?$/.test(profile.inn.trim())) {
            nextErrors.inn = 'ИНН должен содержать 10 или 12 цифр'
        }

        setErrors(nextErrors)

        return {
            isValid: Object.keys(nextErrors).length === 0,
            nextErrors,
        }
    }

    const validateOpportunityForm = () => {
        const nextErrors = {}

        if (!opportunityForm.title.trim()) nextErrors.title = 'Укажите название'
        if (!opportunityForm.shortDescription.trim()) nextErrors.shortDescription = 'Укажите краткое описание'
        if (opportunityForm.type === 'EVENT' && !opportunityForm.eventDate) nextErrors.eventDate = 'Укажите дату мероприятия'
        if (opportunityForm.type !== 'EVENT' && !opportunityForm.expiresAt) nextErrors.expiresAt = 'Укажите срок действия'

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const handleCitySearch = async (value) => {
        setCitySearchQuery(value)

        setProfile((prev) => ({
            ...prev,
            cityId: null,
            cityName: value,
        }))

        if (value.length < 2) {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
            return
        }

        try {
            const cities = await searchCities(value)
            setCitySuggestions(cities || [])
            setIsCitySearchOpen(true)
        } catch {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
        }
    }

    const handleSelectCity = (city) => {
        setProfile((prev) => ({
            ...prev,
            cityId: city.id,
            cityName: city.name,
        }))
        setCitySearchQuery(city.name)
        setIsCitySearchOpen(false)
    }

    const loadEmployerResponsesData = useCallback(async () => {
        try {
            const page = await getEmployerApplications({
                limit: 50,
                offset: 0,
                sortDirection: responseFilters.sortDirection,
                status: responseFilters.status || undefined,
                search: responseFilters.search || undefined,
            })
            setResponsesPage(page || { items: [], total: 0, limit: 50, offset: 0 })
        } catch (error) {
            console.error('Responses load error:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить отклики',
                variant: 'destructive',
            })
        }
    }, [responseFilters, toast])

    const loadData = useCallback(async () => {
        setIsLoading(true)

        try {
            const currentUser = await getCurrentSessionUser()
            setUser(currentUser)

            if (!currentUser?.userId) {
                setOpportunities([])
                setResponsesPage({ items: [], total: 0, limit: 50, offset: 0 })
                return
            }

            const profileData = await getEmployerProfile()
            const normalized = syncProfileState(profileData || {}, currentUser)

            await loadModerationFeedback(normalized.userId || currentUser.userId)

            try {
                const opportunityPage = await getEmployerOpportunities()
                setOpportunities(Array.isArray(opportunityPage?.items) ? opportunityPage.items : [])
            } catch (error) {
                console.error('Employer opportunities load failed:', error)
                setOpportunities([])
            }

            try {
                const page = await getEmployerApplications({
                    limit: 50,
                    offset: 0,
                    sortDirection: responseFilters.sortDirection,
                    status: responseFilters.status || undefined,
                    search: responseFilters.search || undefined,
                })
                setResponsesPage(page || { items: [], total: 0, limit: 50, offset: 0 })
            } catch (error) {
                console.error('Employer responses load failed:', error)
                setResponsesPage({ items: [], total: 0, limit: 50, offset: 0 })
            }
        } catch (error) {
            console.error('Load error:', error)

            if ([401, 403].includes(error?.status)) {
                setUser(null)
                setOpportunities([])
                setResponsesPage({ items: [], total: 0, limit: 50, offset: 0 })
                return
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить кабинет работодателя',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [loadModerationFeedback, responseFilters, syncProfileState, toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    useEffect(() => {
        listTags('TECH')
            .then((items) => setTechTags(items || []))
            .catch(() => setTechTags([]))
    }, [])

    useEffect(() => {
        if (activeTab === 'applicants' && user) {
            loadEmployerResponsesData()
        }
    }, [activeTab, user, loadEmployerResponsesData])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (citySearchRef.current && !citySearchRef.current.contains(event.target)) {
                setIsCitySearchOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (isEditingProfile) return

        setSocialRows(linksToRows(profile.socialLinks || []))
        setContactRows(
            (profile.publicContacts || []).length > 0
                ? profile.publicContacts.map((item) =>
                    createLinkRow(item.label || item.type || 'Контакт', item.value || '')
                )
                : [createLinkRow()]
        )
    }, [isEditingProfile, profile])

    const handleLogoUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg']
        const fileName = file.name?.toLowerCase() || ''
        const hasAllowedExtension = allowedExtensions.some((extension) => fileName.endsWith(extension))
        const hasAllowedType = !file.type || allowedTypes.includes(file.type)

        if (!hasAllowedType || !hasAllowedExtension) {
            toast({
                title: 'Неверный формат логотипа',
                description: `Можно загрузить только ${EMPLOYER_LOGO_FORMATS_HINT}.`,
                variant: 'destructive',
            })
            event.target.value = ''
            return
        }

        try {
            setIsLogoUploading(true)
            const updatedProfile = await uploadEmployerLogo(file)
            syncProfileState(updatedProfile, user)
            toast({
                title: 'Логотип загружен',
                description: 'Логотип компании успешно обновлён',
            })
        } catch (error) {
            const fallbackMessage = error?.message || 'Не удалось загрузить логотип'
            const detailsMessage =
                error?.status === 400 || error?.status === 415
                    ? `${fallbackMessage}. Допустимые форматы: ${EMPLOYER_LOGO_FORMATS_HINT}.`
                    : fallbackMessage

            toast({
                title: 'Ошибка',
                description: detailsMessage,
                variant: 'destructive',
            })
        } finally {
            setIsLogoUploading(false)
            event.target.value = ''
        }
    }

    const handleDeleteLogo = async () => {
        if (!profile.logo?.fileId) return

        try {
            const updatedProfile = await deleteEmployerFile(profile.logo.fileId)
            syncProfileState(updatedProfile, user)
            toast({
                title: 'Логотип удалён',
                description: 'Логотип компании удалён из профиля',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось удалить логотип',
                variant: 'destructive',
            })
        }
    }

    const handleSaveProfile = async () => {
        const validation = validatePublicProfile()

        if (!validation.isValid) {
            toast({
                title: 'Ошибка',
                description: Object.values(validation.nextErrors)[0] || 'Заполните обязательные поля',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const updatedProfile = await updateEmployerProfile(buildEmployerProfilePayload())
            const normalized = syncProfileState(updatedProfile, user)

            toast({
                title: 'Профиль сохранён',
                description:
                    moderationState === 'PENDING_MODERATION'
                        ? 'Изменения сохранены. Профиль уже находится на модерации.'
                        : 'Изменения сохранены. Теперь профиль можно отправить на модерацию.',
            })

            window.dispatchEvent(
                new CustomEvent('profile-updated', {
                    detail: {
                        companyName: normalized.companyName,
                        role: 'EMPLOYER',
                    },
                })
            )

            setIsEditingProfile(false)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить профиль',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveCompanyData = async () => {
        const validation = validateCompanyData()

        if (!validation.isValid) {
            toast({
                title: 'Ошибка',
                description: Object.values(validation.nextErrors)[0] || 'Проверьте реквизиты компании',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            await updateEmployerCompanyData(buildEmployerCompanyPayload())
            await reloadEmployerProfile()

            toast({
                title: 'Данные компании сохранены',
                description: 'Юридические данные обновлены',
            })

            setIsEditingCompanyData(false)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить данные компании',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmitEmployerProfileForModeration = async () => {
        const validation = validatePublicProfile()

        if (!validation.isValid) {
            toast({
                title: 'Ошибка',
                description: Object.values(validation.nextErrors)[0] || 'Заполните обязательные поля перед отправкой на модерацию',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            await updateEmployerProfile(buildEmployerProfilePayload())
            const updatedAfterSubmit = await submitEmployerProfileForModeration()
            const normalized = syncProfileState(updatedAfterSubmit, user)

            setModerationFeedback(null)

            toast({
                title: 'Профиль отправлен на модерацию',
                description: 'Профиль работодателя отправлен на проверку куратору.',
            })

            window.dispatchEvent(
                new CustomEvent('profile-updated', {
                    detail: {
                        companyName: normalized.companyName,
                        role: 'EMPLOYER',
                    },
                })
            )

            setIsEditingProfile(false)
            setIsEditingCompanyData(false)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось отправить профиль на модерацию',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmitVerification = async () => {
        if (!user?.userId) {
            toast({
                title: 'Ошибка',
                description: 'Не удалось определить текущего пользователя',
                variant: 'destructive',
            })
            return
        }

        const professionalLinks = rowsToLinks(verificationLinkRows).map((item) => item.url)

        if (!verificationData.verificationMethod) {
            toast({
                title: 'Ошибка',
                description: 'Выберите способ верификации',
                variant: 'destructive',
            })
            return
        }

        if (
            verificationData.verificationMethod === 'CORPORATE_EMAIL' &&
            !verificationData.corporateEmail.trim()
        ) {
            toast({
                title: 'Ошибка',
                description: 'Укажите корпоративную почту',
                variant: 'destructive',
            })
            return
        }

        if (verificationData.verificationMethod === 'TIN') {
            const normalizedInn = (verificationData.inn || profile.inn || '').trim()

            if (!normalizedInn || !/^\d{10}(\d{2})?$/.test(normalizedInn)) {
                toast({
                    title: 'Ошибка',
                    description: 'Укажите корректный ИНН',
                    variant: 'destructive',
                })
                return
            }
        }

        setIsLoading(true)

        try {
            if (verificationData.verificationMethod === 'TIN') {
                const normalizedInn = (verificationData.inn || profile.inn || '').trim()

                await updateEmployerCompanyData({
                    legalName: profile.legalName?.trim() || '',
                    inn: normalizedInn,
                })

                await reloadEmployerProfile()
            }

            await submitVerification({
                verificationMethod: verificationData.verificationMethod,
                corporateEmail:
                    verificationData.verificationMethod === 'CORPORATE_EMAIL'
                        ? verificationData.corporateEmail.trim()
                        : null,
                professionalLinks,
                submittedComment: verificationData.submittedComment?.trim() || '',
            })

            setProfile((prev) => ({ ...prev, verificationStatus: 'PENDING' }))
            setShowVerificationModal(false)

            toast({
                title: 'Заявка отправлена',
                description: 'Верификация отправлена на проверку',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось отправить заявку',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleStartEditOpportunity = async (opportunityId) => {
        try {
            const opportunity = await getEmployerOpportunityById(opportunityId)

            setEditingOpportunityId(opportunity.id)
            setOpportunityMode('edit')
            setResourceRows(linksToRows(opportunity.resourceLinks || []))
            setOpportunityForm({
                title: opportunity.title || '',
                shortDescription: opportunity.shortDescription || '',
                fullDescription: opportunity.fullDescription || '',
                type: opportunity.type || 'VACANCY',
                workFormat: opportunity.workFormat || 'REMOTE',
                cityId: opportunity.cityId,
                cityName: opportunity.cityName || '',
                expiresAt: opportunity.expiresAt ? opportunity.expiresAt.slice(0, 10) : '',
                eventDate: opportunity.eventDate ? opportunity.eventDate.slice(0, 10) : '',
                requirements: opportunity.requirements || '',
                grade: opportunity.grade || 'JUNIOR',
                employmentType: opportunity.employmentType || 'FULL_TIME',
                salaryFrom: opportunity.salaryFrom ?? '',
                salaryTo: opportunity.salaryTo ?? '',
                salaryCurrency: opportunity.salaryCurrency || 'RUB',
                tagIds: opportunity.tagIds || [],
                contactEmail: opportunity.contactEmail || '',
                contactPhone: opportunity.contactPhone || '',
                contactTelegram: opportunity.contactTelegram || '',
                contactPerson: opportunity.contactPerson || '',
                resourceLinks: opportunity.resourceLinks || [],
            })

            setActiveTab('create')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить публикацию для редактирования',
                variant: 'destructive',
            })
        }
    }

    const handleSaveOpportunity = async () => {
        if (!isVerified) {
            toast({
                title: 'Верификация обязательна',
                description: 'Сначала пройдите верификацию компании',
                variant: 'destructive',
            })
            return
        }

        if (!profile.companyName?.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Сначала заполните название компании',
                variant: 'destructive',
            })
            return
        }

        if (!validateOpportunityForm()) {
            toast({
                title: 'Ошибка',
                description: 'Проверьте обязательные поля публикации',
                variant: 'destructive',
            })
            return
        }

        if (opportunityForm.type !== 'EVENT' && opportunityForm.expiresAt) {
            const selectedDate = new Date(`${opportunityForm.expiresAt}T23:59:59`)
            const now = new Date()

            if (Number.isNaN(selectedDate.getTime()) || selectedDate < now) {
                toast({
                    title: 'Ошибка',
                    description: 'Срок действия вакансии не может быть в прошлом',
                    variant: 'destructive',
                })
                return
            }
        }

        setIsLoading(true)

        try {
            const payload = {
                title: opportunityForm.title?.trim(),
                shortDescription: opportunityForm.shortDescription?.trim() || '',
                fullDescription:
                    opportunityForm.fullDescription?.trim() ||
                    opportunityForm.shortDescription?.trim() ||
                    '',
                requirements: opportunityForm.requirements?.trim() || null,
                companyName: profile.companyName.trim(),
                type: opportunityForm.type || 'VACANCY',
                workFormat: opportunityForm.workFormat || 'REMOTE',
                employmentType: opportunityForm.employmentType || 'FULL_TIME',
                grade: opportunityForm.grade || 'JUNIOR',
                salaryFrom:
                    opportunityForm.salaryFrom !== '' && opportunityForm.salaryFrom != null
                        ? Number(opportunityForm.salaryFrom)
                        : null,
                salaryTo:
                    opportunityForm.salaryTo !== '' && opportunityForm.salaryTo != null
                        ? Number(opportunityForm.salaryTo)
                        : null,
                salaryCurrency: (opportunityForm.salaryCurrency || 'RUB').trim().toUpperCase(),

                expiresAt:
                    opportunityForm.type === 'EVENT'
                        ? null
                        : new Date(`${opportunityForm.expiresAt}T23:59:59`).toISOString(),

                eventDate:
                    opportunityForm.type === 'EVENT'
                        ? (opportunityForm.eventDate || null)
                        : null,

                cityId: Number(opportunityForm.cityId || 1),
                locationId: opportunityForm.locationId ? Number(opportunityForm.locationId) : null,

                contactInfo: {
                    email: opportunityForm.contactEmail?.trim() || null,
                    phone: opportunityForm.contactPhone?.trim() || null,
                    telegram: opportunityForm.contactTelegram?.trim() || null,
                    contactPerson: opportunityForm.contactPerson?.trim() || null,
                },

                resourceLinks: rowsToLinks(resourceRows),
                tagIds: Array.isArray(opportunityForm.tagIds)
                    ? opportunityForm.tagIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
                    : [],
            }

            const savedOpportunity =
                opportunityMode === 'edit' && editingOpportunityId
                    ? await updateOpportunity(editingOpportunityId, payload)
                    : await createOpportunity(payload)

            if (opportunityMode === 'edit') {
                setOpportunities((prev) =>
                    prev.map((item) => (item.id === savedOpportunity.id ? savedOpportunity : item))
                )
                toast({
                    title: 'Публикация обновлена',
                    description: 'Изменения успешно сохранены',
                })
            } else {
                setOpportunities((prev) => [savedOpportunity, ...prev])
                toast({
                    title: 'Публикация создана',
                    description: 'Карточка отправлена в общий список',
                })
            }

            resetOpportunityForm()
            setActiveTab('opportunities')
        } catch (error) {
            console.error('Save opportunity error:', error)
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить публикацию',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdateOpportunityStatus = async (opportunityId, action, successText) => {
        try {
            await updateOpportunityStatus(opportunityId, action)
            const refreshed = await getEmployerOpportunities()
            setOpportunities(refreshed.items || [])

            toast({
                title: 'Статус обновлён',
                description: successText,
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось изменить статус публикации',
                variant: 'destructive',
            })
        }
    }

    const handleDeleteOpportunity = async (id, title) => {
        try {
            await updateOpportunityStatus(id, 'archive')
            const refreshed = await getEmployerOpportunities()
            setOpportunities(refreshed.items || [])
            toast({
                title: 'Публикация архивирована',
                description: `«${title}» перемещена в архив`,
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось архивировать публикацию',
                variant: 'destructive',
            })
        }
    }

    const handleOpenApplicant = (applicant) => {
        setSelectedApplicant(applicant)
        setIsApplicantModalOpen(true)
    }

    const handleUpdateApplicationStatus = async (applicationId, newStatus) => {
        try {
            await updateApplicationStatus(applicationId, newStatus)
            await loadEmployerResponsesData()

            const labels = {
                ACCEPTED: 'Принят',
                REJECTED: 'Отклонён',
                RESERVE: 'В резерве',
                IN_REVIEW: 'На рассмотрении',
            }

            toast({
                title: 'Статус обновлён',
                description: `Статус изменён на «${labels[newStatus] || newStatus}»`,
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось обновить статус отклика',
                variant: 'destructive',
            })
        }
    }

    const filteredOpportunities = useMemo(() => {
        return opportunities.filter((opp) => {
            const matchesSearch =
                opp.title?.toLowerCase().includes(opportunitySearchTerm.toLowerCase()) ||
                opp.shortDescription?.toLowerCase().includes(opportunitySearchTerm.toLowerCase())

            const matchesStatus =
                opportunityFilterStatus === 'all' || statusBucket(opp.status) === opportunityFilterStatus

            return matchesSearch && matchesStatus
        })
    }, [opportunities, opportunityFilterStatus, opportunitySearchTerm])

    if (isLoading && !profile.companyName && opportunities.length === 0) {
        return (
            <DashboardLayout title="Кабинет работодателя">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Загрузка кабинета...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            title="Управление компанией"
            subtitle={profile.companyName || user?.displayName || 'Компания'}
        >
            {!isVerified && (
                <div className={`verification-banner ${isVerificationRejected ? 'verification-banner--warning' : ''}`}>
                    <div className="verification-banner__content">
                        <svg className="verification-banner__icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span>
                            {verificationState === 'NOT_STARTED' && 'Пройдите верификацию компании, чтобы публиковать вакансии и мероприятия.'}
                            {verificationState === 'PENDING' && 'Верификация компании на проверке. Публикация новых карточек временно ограничена.'}
                            {verificationState === 'REJECTED' && 'Верификация отклонена. Проверьте данные и отправьте заявку повторно.'}
                        </span>
                    </div>
                    <button className="verification-banner__button" onClick={() => setShowVerificationModal(true)}>
                        {verificationState === 'PENDING' ? 'Проверить статус' : 'Пройти верификацию'}
                    </button>
                </div>
            )}

            <div className="dashboard-tabs">
                <button
                    className={`dashboard-tabs__btn ${activeTab === 'opportunities' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('opportunities')}
                >
                    Вакансии
                </button>
                <button
                    className={`dashboard-tabs__btn ${activeTab === 'create' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('create')}
                    disabled={!isVerified}
                >
                    {opportunityMode === 'edit' ? 'Редактирование' : 'Создать'}
                </button>
                <button
                    className={`dashboard-tabs__btn ${activeTab === 'applicants' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('applicants')}
                >
                    Отклики
                </button>
                <button
                    className={`dashboard-tabs__btn ${activeTab === 'profile' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    О компании
                </button>
            </div>

            <div className="dashboard-panel">
                {activeTab === 'opportunities' && (
                    <div className="employer-opportunities">
                        <div className="employer-opportunities__header">
                            <h2>Мои публикации</h2>
                            <div className="employer-opportunities__filters">
                                <Input
                                    value={opportunitySearchTerm}
                                    onChange={(e) => setOpportunitySearchTerm(e.target.value)}
                                    placeholder="Поиск по названию..."
                                />
                                <CustomSelect
                                    value={opportunityFilterStatus}
                                    onChange={setOpportunityFilterStatus}
                                    options={[
                                        { value: 'all', label: 'Все' },
                                        { value: 'active', label: 'Активные' },
                                        { value: 'planned', label: 'Запланированные' },
                                        { value: 'draft', label: 'Черновики' },
                                        { value: 'closed', label: 'Закрытые' },
                                    ]}
                                />
                            </div>
                        </div>

                        {filteredOpportunities.length === 0 ? (
                            <p className="employer-empty">
                                {isVerified ? 'Пока нет публикаций' : 'После верификации вы сможете публиковать вакансии и мероприятия'}
                            </p>
                        ) : (
                            <div className="employer-opportunities__list">
                                {filteredOpportunities.map((opp) => (
                                    <div key={opp.id} className="employer-opportunities__item">
                                        <div className="employer-opportunities__info">
                                            <h3>{opp.title}</h3>
                                            <p className="employer-opportunities__type">
                                                {OPPORTUNITY_LABELS.type[opp.type] || opp.type} • {OPPORTUNITY_LABELS.workFormat[opp.workFormat] || opp.workFormat}
                                            </p>
                                            <p className="employer-opportunities__description">{opp.shortDescription}</p>
                                            <div className="employer-opportunities__skills">
                                                {opp.tags?.map((tag) => (
                                                    <span key={tag.id} className="skill-tag">
                                                        #{tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="employer-opportunities__meta">
                                            <span className={`status-badge status-${opp.status?.toLowerCase?.() || 'default'}`}>
                                                {OPPORTUNITY_LABELS.status[opp.status] || opp.status}
                                            </span>

                                            <span className="employer-opportunities__date">
                                                Обновлено: {formatDate(opp.updatedAt || opp.createdAt)}
                                            </span>

                                            <div className="employer-opportunities__actions">
                                                <button
                                                    className="employer-opportunities__view"
                                                    onClick={() =>
                                                        setExpandedOpportunityId((prev) => (prev === opp.id ? null : opp.id))
                                                    }
                                                >
                                                    {expandedOpportunityId === opp.id ? 'Скрыть' : 'Подробнее'}
                                                </button>

                                                <button
                                                    className="employer-opportunities__view"
                                                    onClick={() => handleStartEditOpportunity(opp.id)}
                                                >
                                                    Редактировать
                                                </button>

                                                {statusBucket(opp.status) !== 'closed' && (
                                                    <button
                                                        className="employer-opportunities__view"
                                                        onClick={() =>
                                                            handleUpdateOpportunityStatus(opp.id, 'close', 'Публикация закрыта')
                                                        }
                                                    >
                                                        Закрыть
                                                    </button>
                                                )}

                                                {opp.status !== 'DRAFT' && (
                                                    <button
                                                        className="employer-opportunities__view"
                                                        onClick={() =>
                                                            handleUpdateOpportunityStatus(opp.id, 'draft', 'Публикация возвращена в черновик')
                                                        }
                                                    >
                                                        В черновик
                                                    </button>
                                                )}

                                                <button
                                                    className="employer-opportunities__delete"
                                                    onClick={() => handleDeleteOpportunity(opp.id, opp.title)}
                                                >
                                                    Архив
                                                </button>
                                            </div>

                                            {expandedOpportunityId === opp.id && (
                                                <div className="employer-opportunities__details">
                                                    <h4>Подробности</h4>
                                                    <p><strong>Требования:</strong> {opp.requirements || '—'}</p>
                                                    <p><strong>Уровень:</strong> {OPPORTUNITY_LABELS.grade[opp.grade] || opp.grade || '—'}</p>
                                                    <p><strong>Занятость:</strong> {OPPORTUNITY_LABELS.employmentType[opp.employmentType] || opp.employmentType || '—'}</p>
                                                    <p><strong>Город:</strong> {opp.cityName || '—'}</p>
                                                    <p><strong>Дата мероприятия:</strong> {formatDate(opp.eventDate)}</p>
                                                    <p><strong>Срок действия:</strong> {formatDate(opp.expiresAt)}</p>
                                                    {opp.resourceLinks?.length > 0 && (
                                                        <div className="links-list">
                                                            {opp.resourceLinks.map((item, index) => (
                                                                <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer" className="link-item">
                                                                    <img src={linkIcon} alt="" className="icon-small" />
                                                                    <span>{item.label || item.url}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'create' && (
                    <div className="employer-create-form">
                        <div className="employer-create-form__header">
                            <h2>{opportunityMode === 'edit' ? 'Редактирование публикации' : 'Новая публикация'}</h2>
                            {opportunityMode === 'edit' && (
                                <Button className="button--ghost" onClick={resetOpportunityForm}>
                                    Отменить редактирование
                                </Button>
                            )}
                        </div>

                        {!isVerified && (
                            <p className="field-hint">
                                Создание и редактирование публикаций доступно после верификации компании.
                            </p>
                        )}

                        <div className="employer-create-form__field">
                            <Label>Название <span className="required-star">*</span></Label>
                            <Input
                                value={opportunityForm.title}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Например, Junior Java Developer"
                            />
                            {errors.title && <p className="field-error">{errors.title}</p>}
                        </div>

                        <div className="employer-create-form__grid-2">
                            <CustomSelect
                                label="Тип"
                                value={opportunityForm.type}
                                onChange={(val) => setOpportunityForm((prev) => ({ ...prev, type: val }))}
                                options={OPPORTUNITY_TYPES}
                            />
                            <CustomSelect
                                label="Формат"
                                value={opportunityForm.workFormat}
                                onChange={(val) => setOpportunityForm((prev) => ({ ...prev, workFormat: val }))}
                                options={WORK_FORMATS}
                            />
                        </div>

                        <div className="employer-create-form__field">
                            <Label>Краткое описание <span className="required-star">*</span></Label>
                            <Textarea
                                rows={3}
                                value={opportunityForm.shortDescription}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                                placeholder="Кратко: формат, аудитория, ключевая польза"
                            />
                            {errors.shortDescription && <p className="field-error">{errors.shortDescription}</p>}
                        </div>

                        <div className="employer-create-form__field">
                            <Label>Полное описание</Label>
                            <Textarea
                                rows={5}
                                value={opportunityForm.fullDescription}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, fullDescription: e.target.value }))}
                                placeholder="Подробности о вакансии, стажировке, мероприятии или менторской программе"
                            />
                        </div>

                        <div className="employer-create-form__field">
                            <Label>Требования</Label>
                            <Textarea
                                rows={4}
                                value={opportunityForm.requirements}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, requirements: e.target.value }))}
                                placeholder="Навыки, стек, ожидания к кандидату"
                            />
                        </div>

                        <div className="employer-create-form__grid-3">
                            <CustomSelect
                                label="Уровень"
                                value={opportunityForm.grade}
                                onChange={(val) => setOpportunityForm((prev) => ({ ...prev, grade: val }))}
                                options={EXPERIENCE_LEVELS}
                            />
                            <CustomSelect
                                label="Занятость"
                                value={opportunityForm.employmentType}
                                onChange={(val) => setOpportunityForm((prev) => ({ ...prev, employmentType: val }))}
                                options={EMPLOYMENT_TYPES}
                            />
                            {opportunityForm.type === 'EVENT' ? (
                                <div className="employer-create-form__field">
                                    <Label>Дата мероприятия <span className="required-star">*</span></Label>
                                    <Input
                                        type="date"
                                        value={opportunityForm.eventDate}
                                        onChange={(e) => setOpportunityForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                                    />
                                    {errors.eventDate && <p className="field-error">{errors.eventDate}</p>}
                                </div>
                            ) : (
                                <div className="employer-create-form__field">
                                    <Label>Срок действия <span className="required-star">*</span></Label>
                                    <Input
                                        type="date"
                                        value={opportunityForm.expiresAt}
                                        onChange={(e) => setOpportunityForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                                    />
                                    {errors.expiresAt && <p className="field-error">{errors.expiresAt}</p>}
                                </div>
                            )}
                        </div>

                        <div className="employer-create-form__grid-3">
                            <Input
                                type="number"
                                value={opportunityForm.salaryFrom}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, salaryFrom: e.target.value }))}
                                placeholder="Зарплата от"
                            />
                            <Input
                                type="number"
                                value={opportunityForm.salaryTo}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, salaryTo: e.target.value }))}
                                placeholder="Зарплата до"
                            />
                            <Input
                                value={opportunityForm.contactEmail}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                                placeholder="Контактный email"
                            />
                        </div>

                        <div className="employer-create-form__grid-3">
                            <Input
                                value={opportunityForm.contactPhone}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                                placeholder="Телефон"
                            />
                            <Input
                                value={opportunityForm.contactTelegram}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, contactTelegram: e.target.value }))}
                                placeholder="Telegram"
                            />
                            <Input
                                value={opportunityForm.contactPerson}
                                onChange={(e) => setOpportunityForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                                placeholder="Контактное лицо"
                            />
                        </div>

                        <div className="employer-create-form__field">
                            <Label>Теги</Label>
                            <div className="employer-opportunities__skills">
                                {techTags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`skill-tag ${opportunityForm.tagIds.includes(tag.id) ? 'skill-tag--active' : ''}`}
                                        onClick={() =>
                                            setOpportunityForm((prev) => ({
                                                ...prev,
                                                tagIds: prev.tagIds.includes(tag.id)
                                                    ? prev.tagIds.filter((id) => id !== tag.id)
                                                    : [...prev.tagIds, tag.id],
                                            }))
                                        }
                                    >
                                        #{tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <LinksEditor
                            label="Полезные ссылки / ресурсы"
                            rows={resourceRows}
                            setRows={setResourceRows}
                            placeholderTitle="Название ссылки"
                            placeholderUrl="https://..."
                        />

                        <div className="employer-create-form__actions">
                            <Button className="button--primary" onClick={handleSaveOpportunity} disabled={isLoading || !isVerified}>
                                {isLoading ? 'Сохранение...' : opportunityMode === 'edit' ? 'Сохранить изменения' : 'Опубликовать'}
                            </Button>
                            <Button className="button--ghost" onClick={resetOpportunityForm}>
                                Очистить форму
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'applicants' && (
                    <div className="employer-applicants">
                        <div className="employer-opportunities__header">
                            <h2>Отклики</h2>
                            <div className="employer-opportunities__filters">
                                <Input
                                    value={responseFilters.search}
                                    onChange={(e) => setResponseFilters((prev) => ({ ...prev, search: e.target.value }))}
                                    placeholder="Поиск по кандидату или вакансии"
                                />
                                <CustomSelect
                                    value={responseFilters.status}
                                    onChange={(val) => setResponseFilters((prev) => ({ ...prev, status: val }))}
                                    options={APPLICATION_STATUSES}
                                />
                                <CustomSelect
                                    value={responseFilters.sortDirection}
                                    onChange={(val) => setResponseFilters((prev) => ({ ...prev, sortDirection: val }))}
                                    options={APPLICATION_SORT_OPTIONS}
                                />
                                <Button className="button--primary" onClick={loadEmployerResponsesData}>
                                    Применить
                                </Button>
                            </div>
                        </div>

                        {responsesPage.items.length === 0 ? (
                            <p className="employer-empty">Пока нет откликов</p>
                        ) : (
                            <div className="employer-applicants__list">
                                {responsesPage.items.map((app) => (
                                    <div key={app.id} className="employer-applicants__item">
                                        <div className="employer-applicants__info">
                                            <h3>{app.applicant?.fullName || app.applicant?.displayName || 'Соискатель'}</h3>
                                            <p className="employer-applicants__position">На публикацию: {app.opportunityTitle}</p>
                                            <p className="employer-applicants__message">
                                                {app.coverLetter || app.applicantComment || 'Комментарий не указан'}
                                            </p>

                                            <div className="employer-applicants__skills">
                                                {app.applicant?.skills?.map((skill, index) => (
                                                    <span key={`${skill}-${index}`} className="skill-tag">{skill}</span>
                                                ))}
                                            </div>

                                            <div className="employer-applicants__meta">
                                                <span>Вуз: {app.applicant?.universityName || '—'}</span>
                                                <span>Курс: {app.applicant?.course || '—'}</span>
                                                <span>Год выпуска: {app.applicant?.graduationYear || '—'}</span>
                                            </div>
                                        </div>

                                        <div className="employer-applicants__actions">
                                            <span className={`status-badge status-${app.status?.toLowerCase?.() || 'default'}`}>
                                                {APPLICATION_STATUSES.find((item) => item.value === app.status)?.label || app.status}
                                            </span>

                                            <div className="employer-applicants__buttons">
                                                <button className="btn-approve" onClick={() => handleUpdateApplicationStatus(app.id, 'ACCEPTED')}>
                                                    Принять
                                                </button>
                                                <button className="btn-reject" onClick={() => handleUpdateApplicationStatus(app.id, 'REJECTED')}>
                                                    Отклонить
                                                </button>
                                                <button className="btn-reserve" onClick={() => handleUpdateApplicationStatus(app.id, 'RESERVE')}>
                                                    В резерв
                                                </button>
                                            </div>

                                            <button className="employer-opportunities__view" onClick={() => handleOpenApplicant(app.applicant)}>
                                                Профиль кандидата
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="employer-profile">
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                            hidden
                            onChange={handleLogoUpload}
                        />

                        {!isEditingProfile && !isEditingCompanyData ? (
                            <div className="employer-profile__view">
                                <div className="employer-profile__view-header">
                                    <h2>Информация о компании</h2>
                                    <div className="employer-profile__view-actions">
                                        <button className="profile-card__edit-btn" onClick={() => setIsEditingProfile(true)}>
                                            <img src={editIcon} alt="" className="icon" />
                                            Публичный профиль
                                        </button>
                                        <button className="profile-card__edit-btn" onClick={() => setIsEditingCompanyData(true)}>
                                            <img src={editIcon} alt="" className="icon" />
                                            Реквизиты компании
                                        </button>
                                    </div>
                                </div>

                                <div className="employer-profile__hero">
                                    <div className="employer-profile__logo-card">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={profile.companyName || 'Логотип компании'}
                                                className="employer-profile__logo-image"
                                            />
                                        ) : (
                                            <div className="employer-profile__logo-placeholder">
                                                {(profile.companyName?.trim()?.[0] || 'C').toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="employer-profile__hero-info">
                                        <div className="employer-profile__hero-title-row">
                                            <h3>{profile.companyName || 'Компания без названия'}</h3>
                                        </div>

                                        <div className="employer-profile__hero-submeta">
                                            <div className={`employer-profile__status-chip employer-profile__status-chip--${moderationMeta.tone}`}>
                                                <span className="employer-profile__status-chip-label">Профиль</span>
                                                <span className="employer-profile__status-chip-value">{moderationMeta.label}</span>
                                            </div>

                                            <div className={`employer-profile__status-chip employer-profile__status-chip--verification-${(verificationState || 'not_started').toLowerCase()}`}>
                                                <span className="employer-profile__status-chip-label">Верификация</span>
                                                <span className="employer-profile__status-chip-value">
                                                    {verificationState === 'APPROVED' && 'Пройдена'}
                                                    {verificationState === 'PENDING' && 'На проверке'}
                                                    {verificationState === 'REJECTED' && 'Отклонена'}
                                                    {verificationState === 'NOT_STARTED' && 'Не начата'}
                                                    {!['APPROVED', 'PENDING', 'REJECTED', 'NOT_STARTED'].includes(verificationState) && verificationState}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="employer-profile__hero-text">
                                            {moderationMeta.description}
                                        </p>
                                    </div>
                                </div>

                                {moderationState === 'NEEDS_REVISION' && (
                                    <div className="employer-profile__revision-card">
                                        <div className="employer-profile__revision-header">
                                            <h3>Профиль требует доработки</h3>
                                            {isModerationFeedbackLoading && (
                                                <span className="employer-profile__revision-meta">Загружаем комментарий куратора…</span>
                                            )}
                                        </div>

                                        <p className="employer-profile__revision-text">
                                            Куратор вернул профиль на правки. Исправьте данные и отправьте профиль повторно.
                                        </p>

                                        {moderationFeedback?.comment && (
                                            <div className="employer-profile__revision-block">
                                                <span className="employer-profile__revision-label">Комментарий куратора</span>
                                                <p>{moderationFeedback.comment}</p>
                                            </div>
                                        )}

                                        {moderationFeedback?.fieldIssues?.length > 0 && (
                                            <div className="employer-profile__revision-block">
                                                <span className="employer-profile__revision-label">Что нужно исправить</span>
                                                <ul className="employer-profile__revision-list">
                                                    {moderationFeedback.fieldIssues.map((issue, index) => (
                                                        <li key={`${issue.field || 'field'}-${index}`}>
                                                            <strong>{issue.field || 'Поле'}:</strong> {issue.message}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {moderationFeedback?.createdAt && (
                                            <p className="employer-profile__revision-meta">
                                                Последнее замечание: {formatDate(moderationFeedback.createdAt)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {(moderationState === 'DRAFT' || moderationState === 'APPROVED' || moderationState === 'NEEDS_REVISION') && (
                                    <div className="employer-profile__moderation-actions">
                                        {moderationMissingItems.length > 0 && (
                                            <div className="employer-profile__moderation-hint">
                                                Для отправки на модерацию заполните: {moderationMissingItems.join(', ')}.
                                            </div>
                                        )}

                                        <Button
                                            className="button--primary"
                                            onClick={handleSubmitEmployerProfileForModeration}
                                            disabled={isLoading || !canSubmitProfileToModeration}
                                        >
                                            {isLoading ? 'Отправка...' : moderationSubmitButtonText}
                                        </Button>
                                    </div>
                                )}

                                <div className="employer-profile__grid">
                                    <div className="employer-profile__field">
                                        <Label>Название</Label>
                                        <div className="field-value">{profile.companyName || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>ИНН</Label>
                                        <div className="field-value">{profile.inn || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Юр. название</Label>
                                        <div className="field-value">{profile.legalName || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Сфера</Label>
                                        <div className="field-value">{profile.industry || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Сайт</Label>
                                        <div className="field-value">
                                            {profile.websiteUrl ? (
                                                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">
                                                    {profile.websiteUrl}
                                                </a>
                                            ) : '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Город</Label>
                                        <div className="field-value">{profile.cityName || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Размер</Label>
                                        <div className="field-value">
                                            {COMPANY_SIZE_OPTIONS.find((item) => item.value === profile.companySize)?.label || '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Год основания</Label>
                                        <div className="field-value">{profile.foundedYear || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field employer-profile__field--wide">
                                        <Label>Описание</Label>
                                        <div className="field-value">{profile.description || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Социальные сети</Label>
                                        <div className="field-value">
                                            {profile.socialLinks?.length > 0 ? (
                                                <div className="links-list">
                                                    {profile.socialLinks.map((item, index) => (
                                                        <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer" className="link-item">
                                                            <img src={linkIcon} alt="" className="icon-small" />
                                                            <span>{item.label || item.url}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Контакты для связи</Label>
                                        <div className="field-value">
                                            {profile.publicContacts?.length > 0 ? (
                                                <div className="links-list">
                                                    {profile.publicContacts.map((item, index) => (
                                                        <div key={`${item.value}-${index}`} className="link-item">
                                                            <img src={linkIcon} alt="" className="icon-small" />
                                                            <span>{item.label ? `${item.label}: ` : ''}</span>
                                                            {renderContactMethod(item)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Статус верификации</Label>
                                        <div className={`field-value verification-status status-${(verificationState || 'not_started').toLowerCase()}`}>
                                            {verificationState === 'APPROVED' && 'Верифицирован'}
                                            {verificationState === 'PENDING' && 'На проверке'}
                                            {verificationState === 'REJECTED' && 'Отклонён'}
                                            {verificationState === 'NOT_STARTED' && 'Не начата'}
                                            {!['APPROVED', 'PENDING', 'REJECTED', 'NOT_STARTED'].includes(verificationState) && verificationState}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Статус модерации профиля</Label>
                                        <div className={`field-value employer-profile__moderation-state employer-profile__moderation-state--${moderationMeta.tone}`}>
                                            {moderationMeta.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isEditingCompanyData ? (
                            <div className="employer-profile__edit">
                                <div className="employer-profile__edit-header">
                                    <h2>Реквизиты компании</h2>

                                    <button
                                        type="button"
                                        className="employer-profile__edit-close"
                                        onClick={() => setIsEditingCompanyData(false)}
                                        aria-label="Закрыть форму редактирования"
                                    >
                                        ×
                                    </button>
                                </div>

                                <p className="employer-profile__section-hint">
                                    Здесь хранятся юридическое название и ИНН. Название компании для карточки и модерации редактируется в публичном профиле.
                                </p>

                                <div className="employer-profile__edit-field">
                                    <Label>Юридическое название <span className="required-star">*</span></Label>
                                    <Input
                                        value={profile.legalName || ''}
                                        onChange={(e) => setProfile((prev) => ({ ...prev, legalName: e.target.value }))}
                                    />
                                    {errors.legalName && <p className="field-error">{errors.legalName}</p>}
                                </div>

                                <div className="employer-profile__edit-field">
                                    <Label>ИНН <span className="required-star">*</span></Label>
                                    <Input
                                        value={profile.inn || ''}
                                        maxLength={12}
                                        onChange={(e) => setProfile((prev) => ({
                                            ...prev,
                                            inn: e.target.value.replace(/[^\d]/g, '').slice(0, 12),
                                        }))}
                                    />
                                    {errors.inn && <p className="field-error">{errors.inn}</p>}
                                </div>

                                <div className="employer-profile__edit-actions">
                                    <Button className="button--primary" onClick={handleSaveCompanyData} disabled={isLoading}>
                                        {isLoading ? 'Сохранение...' : 'Сохранить реквизиты'}
                                    </Button>
                                    <Button className="button--ghost" onClick={() => setIsEditingCompanyData(false)}>
                                        Отменить
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="employer-profile__edit">
                                <div className="employer-profile__edit-header">
                                    <h2>Публичный профиль компании</h2>

                                    <button
                                        type="button"
                                        className="employer-profile__edit-close"
                                        onClick={() => setIsEditingProfile(false)}
                                        aria-label="Закрыть форму редактирования"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="employer-profile__edit-section employer-profile__edit-section--accent">
                                    <div className="employer-profile__edit-section-header">
                                        <h3 className="employer-profile__edit-section-title">Брендинг</h3>
                                        <p className="employer-profile__edit-section-text">
                                            Загрузите логотип, который будет отображаться в публичном профиле компании.
                                        </p>
                                    </div>

                                    <div className="employer-profile__logo-manager">
                                        <div className="employer-profile__logo-manager-card">
                                            <div className="employer-profile__logo-manager-preview">
                                                {logoUrl ? (
                                                    <img
                                                        src={logoUrl}
                                                        alt={profile.companyName || 'Логотип компании'}
                                                        className="employer-profile__logo-image"
                                                    />
                                                ) : (
                                                    <div className="employer-profile__logo-placeholder">
                                                        {(profile.companyName?.trim()?.[0] || 'C').toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="employer-profile__logo-manager-body">
                                                <div className="employer-profile__logo-manager-actions">
                                                    <Button
                                                        className="button--outline"
                                                        onClick={() => logoInputRef.current?.click()}
                                                        disabled={isLogoUploading}
                                                    >
                                                        {isLogoUploading
                                                            ? 'Загрузка...'
                                                            : profile.logo
                                                                ? 'Заменить логотип'
                                                                : 'Загрузить логотип'}
                                                    </Button>

                                                    {profile.logo && (
                                                        <Button
                                                            className="button--ghost employer-profile__danger-button"
                                                            onClick={handleDeleteLogo}
                                                            disabled={isLogoUploading}
                                                        >
                                                            Удалить
                                                        </Button>
                                                    )}
                                                </div>

                                                <p className="employer-profile__upload-hint">
                                                    Поддерживаются форматы: {EMPLOYER_LOGO_FORMATS_HINT}.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="employer-profile__edit-section">
                                    <div className="employer-profile__edit-section-header">
                                        <h3 className="employer-profile__edit-section-title">Основная информация</h3>
                                        <p className="employer-profile__edit-section-text">
                                            Эти данные увидят соискатели в карточке и в публичном профиле компании.
                                        </p>
                                    </div>

                                    <div className="employer-profile__edit-field">
                                        <Label>Название компании <span className="required-star">*</span></Label>
                                        <Input
                                            value={profile.companyName}
                                            onChange={(e) => setProfile((prev) => ({
                                                ...prev,
                                                companyName: e.target.value,
                                            }))}
                                            placeholder="Как компания будет отображаться на платформе"
                                        />
                                        {errors.companyName && <p className="field-error">{errors.companyName}</p>}
                                    </div>

                                    <div className="employer-profile__edit-grid">
                                        <div className="employer-profile__edit-field">
                                            <Label>Сфера деятельности <span className="required-star">*</span></Label>
                                            <Input
                                                value={profile.industry}
                                                onChange={(e) => setProfile((prev) => ({
                                                    ...prev,
                                                    industry: e.target.value,
                                                }))}
                                            />
                                            {errors.industry && <p className="field-error">{errors.industry}</p>}
                                        </div>

                                        <div className="employer-profile__edit-field">
                                            <Label>Сайт компании</Label>
                                            <Input
                                                value={profile.websiteUrl}
                                                onChange={(e) => setProfile((prev) => ({
                                                    ...prev,
                                                    websiteUrl: e.target.value,
                                                }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="employer-profile__edit-section">
                                    <div className="employer-profile__edit-section-header">
                                        <h3 className="employer-profile__edit-section-title">Локация и параметры</h3>
                                        <p className="employer-profile__edit-section-text">
                                            Укажите город, размер компании и дополнительные сведения для карточки работодателя.
                                        </p>
                                    </div>

                                    <div className="employer-profile__edit-grid">
                                        <div className="employer-profile__edit-field" ref={citySearchRef}>
                                            <Label>Город <span className="required-star">*</span></Label>
                                            <div className="autocomplete">
                                                <Input
                                                    value={citySearchQuery}
                                                    onChange={(e) => handleCitySearch(e.target.value)}
                                                    onFocus={() => citySearchQuery.length >= 2 && citySuggestions.length > 0 && setIsCitySearchOpen(true)}
                                                    placeholder="Начните вводить город"
                                                />
                                                {isCitySearchOpen && citySuggestions.length > 0 && (
                                                    <div className="autocomplete__list" role="listbox">
                                                        {citySuggestions.map((city) => (
                                                            <button
                                                                key={city.id}
                                                                type="button"
                                                                className="autocomplete__item"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => handleSelectCity(city)}
                                                            >
                                                                {city.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {errors.city && <p className="field-error">{errors.city}</p>}
                                        </div>

                                        <CustomSelect
                                            label="Размер компании"
                                            value={profile.companySize}
                                            onChange={(val) => setProfile((prev) => ({ ...prev, companySize: val }))}
                                            options={COMPANY_SIZE_OPTIONS}
                                        />
                                    </div>

                                    <div className="employer-profile__edit-field">
                                        <Label>Год основания</Label>
                                        <Input
                                            value={profile.foundedYear || ''}
                                            onChange={(e) => setProfile((prev) => ({
                                                ...prev,
                                                foundedYear: e.target.value.replace(/[^\d]/g, '').slice(0, 4),
                                            }))}
                                        />
                                    </div>
                                </div>

                                <div className="employer-profile__edit-section">
                                    <div className="employer-profile__edit-section-header">
                                        <h3 className="employer-profile__edit-section-title">Описание и публичные каналы</h3>
                                        <p className="employer-profile__edit-section-text">
                                            Добавьте описание, ссылки на сайт и способы связи, чтобы профиль выглядел завершённым и вызывал доверие.
                                        </p>
                                    </div>

                                    <div className="employer-profile__edit-field">
                                        <Label>Описание компании</Label>
                                        <Textarea
                                            rows={4}
                                            value={profile.description}
                                            onChange={(e) => setProfile((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))}
                                        />
                                    </div>

                                    <div className="employer-profile__edit-stack">
                                        <LinksEditor
                                            label="Социальные сети"
                                            rows={socialRows}
                                            setRows={setSocialRows}
                                            placeholderTitle="Название"
                                            placeholderUrl="https://..."
                                        />

                                        <div className="employer-profile__contacts-block">
                                            <LinksEditor
                                                label="Контакты для связи"
                                                rows={contactRows}
                                                setRows={setContactRows}
                                                placeholderTitle="Тип контакта"
                                                placeholderUrl="mailto: / tel: / https://..."
                                            />
                                        </div>

                                        {errors.publicContacts && <p className="field-error">{errors.publicContacts}</p>}
                                    </div>
                                </div>

                                <div className="employer-profile__edit-actions">
                                    <Button className="button--primary" onClick={handleSaveProfile} disabled={isLoading}>
                                        {isLoading ? 'Сохранение...' : 'Сохранить'}
                                    </Button>
                                    <Button className="button--ghost" onClick={() => setIsEditingProfile(false)}>
                                        Отменить
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showVerificationModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Верификация компании</h3>
                        <p className="field-hint">
                            Подтвердите статус компании, чтобы получить доступ к публикации вакансий и мероприятий.
                        </p>

                        <div className="modal__field">
                            <Label>Способ верификации</Label>
                            <CustomSelect
                                value={verificationData.verificationMethod}
                                onChange={(val) => setVerificationData((prev) => ({ ...prev, verificationMethod: val }))}
                                options={VERIFICATION_METHODS}
                            />
                        </div>

                        {verificationData.verificationMethod === 'CORPORATE_EMAIL' && (
                            <div className="modal__field">
                                <Label>Корпоративная почта</Label>
                                <Input
                                    value={verificationData.corporateEmail}
                                    onChange={(e) => setVerificationData((prev) => ({ ...prev, corporateEmail: e.target.value }))}
                                    placeholder="name@company.com"
                                />
                            </div>
                        )}

                        {verificationData.verificationMethod === 'TIN' && (
                            <div className="modal__field">
                                <Label>ИНН</Label>
                                <Input
                                    value={verificationData.inn}
                                    maxLength={12}
                                    onChange={(e) => setVerificationData((prev) => ({
                                        ...prev,
                                        inn: e.target.value.replace(/[^\d]/g, '').slice(0, 12),
                                    }))}
                                    placeholder="1234567890"
                                />
                                <p className="field-hint">
                                    Для проверки будет использован ИНН из реквизитов компании. Перед отправкой он сохранится в профиле.
                                </p>
                            </div>
                        )}

                        {verificationData.verificationMethod === 'PROFESSIONAL_LINKS' && (
                            <LinksEditor
                                label="Профессиональные ссылки"
                                rows={verificationLinkRows}
                                setRows={setVerificationLinkRows}
                                placeholderTitle="Площадка"
                                placeholderUrl="https://..."
                            />
                        )}

                        <div className="modal__field">
                            <Label>Комментарий</Label>
                            <Textarea
                                rows={3}
                                value={verificationData.submittedComment}
                                onChange={(e) => setVerificationData((prev) => ({ ...prev, submittedComment: e.target.value }))}
                                placeholder="Опишите, что прикладываете для верификации"
                            />
                        </div>

                        <div className="modal__actions">
                            <Button className="button--primary" onClick={handleSubmitVerification}>
                                Отправить
                            </Button>
                            <Button className="button--ghost" onClick={() => setShowVerificationModal(false)}>
                                Отмена
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isApplicantModalOpen && selectedApplicant && (
                <div className="modal-overlay" onClick={() => setIsApplicantModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Профиль кандидата</h3>

                        <div className="employer-profile__grid">
                            <div className="employer-profile__field">
                                <Label>Имя</Label>
                                <div className="field-value">{selectedApplicant.fullName || selectedApplicant.displayName || '—'}</div>
                            </div>
                            <div className="employer-profile__field">
                                <Label>Вуз</Label>
                                <div className="field-value">{selectedApplicant.universityName || '—'}</div>
                            </div>
                            <div className="employer-profile__field">
                                <Label>Курс</Label>
                                <div className="field-value">{selectedApplicant.course || '—'}</div>
                            </div>
                            <div className="employer-profile__field">
                                <Label>Год выпуска</Label>
                                <div className="field-value">{selectedApplicant.graduationYear || '—'}</div>
                            </div>
                            <div className="employer-profile__field">
                                <Label>Открыт к работе</Label>
                                <div className="field-value">{selectedApplicant.openToWork ? 'Да' : 'Нет'}</div>
                            </div>
                            <div className="employer-profile__field">
                                <Label>Открыт к мероприятиям</Label>
                                <div className="field-value">{selectedApplicant.openToEvents ? 'Да' : 'Нет'}</div>
                            </div>
                            <div className="employer-profile__field">
                                <Label>Навыки</Label>
                                <div className="field-value">
                                    {selectedApplicant.skills?.length > 0
                                        ? selectedApplicant.skills.join(', ')
                                        : '—'}
                                </div>
                            </div>
                        </div>

                        <div className="modal__actions">
                            <Button className="button--ghost" onClick={() => setIsApplicantModalOpen(false)}>
                                Закрыть
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default EmployerDashboard