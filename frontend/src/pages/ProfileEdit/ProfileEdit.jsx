import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '../../hooks/use-toast'
import { RUSSIAN_UNIVERSITIES } from '../../constants/universities'
import { INDUSTRIES } from '../../constants/industries'
import { FACULTIES } from '../../constants/faculties'
import { STUDY_PROGRAMS } from '../../constants/studyPrograms'
import { getCurrentUserInfo } from '../../api/auth'
import {
    getApplicantProfile,
    getEmployerProfile,
    updateApplicantProfile,
    updateEmployerCompanyData,
    updateEmployerProfile,
} from '../../api/profile'
import {
    createEmployerLocation,
    getEmployerLocations,
    resolveGeoAddress,
    searchGeoCities,
    suggestGeoAddress,
} from '../../api/geo'
import {
    clearSessionUser,
    getSessionUser,
    setSessionUser,
    subscribeSessionChange,
} from '../../utils/sessionStore'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../components/Card'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Label from '../../components/Label'
import Textarea from '../../components/Textarea'
import Autocomplete from '../../components/Autocomplete'
import LinksEditor from '../../components/LinksEditor'
import CustomSelect from '../../components/CustomSelect'
import CustomCheckbox from '../../components/CustomCheckbox'
import { smartFilter } from '../../utils/searchHelpers'
import { toShort, cleanLinksToArray, createLinkRow } from '../../utils/formHelpers'
import './ProfileEdit.scss'

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'AUTHENTICATED', label: 'Только зарегистрированным' },
    { value: 'PRIVATE', label: 'Только мне' },
]

const COMPANY_SIZE_OPTIONS = [
    { value: 'STARTUP', label: 'Стартап (1–10)' },
    { value: 'SMALL', label: 'Малый бизнес (11–50)' },
    { value: 'MEDIUM', label: 'Средний (51–200)' },
    { value: 'LARGE', label: 'Крупный (201–1000)' },
    { value: 'ENTERPRISE', label: 'Корпорация (1000+)' },
]

function mapLinksToRows(items = [], valueKey = 'url') {
    if (!Array.isArray(items) || items.length === 0) {
        return [createLinkRow()]
    }

    return items.map((item, index) =>
        createLinkRow(
            item?.label || item?.title || `Ссылка ${index + 1}`,
            item?.[valueKey] || item?.url || item?.value || ''
        )
    )
}

function buildEmployerLocationLabel(location) {
    const title = String(location?.title || '').trim()
    const address = String(location?.addressLine || '').trim()
    const cityName = String(location?.city?.name || '').trim()

    if (title && address) {
        return `${title} — ${address}`
    }

    if (address && cityName) {
        return `${address} (${cityName})`
    }

    return address || title || `Локация #${location?.id}`
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
}

function findMatchingLocation(locations, addressData) {
    const normalizedFiasId = normalizeText(addressData?.fiasId)
    const normalizedUnrestrictedValue = normalizeText(addressData?.unrestrictedValue)
    const normalizedAddressLine = normalizeText(addressData?.addressLine)

    return locations.find((location) => {
        const sameFiasId =
            normalizedFiasId &&
            normalizeText(location?.fiasId) &&
            normalizeText(location?.fiasId) === normalizedFiasId

        const sameUnrestrictedValue =
            normalizedUnrestrictedValue &&
            normalizeText(location?.unrestrictedValue) &&
            normalizeText(location?.unrestrictedValue) === normalizedUnrestrictedValue

        const sameAddress =
            normalizedAddressLine &&
            normalizeText(location?.addressLine) === normalizedAddressLine &&
            String(location?.cityId || '') === String(addressData?.cityId || '')

        return sameFiasId || sameUnrestrictedValue || sameAddress
    })
}

function ProfileEdit() {
    const [, navigate] = useLocation()
    const { toast } = useToast()

    const [user, setUser] = useState(getSessionUser())
    const [isLoading, setIsLoading] = useState(true)
    const [isProfileLoading, setIsProfileLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [isUniversityOpen, setIsUniversityOpen] = useState(false)
    const [isIndustryOpen, setIsIndustryOpen] = useState(false)
    const [isApplicantCityOpen, setIsApplicantCityOpen] = useState(false)
    const [isEmployerCityOpen, setIsEmployerCityOpen] = useState(false)
    const [isAddressOpen, setIsAddressOpen] = useState(false)
    const [isFacultyOpen, setIsFacultyOpen] = useState(false)
    const [isStudyProgramOpen, setIsStudyProgramOpen] = useState(false)

    const [universityActiveIndex, setUniversityActiveIndex] = useState(-1)
    const [industryActiveIndex, setIndustryActiveIndex] = useState(-1)
    const [applicantCityActiveIndex, setApplicantCityActiveIndex] = useState(-1)
    const [employerCityActiveIndex, setEmployerCityActiveIndex] = useState(-1)
    const [addressActiveIndex, setAddressActiveIndex] = useState(-1)
    const [facultyActiveIndex, setFacultyActiveIndex] = useState(-1)
    const [studyProgramActiveIndex, setStudyProgramActiveIndex] = useState(-1)

    const universityRef = useRef(null)
    const industryRef = useRef(null)
    const applicantCityRef = useRef(null)
    const employerCityRef = useRef(null)
    const addressRef = useRef(null)
    const facultyRef = useRef(null)
    const studyProgramRef = useRef(null)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [middleName, setMiddleName] = useState('')
    const [universityName, setUniversityName] = useState('')
    const [universityQuery, setUniversityQuery] = useState('')
    const [facultyName, setFacultyName] = useState('')
    const [facultyQuery, setFacultyQuery] = useState('')
    const [studyProgram, setStudyProgram] = useState('')
    const [studyProgramQuery, setStudyProgramQuery] = useState('')
    const [course, setCourse] = useState('')
    const [graduationYear, setGraduationYear] = useState('')
    const [cityId, setCityId] = useState('')
    const [cityQuery, setCityQuery] = useState('')
    const [about, setAbout] = useState('')
    const [resumeText, setResumeText] = useState('')
    const [portfolioRows, setPortfolioRows] = useState([createLinkRow()])
    const [contactRows, setContactRows] = useState([createLinkRow()])
    const [profileVisibility, setProfileVisibility] = useState('PUBLIC')
    const [resumeVisibility, setResumeVisibility] = useState('AUTHENTICATED')
    const [applicationsVisibility, setApplicationsVisibility] = useState('PRIVATE')
    const [contactsVisibility, setContactsVisibility] = useState('AUTHENTICATED')
    const [openToWork, setOpenToWork] = useState(true)
    const [openToEvents, setOpenToEvents] = useState(true)

    const [companyName, setCompanyName] = useState('')
    const [legalName, setLegalName] = useState('')
    const [inn, setInn] = useState('')
    const [description, setDescription] = useState('')
    const [industry, setIndustry] = useState('')
    const [industryQuery, setIndustryQuery] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [cityIdEmployer, setCityIdEmployer] = useState('')
    const [cityQueryEmployer, setCityQueryEmployer] = useState('')
    const [addressQuery, setAddressQuery] = useState('')
    const [selectedAddressSuggestion, setSelectedAddressSuggestion] = useState(null)
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [companySize, setCompanySize] = useState('')
    const [foundedYear, setFoundedYear] = useState('')
    const [socialRows, setSocialRows] = useState([createLinkRow()])
    const [publicContactRows, setPublicContactRows] = useState([createLinkRow()])

    const [applicantCityOptions, setApplicantCityOptions] = useState([])
    const [employerCityOptions, setEmployerCityOptions] = useState([])
    const [addressOptions, setAddressOptions] = useState([])
    const [employerLocations, setEmployerLocations] = useState([])

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
            if (!nextUser) {
                setIsLoading(false)
            }
        })

        const loadUser = async () => {
            setIsLoading(true)

            try {
                const localUser = getSessionUser()

                if (!localUser) {
                    const apiUserResponse = await getCurrentUserInfo()
                    const apiUser = apiUserResponse?.user || apiUserResponse || null

                    if (apiUser) {
                        setSessionUser(apiUser)
                        setUser(apiUser)
                    } else {
                        setUser(null)
                    }

                    return
                }

                setUser(localUser)

                const apiUserResponse = await getCurrentUserInfo()
                const apiUser = apiUserResponse?.user || apiUserResponse || null

                if (apiUser) {
                    setSessionUser(apiUser)
                    setUser(apiUser)
                } else {
                    clearSessionUser()
                    setUser(null)
                }
            } catch (error) {
                console.error('Error loading user:', error)
                clearSessionUser()
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        loadUser()

        return unsubscribe
    }, [])

    const role = user?.role
    const isEmployer = role === 'EMPLOYER'

    useEffect(() => {
        if (!user?.id && !user?.userId) return

        let isCancelled = false

        const loadProfileData = async () => {
            setIsProfileLoading(true)

            try {
                if (isEmployer) {
                    const [profile, locations] = await Promise.all([
                        getEmployerProfile(),
                        getEmployerLocations().catch(() => []),
                    ])

                    if (isCancelled) return

                    const safeLocations = Array.isArray(locations) ? locations : []
                    setEmployerLocations(safeLocations)

                    if (profile) {
                        setCompanyName(profile.companyName || user?.displayName || '')
                        setLegalName(profile.legalName || '')
                        setInn(profile.inn || '')
                        setDescription(profile.description || '')
                        setIndustry(profile.industry || '')
                        setIndustryQuery(profile.industry || '')
                        setWebsiteUrl(profile.websiteUrl || '')
                        setCityIdEmployer(profile.cityId ? String(profile.cityId) : '')
                        setCityQueryEmployer(profile.cityName || profile.locationPreview?.city?.name || '')
                        setSelectedLocationId(profile.locationId ? String(profile.locationId) : '')
                        setAddressQuery(
                            profile.locationPreview?.unrestrictedValue ||
                            profile.locationPreview?.addressLine ||
                            ''
                        )
                        setCompanySize(profile.companySize || '')
                        setFoundedYear(profile.foundedYear ? String(profile.foundedYear) : '')
                        setSocialRows(mapLinksToRows(profile.socialLinks, 'url'))
                        setPublicContactRows(mapLinksToRows(profile.publicContacts, 'value'))
                    } else {
                        setCompanyName(user?.displayName || '')
                    }
                } else {
                    const profile = await getApplicantProfile()

                    if (isCancelled) return

                    if (profile) {
                        setFirstName(profile.firstName || '')
                        setLastName(profile.lastName || '')
                        setMiddleName(profile.middleName || '')
                        setUniversityName(profile.universityName || '')
                        setUniversityQuery(profile.universityName || '')
                        setFacultyName(profile.facultyName || '')
                        setFacultyQuery(profile.facultyName || '')
                        setStudyProgram(profile.studyProgram || '')
                        setStudyProgramQuery(profile.studyProgram || '')
                        setCourse(profile.course ? String(profile.course) : '')
                        setGraduationYear(profile.graduationYear ? String(profile.graduationYear) : '')
                        setCityId(profile.cityId ? String(profile.cityId) : '')
                        setCityQuery(profile.cityName || '')
                        setAbout(profile.about || '')
                        setResumeText(profile.resumeText || '')
                        setPortfolioRows(mapLinksToRows(profile.portfolioLinks, 'url'))
                        setContactRows(mapLinksToRows(profile.contactLinks, 'value'))
                        setProfileVisibility(profile.profileVisibility || 'PUBLIC')
                        setResumeVisibility(profile.resumeVisibility || 'AUTHENTICATED')
                        setApplicationsVisibility(profile.applicationsVisibility || 'PRIVATE')
                        setContactsVisibility(profile.contactsVisibility || 'AUTHENTICATED')
                        setOpenToWork(profile.openToWork ?? true)
                        setOpenToEvents(profile.openToEvents ?? true)
                    }
                }
            } catch (error) {
                console.error('[ProfileEdit] load profile error:', error)
            } finally {
                if (!isCancelled) {
                    setIsProfileLoading(false)
                }
            }
        }

        loadProfileData()

        return () => {
            isCancelled = true
        }
    }, [isEmployer, user?.displayName, user?.id, user?.userId])

    useEffect(() => {
        if (user && isEmployer && !companyName) {
            setCompanyName(user.displayName || '')
        }
    }, [user, isEmployer, companyName])

    const universitySuggestions = useMemo(
        () => smartFilter(RUSSIAN_UNIVERSITIES, universityQuery),
        [universityQuery]
    )

    const industrySuggestions = useMemo(
        () => smartFilter(INDUSTRIES, industryQuery),
        [industryQuery]
    )

    const facultySuggestions = useMemo(
        () => smartFilter(FACULTIES, facultyQuery),
        [facultyQuery]
    )

    const studyProgramSuggestions = useMemo(
        () => smartFilter(STUDY_PROGRAMS, studyProgramQuery),
        [studyProgramQuery]
    )

    const applicantCitySuggestionLabels = useMemo(
        () => applicantCityOptions.map((city) => city.name),
        [applicantCityOptions]
    )

    const employerCitySuggestionLabels = useMemo(
        () => employerCityOptions.map((city) => city.name),
        [employerCityOptions]
    )

    const addressSuggestionLabels = useMemo(
        () =>
            addressOptions.map(
                (item) => item.value || item.unrestrictedValue || item.addressLine || ''
            ),
        [addressOptions]
    )

    const employerLocationOptions = useMemo(() => {
        const filtered = employerLocations.filter((location) => {
            if (!cityIdEmployer) return true
            return String(location.cityId) === String(cityIdEmployer)
        })

        return filtered.map((location) => ({
            value: String(location.id),
            label: buildEmployerLocationLabel(location),
        }))
    }, [cityIdEmployer, employerLocations])

    useEffect(() => {
        const normalizedQuery = cityQuery.trim()

        if (normalizedQuery.length < 2) {
            setApplicantCityOptions([])
            return
        }

        let isCancelled = false

        const timer = setTimeout(async () => {
            try {
                const cities = await searchGeoCities(normalizedQuery, 10)
                if (!isCancelled) {
                    setApplicantCityOptions(Array.isArray(cities) ? cities : [])
                }
            } catch {
                if (!isCancelled) {
                    setApplicantCityOptions([])
                }
            }
        }, 250)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [cityQuery])

    useEffect(() => {
        const normalizedQuery = cityQueryEmployer.trim()

        if (normalizedQuery.length < 2) {
            setEmployerCityOptions([])
            return
        }

        let isCancelled = false

        const timer = setTimeout(async () => {
            try {
                const cities = await searchGeoCities(normalizedQuery, 10)
                if (!isCancelled) {
                    setEmployerCityOptions(Array.isArray(cities) ? cities : [])
                }
            } catch {
                if (!isCancelled) {
                    setEmployerCityOptions([])
                }
            }
        }, 250)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [cityQueryEmployer])

    useEffect(() => {
        const normalizedQuery = addressQuery.trim()

        if (!isEmployer || !cityIdEmployer || normalizedQuery.length < 3) {
            setAddressOptions([])
            return
        }

        let isCancelled = false

        const timer = setTimeout(async () => {
            try {
                const suggestions = await suggestGeoAddress({
                    query: normalizedQuery,
                    cityId: Number(cityIdEmployer),
                })

                if (!isCancelled) {
                    setAddressOptions(Array.isArray(suggestions) ? suggestions : [])
                }
            } catch {
                if (!isCancelled) {
                    setAddressOptions([])
                }
            }
        }, 300)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [addressQuery, cityIdEmployer, isEmployer])

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (universityRef.current && !universityRef.current.contains(event.target)) {
                setIsUniversityOpen(false)
                setUniversityActiveIndex(-1)
            }

            if (industryRef.current && !industryRef.current.contains(event.target)) {
                setIsIndustryOpen(false)
                setIndustryActiveIndex(-1)
            }

            if (applicantCityRef.current && !applicantCityRef.current.contains(event.target)) {
                setIsApplicantCityOpen(false)
                setApplicantCityActiveIndex(-1)
            }

            if (employerCityRef.current && !employerCityRef.current.contains(event.target)) {
                setIsEmployerCityOpen(false)
                setEmployerCityActiveIndex(-1)
            }

            if (addressRef.current && !addressRef.current.contains(event.target)) {
                setIsAddressOpen(false)
                setAddressActiveIndex(-1)
            }

            if (facultyRef.current && !facultyRef.current.contains(event.target)) {
                setIsFacultyOpen(false)
                setFacultyActiveIndex(-1)
            }

            if (studyProgramRef.current && !studyProgramRef.current.contains(event.target)) {
                setIsStudyProgramOpen(false)
                setStudyProgramActiveIndex(-1)
            }
        }

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsUniversityOpen(false)
                setIsIndustryOpen(false)
                setIsApplicantCityOpen(false)
                setIsEmployerCityOpen(false)
                setIsAddressOpen(false)
                setIsFacultyOpen(false)
                setIsStudyProgramOpen(false)

                setUniversityActiveIndex(-1)
                setIndustryActiveIndex(-1)
                setApplicantCityActiveIndex(-1)
                setEmployerCityActiveIndex(-1)
                setAddressActiveIndex(-1)
                setFacultyActiveIndex(-1)
                setStudyProgramActiveIndex(-1)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [])

    if (isLoading || isProfileLoading) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Загрузка...</CardTitle>
                        <CardDescription>Пожалуйста, подождите</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Пользователь не найден</CardTitle>
                        <CardDescription>Сначала войдите в систему.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate('/login')}>
                            Перейти ко входу
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!role) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Ошибка данных</CardTitle>
                        <CardDescription>
                            В данных пользователя отсутствует роль. Попробуйте выйти и зайти снова.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => {
                                clearSessionUser()
                                navigate('/login')
                            }}
                        >
                            Выйти и войти заново
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const validateApplicant = () => {
        const next = {}

        if (!firstName.trim()) next.firstName = 'Укажите имя'
        if (!lastName.trim()) next.lastName = 'Укажите фамилию'
        if (!universityName.trim()) next.universityName = 'Укажите вуз'

        if (!course.trim() || toShort(course) < 1 || toShort(course) > 6) {
            next.course = 'Курс от 1 до 6'
        }

        if (!graduationYear.trim() || toShort(graduationYear) < 1990 || toShort(graduationYear) > 2100) {
            next.graduationYear = 'Год выпуска 1990–2100'
        }

        if (!cityId) {
            next.cityId = 'Укажите город'
        }

        return next
    }

    const validateEmployer = () => {
        const next = {}

        if (!companyName.trim()) {
            next.companyName = 'Укажите название компании'
        }

        if (!legalName.trim()) {
            next.legalName = 'Укажите юридическое название'
        }

        if (!inn.trim() || !/^\d{10}(\d{2})?$/.test(inn.trim())) {
            next.inn = 'ИНН 10 или 12 цифр'
        }

        if (!industry.trim()) {
            next.industry = 'Укажите индустрию'
        }

        if (!cityIdEmployer) {
            next.cityIdEmployer = 'Укажите город'
        }

        if (!selectedLocationId && !addressQuery.trim()) {
            next.location = 'Выберите существующую локацию или укажите адрес главного офиса'
        }

        if (websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())) {
            next.websiteUrl = 'Ссылка должна начинаться с http:// или https://'
        }

        return next
    }

    const handleSelectApplicantCity = (selectedLabel) => {
        const found = applicantCityOptions.find((city) => city.name === selectedLabel)
        if (!found) return

        setCityId(String(found.id))
        setCityQuery(found.name)
    }

    const handleSelectEmployerCity = (selectedLabel) => {
        const found = employerCityOptions.find((city) => city.name === selectedLabel)
        if (!found) return

        setCityIdEmployer(String(found.id))
        setCityQueryEmployer(found.name)
        setSelectedAddressSuggestion(null)
        setAddressOptions([])

        const selectedLocation = employerLocations.find(
            (location) => String(location.id) === String(selectedLocationId)
        )

        if (selectedLocation && String(selectedLocation.cityId) !== String(found.id)) {
            setSelectedLocationId('')
            setAddressQuery('')
        }
    }

    const handleSelectAddressSuggestion = (selectedLabel) => {
        const found = addressOptions.find(
            (item) =>
                (item.value || item.unrestrictedValue || item.addressLine || '') === selectedLabel
        )

        if (!found) return

        setSelectedAddressSuggestion(found)
        setAddressQuery(found.value || found.unrestrictedValue || found.addressLine || '')
        setSelectedLocationId('')

        if (found.cityId) {
            setCityIdEmployer(String(found.cityId))
        }

        if (found.cityName) {
            setCityQueryEmployer(found.cityName)
        }
    }

    const handleSelectEmployerLocation = (locationIdValue) => {
        setSelectedLocationId(locationIdValue)

        const selectedLocation = employerLocations.find(
            (location) => String(location.id) === String(locationIdValue)
        )

        if (!selectedLocation) return

        setCityIdEmployer(String(selectedLocation.cityId || ''))
        setCityQueryEmployer(selectedLocation.city?.name || cityQueryEmployer)
        setAddressQuery(
            selectedLocation.unrestrictedValue ||
            selectedLocation.addressLine ||
            ''
        )
        setSelectedAddressSuggestion(null)
    }

    const ensureEmployerMainOfficeLocation = async () => {
        if (selectedLocationId) {
            return Number(selectedLocationId)
        }

        let resolvedAddress = selectedAddressSuggestion

        if (!resolvedAddress && addressQuery.trim()) {
            resolvedAddress = await resolveGeoAddress(addressQuery.trim())
        }

        if (!resolvedAddress?.addressLine) {
            const error = new Error('Не удалось определить адрес главного офиса')
            error.status = 400
            throw error
        }

        const finalCityId = Number(resolvedAddress.cityId || cityIdEmployer || 0)

        if (!finalCityId) {
            const error = new Error('Не удалось определить город главного офиса')
            error.status = 400
            throw error
        }

        if (
            cityIdEmployer &&
            resolvedAddress.cityId &&
            Number(cityIdEmployer) !== Number(resolvedAddress.cityId)
        ) {
            const error = new Error('Адрес главного офиса не соответствует выбранному городу')
            error.status = 400
            throw error
        }

        try {
            const createdLocation = await createEmployerLocation({
                title: 'Главный офис',
                cityId: finalCityId,
                addressLine: resolvedAddress.addressLine,
                addressLine2: null,
                postalCode: resolvedAddress.postalCode || null,
                latitude: resolvedAddress.latitude ?? null,
                longitude: resolvedAddress.longitude ?? null,
                fiasId: resolvedAddress.fiasId || null,
                unrestrictedValue:
                    resolvedAddress.unrestrictedValue ||
                    resolvedAddress.value ||
                    addressQuery.trim(),
                qcGeo: resolvedAddress.qcGeo ?? null,
            })

            const refreshedLocations = await getEmployerLocations().catch(() => [])
            setEmployerLocations(Array.isArray(refreshedLocations) ? refreshedLocations : [])

            if (createdLocation?.id) {
                setSelectedLocationId(String(createdLocation.id))
                return Number(createdLocation.id)
            }
        } catch (error) {
            if (error?.code === 'employer_location_duplicate') {
                const refreshedLocations = await getEmployerLocations().catch(() => [])
                const safeLocations = Array.isArray(refreshedLocations) ? refreshedLocations : []
                setEmployerLocations(safeLocations)

                const matchedLocation = findMatchingLocation(safeLocations, {
                    cityId: finalCityId,
                    addressLine: resolvedAddress.addressLine,
                    unrestrictedValue:
                        resolvedAddress.unrestrictedValue ||
                        resolvedAddress.value ||
                        addressQuery.trim(),
                    fiasId: resolvedAddress.fiasId,
                })

                if (matchedLocation?.id) {
                    setSelectedLocationId(String(matchedLocation.id))
                    return Number(matchedLocation.id)
                }
            }

            throw error
        }

        const error = new Error('Не удалось создать локацию главного офиса')
        error.status = 400
        throw error
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const validation = isEmployer ? validateEmployer() : validateApplicant()
        setErrors(validation)

        if (Object.keys(validation).length > 0) {
            toast({
                title: 'Проверьте форму',
                description: 'Есть ошибки в обязательных полях',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)

        try {
            if (isEmployer) {
                const locationId = await ensureEmployerMainOfficeLocation()
                const finalCityId = cityIdEmployer ? Number(cityIdEmployer) : null

                await updateEmployerCompanyData({
                    legalName: legalName.trim(),
                    inn: inn.trim(),
                })

                await updateEmployerProfile({
                    companyName: companyName.trim(),
                    description: description.trim() || null,
                    industry: industry.trim() || null,
                    websiteUrl: websiteUrl.trim() || null,
                    cityId: finalCityId,
                    locationId,
                    companySize: companySize || null,
                    foundedYear: foundedYear ? toShort(foundedYear) : null,
                    socialLinks: socialRows
                        .filter((row) => row.url?.trim())
                        .map((row, index) => ({
                            label: row.title?.trim() || `Ссылка ${index + 1}`,
                            url: row.url.trim(),
                        })),
                    publicContacts: publicContactRows
                        .filter((row) => row.url?.trim())
                        .map((row, index) => ({
                            type: 'OTHER',
                            label: row.title?.trim() || `Контакт ${index + 1}`,
                            value: row.url.trim(),
                        })),
                })

                toast({
                    title: 'Профиль компании сохранён',
                    description: 'Главный офис создан или привязан корректно.',
                })

                navigate('/employer')
            } else {
                const applicantProfileData = {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    middleName: middleName.trim() || null,
                    universityName: universityName.trim() || null,
                    facultyName: facultyName.trim() || null,
                    studyProgram: studyProgram.trim() || null,
                    course: course ? toShort(course) : null,
                    graduationYear: graduationYear ? toShort(graduationYear) : null,
                    cityId: cityId ? Number(cityId) : null,
                    about: about.trim() || null,
                    resumeText: resumeText.trim() || null,
                    portfolioLinks: cleanLinksToArray(portfolioRows),
                    contactLinks: cleanLinksToArray(contactRows),
                    profileVisibility,
                    resumeVisibility,
                    applicationsVisibility,
                    contactsVisibility,
                    openToWork,
                    openToEvents,
                }

                await updateApplicantProfile(applicantProfileData)

                toast({
                    title: 'Профиль сохранён',
                    description: 'Ваши данные успешно обновлены',
                })

                navigate('/seeker')
            }
        } catch (error) {
            console.error('[ProfileEdit] Ошибка сохранения:', error)

            if ([401, 403].includes(error?.status)) {
                clearSessionUser()
                toast({
                    title: 'Сессия недоступна',
                    description: 'Пожалуйста, войдите снова',
                    variant: 'destructive',
                })
                navigate('/login')
                return
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить профиль',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="profile-edit">
            <Card className="profile-edit__card">
                <CardHeader>
                    <CardTitle>
                        {isEmployer ? 'Профиль компании' : 'Личная информация'}
                    </CardTitle>
                    <CardDescription>
                        {isEmployer
                            ? 'Сохранение работодателя теперь идёт через отдельные данные компании, корректную локацию главного офиса и публичный профиль.'
                            : 'Расскажите о себе — это поможет работодателям найти вас'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form className="profile-edit-form" onSubmit={handleSubmit}>
                        {isEmployer ? (
                            <>
                                <div className="profile-edit-form__grid-2">
                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Название компании
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="companyName"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Например: Яндекс, Сбер, Ozon"
                                        />
                                        {errors.companyName && <p className="field-error">{errors.companyName}</p>}
                                    </div>

                                    <div className="profile-edit-form__field">
                                        <Label>
                                            ИНН
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="inn"
                                            value={inn}
                                            onChange={(e) => setInn(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
                                            placeholder="10 или 12 цифр"
                                        />
                                        {errors.inn && <p className="field-error">{errors.inn}</p>}
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>
                                        Юридическое название
                                        <span className="required-star"> *</span>
                                    </Label>
                                    <Input
                                        id="legalName"
                                        value={legalName}
                                        onChange={(e) => setLegalName(e.target.value)}
                                        placeholder="Полное наименование организации"
                                    />
                                    {errors.legalName && <p className="field-error">{errors.legalName}</p>}
                                </div>

                                <div className="profile-edit-form__grid-2">
                                    <div className="profile-edit-form__field" ref={industryRef}>
                                        <Autocomplete
                                            label="Индустрия"
                                            required={true}
                                            value={industryQuery}
                                            onChange={(val) => {
                                                setIndustryQuery(val)
                                                setIndustry(val)
                                            }}
                                            suggestions={industrySuggestions}
                                            isOpen={isIndustryOpen}
                                            onOpenChange={setIsIndustryOpen}
                                            activeIndex={industryActiveIndex}
                                            onActiveIndexChange={setIndustryActiveIndex}
                                            inputRef={industryRef}
                                            placeholder="IT, Образование, Финансы, Ритейл..."
                                            error={errors.industry}
                                            onSelect={(selected) => {
                                                const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                setIndustry(value)
                                                setIndustryQuery(value)
                                            }}
                                        />
                                    </div>

                                    <div className="profile-edit-form__field" ref={employerCityRef}>
                                        <Autocomplete
                                            label="Город"
                                            required={true}
                                            value={cityQueryEmployer}
                                            onChange={(val) => {
                                                setCityQueryEmployer(val)
                                                setCityIdEmployer('')
                                                setSelectedLocationId('')
                                                setSelectedAddressSuggestion(null)
                                                setAddressQuery('')
                                            }}
                                            suggestions={employerCitySuggestionLabels}
                                            isOpen={isEmployerCityOpen}
                                            onOpenChange={setIsEmployerCityOpen}
                                            activeIndex={employerCityActiveIndex}
                                            onActiveIndexChange={setEmployerCityActiveIndex}
                                            inputRef={employerCityRef}
                                            placeholder="Начните вводить город"
                                            error={errors.cityIdEmployer}
                                            onSelect={(selected) => {
                                                const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                handleSelectEmployerCity(value)
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <CustomSelect
                                        label="Главный офис"
                                        value={selectedLocationId}
                                        onChange={handleSelectEmployerLocation}
                                        options={employerLocationOptions}
                                        placeholder="Выберите уже созданную локацию работодателя"
                                    />
                                    <div className="field-hint">
                                        Можно выбрать уже существующую локацию работодателя или ниже указать новый адрес — тогда локация создастся автоматически.
                                    </div>
                                </div>

                                <div className="profile-edit-form__field" ref={addressRef}>
                                    <Autocomplete
                                        label="Новый адрес главного офиса"
                                        required={!selectedLocationId}
                                        value={addressQuery}
                                        onChange={(val) => {
                                            setAddressQuery(val)
                                            setSelectedAddressSuggestion(null)
                                            setSelectedLocationId('')
                                        }}
                                        suggestions={addressSuggestionLabels}
                                        isOpen={isAddressOpen}
                                        onOpenChange={setIsAddressOpen}
                                        activeIndex={addressActiveIndex}
                                        onActiveIndexChange={setAddressActiveIndex}
                                        inputRef={addressRef}
                                        placeholder="Например: Москва, ул. Тверская, д. 1"
                                        error={errors.location}
                                        onSelect={(selected) => {
                                            const value = typeof selected === 'string' ? selected : selected?.value || ''
                                            handleSelectAddressSuggestion(value)
                                        }}
                                    />
                                    <div className="field-hint">
                                        Этот адрес будет использован для создания employer location и затем поставлен в профиль как главный офис.
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>Сайт компании</Label>
                                    <Input
                                        id="websiteUrl"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://company.ru"
                                    />
                                    {errors.websiteUrl && <p className="field-error">{errors.websiteUrl}</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="profile-edit-form__grid-2">
                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Имя
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Иван"
                                        />
                                        {errors.firstName && <p className="field-error">{errors.firstName}</p>}
                                    </div>

                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Фамилия
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Петров"
                                        />
                                        {errors.lastName && <p className="field-error">{errors.lastName}</p>}
                                    </div>
                                </div>

                                <div className="profile-edit-form__field" ref={universityRef}>
                                    <Autocomplete
                                        label="Вуз"
                                        required={true}
                                        value={universityQuery}
                                        onChange={(val) => {
                                            setUniversityQuery(val)
                                            setUniversityName(val)
                                        }}
                                        suggestions={universitySuggestions}
                                        isOpen={isUniversityOpen}
                                        onOpenChange={setIsUniversityOpen}
                                        activeIndex={universityActiveIndex}
                                        onActiveIndexChange={setUniversityActiveIndex}
                                        inputRef={universityRef}
                                        placeholder="Начните вводить название вуза"
                                        error={errors.universityName}
                                        onSelect={(selected) => {
                                            const value = typeof selected === 'string' ? selected : selected?.name || ''
                                            setUniversityName(value)
                                            setUniversityQuery(value)
                                        }}
                                    />
                                </div>

                                <div className="profile-edit-form__grid-3">
                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Курс
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="course"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            placeholder="1–6"
                                        />
                                        {errors.course && <p className="field-error">{errors.course}</p>}
                                    </div>

                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Год выпуска
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="graduationYear"
                                            value={graduationYear}
                                            onChange={(e) => setGraduationYear(e.target.value)}
                                            placeholder="2028"
                                        />
                                        {errors.graduationYear && <p className="field-error">{errors.graduationYear}</p>}
                                    </div>

                                    <div className="profile-edit-form__field" ref={applicantCityRef}>
                                        <Autocomplete
                                            label="Город"
                                            required={true}
                                            value={cityQuery}
                                            onChange={(val) => {
                                                setCityQuery(val)
                                                setCityId('')
                                            }}
                                            suggestions={applicantCitySuggestionLabels}
                                            isOpen={isApplicantCityOpen}
                                            onOpenChange={setIsApplicantCityOpen}
                                            activeIndex={applicantCityActiveIndex}
                                            onActiveIndexChange={setApplicantCityActiveIndex}
                                            inputRef={applicantCityRef}
                                            placeholder="Начните вводить город"
                                            error={errors.cityId}
                                            onSelect={(selected) => {
                                                const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                handleSelectApplicantCity(value)
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>О себе</Label>
                                    <Textarea
                                        id="about"
                                        rows={3}
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Расскажите о своих навыках, увлечениях, достижениях и карьерных целях"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="button"
                            className="advanced-toggle"
                            onClick={() => setShowAdvanced((value) => !value)}
                        >
                            {showAdvanced ? 'Скрыть дополнительные поля' : 'Показать дополнительные поля'}
                        </button>

                        {showAdvanced && (
                            <div className="advanced-block">
                                {isEmployer ? (
                                    <>
                                        <CustomSelect
                                            label="Размер компании"
                                            value={companySize}
                                            onChange={setCompanySize}
                                            options={COMPANY_SIZE_OPTIONS}
                                            placeholder="Выберите масштаб бизнеса"
                                        />

                                        <div className="profile-edit-form__field">
                                            <Label>Год основания</Label>
                                            <Input
                                                id="foundedYear"
                                                value={foundedYear}
                                                onChange={(e) =>
                                                    setFoundedYear(
                                                        e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                                                    )
                                                }
                                                placeholder="2020"
                                            />
                                        </div>

                                        <div className="profile-edit-form__field">
                                            <Label>Описание компании</Label>
                                            <Textarea
                                                id="description"
                                                rows={4}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Расскажите о миссии, ценностях, продуктах и культуре компании"
                                            />
                                        </div>

                                        <LinksEditor
                                            label="Социальные сети"
                                            rows={socialRows}
                                            setRows={setSocialRows}
                                        />

                                        <LinksEditor
                                            label="Контакты для связи"
                                            rows={publicContactRows}
                                            setRows={setPublicContactRows}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <div className="profile-edit-form__grid-3">
                                            <div className="profile-edit-form__field">
                                                <Label>Отчество</Label>
                                                <Input
                                                    id="middleName"
                                                    value={middleName}
                                                    onChange={(e) => setMiddleName(e.target.value)}
                                                    placeholder="Иванович"
                                                />
                                            </div>

                                            <div className="profile-edit-form__field" ref={facultyRef}>
                                                <Autocomplete
                                                    label="Факультет"
                                                    required={false}
                                                    value={facultyQuery}
                                                    onChange={(val) => {
                                                        setFacultyQuery(val)
                                                        setFacultyName(val)
                                                    }}
                                                    suggestions={facultySuggestions}
                                                    isOpen={isFacultyOpen}
                                                    onOpenChange={setIsFacultyOpen}
                                                    activeIndex={facultyActiveIndex}
                                                    onActiveIndexChange={setFacultyActiveIndex}
                                                    inputRef={facultyRef}
                                                    placeholder="Начните вводить факультет"
                                                    error={null}
                                                    onSelect={(selected) => {
                                                        const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                        setFacultyName(value)
                                                        setFacultyQuery(value)
                                                    }}
                                                />
                                            </div>

                                            <div className="profile-edit-form__field" ref={studyProgramRef}>
                                                <Autocomplete
                                                    label="Образовательная программа"
                                                    required={false}
                                                    value={studyProgramQuery}
                                                    onChange={(val) => {
                                                        setStudyProgramQuery(val)
                                                        setStudyProgram(val)
                                                    }}
                                                    suggestions={studyProgramSuggestions}
                                                    isOpen={isStudyProgramOpen}
                                                    onOpenChange={setIsStudyProgramOpen}
                                                    activeIndex={studyProgramActiveIndex}
                                                    onActiveIndexChange={setStudyProgramActiveIndex}
                                                    inputRef={studyProgramRef}
                                                    placeholder="Начните вводить программу"
                                                    error={null}
                                                    onSelect={(selected) => {
                                                        const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                        setStudyProgram(value)
                                                        setStudyProgramQuery(value)
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="profile-edit-form__field">
                                            <Label>Резюме</Label>
                                            <Textarea
                                                id="resumeText"
                                                rows={5}
                                                value={resumeText}
                                                onChange={(e) => setResumeText(e.target.value)}
                                                placeholder="Опишите опыт работы, ключевые проекты, технологии и навыки"
                                            />
                                        </div>

                                        <LinksEditor label="Портфолио" rows={portfolioRows} setRows={setPortfolioRows} />
                                        <LinksEditor label="Контакты" rows={contactRows} setRows={setContactRows} />

                                        <div className="profile-edit-form__grid-2">
                                            <CustomSelect
                                                label="Видимость профиля"
                                                value={profileVisibility}
                                                onChange={setProfileVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                            <CustomSelect
                                                label="Видимость резюме"
                                                value={resumeVisibility}
                                                onChange={setResumeVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                            <CustomSelect
                                                label="Видимость откликов"
                                                value={applicationsVisibility}
                                                onChange={setApplicationsVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                            <CustomSelect
                                                label="Видимость контактов"
                                                value={contactsVisibility}
                                                onChange={setContactsVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                        </div>

                                        <div className="profile-edit-form__checkboxes">
                                            <CustomCheckbox
                                                checked={openToWork}
                                                onChange={setOpenToWork}
                                                label="Открыт к работе"
                                            />
                                            <CustomCheckbox
                                                checked={openToEvents}
                                                onChange={setOpenToEvents}
                                                label="Открыт к мероприятиям"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? 'Сохранение...'
                                : isEmployer
                                    ? 'Сохранить и перейти в кабинет'
                                    : 'Сохранить профиль'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default ProfileEdit