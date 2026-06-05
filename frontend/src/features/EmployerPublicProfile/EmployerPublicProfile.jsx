import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useRoute } from 'wouter'
import Navbar from '@/shared/layouts/Navbar'
import AppFooter from '@/shared/layouts/AppFooter'
import Label from '@/shared/ui/Label'
import { getPublicEmployerProfile, getFileDownloadUrlByUserAndFile } from '@/shared/api/profile'
import { getSessionUser } from '@/shared/lib/utils/sessionStore'
import { getCompanySizeLabel } from '@/shared/lib/utils/companySize'
import '@/features/Dashboard/EmployerDashboard/EmployerDashboard.scss'
import './EmployerPublicProfile.scss'

function getLocationLabel(location) {
    if (!location) return '—'
    return [location.title, location.cityName, location.addressLine].filter(Boolean).join(' • ')
}

function getDashboardBackHref(role) {
    if (role === 'EMPLOYER') return '/employer'
    if (role === 'CURATOR' || role === 'ADMIN') return '/curator'
    return '/seeker'
}

export default function EmployerPublicProfile() {
    const [, navigate] = useLocation()
    const [match, params] = useRoute('/employers/:id')
    const currentUser = useMemo(() => getSessionUser(), [])
    const employerUserId = params?.id ? Number(params.id) : null

    const [profile, setProfile] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [isLogoImageLoading, setIsLogoImageLoading] = useState(false)

    const backHref = getDashboardBackHref(currentUser?.role)
    const isOwner = Boolean(currentUser?.id && employerUserId && Number(currentUser.id) === employerUserId)

    const logoUrl =
        profile?.logo?.fileId && employerUserId
            ? getFileDownloadUrlByUserAndFile('EMPLOYER', employerUserId, profile.logo.fileId)
            : null

    useEffect(() => {
        setIsLogoImageLoading(Boolean(logoUrl))
    }, [logoUrl])

    useEffect(() => {
        if (!match) return

        if (!employerUserId) {
            setErrorMessage('Не удалось определить профиль работодателя')
            setIsLoading(false)
            return
        }

        let isMounted = true

        async function loadProfile() {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const data = await getPublicEmployerProfile(employerUserId, { cacheTtlMs: 60_000 })
                if (!isMounted) return

                if (!data) {
                    setProfile(null)
                    setErrorMessage('Профиль работодателя не найден')
                    return
                }

                setProfile(data)
            } catch (error) {
                if (!isMounted) return
                setProfile(null)
                setErrorMessage(error?.message || 'Не удалось загрузить профиль работодателя')
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadProfile()

        return () => {
            isMounted = false
        }
    }, [employerUserId, match])

    return (
        <>
            <Navbar />

            <main className="employer-public-profile">
                <div className="employer-public-profile__container">
                    <div className="employer-public-profile__back-row">
                        <button type="button" className="employer-public-profile__back" onClick={() => navigate(backHref)}>
                            ← Назад
                        </button>
                        {isOwner && (
                            <Link href="/employer" className="employer-public-profile__owner-link">
                                Перейти в кабинет работодателя
                            </Link>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="employer-public-profile__state">Загрузка профиля...</div>
                    ) : errorMessage ? (
                        <div className="employer-public-profile__state employer-public-profile__state--error">
                            {errorMessage}
                        </div>
                    ) : (
                        <div className="employer-profile employer-profile--public-view">
                            <div className="employer-profile__view">
                                <div className="employer-profile__hero">
                                    <div className="employer-profile__logo-card">
                                        {logoUrl ? (
                                            <>
                                                <img
                                                    src={logoUrl}
                                                    alt={profile.companyName || 'Логотип компании'}
                                                    className={`employer-profile__logo-image ${isLogoImageLoading ? 'is-loading' : ''}`}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onLoad={() => setIsLogoImageLoading(false)}
                                                    onError={() => setIsLogoImageLoading(false)}
                                                />
                                                {isLogoImageLoading && (
                                                    <div className="employer-profile__logo-loader" aria-hidden="true">
                                                        <div className="loading-spinner" />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="employer-profile__logo-placeholder">
                                                {(profile.companyName?.trim()?.[0] || 'C').toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="employer-profile__hero-info">
                                        <div className="employer-profile__hero-title-row">
                                            <h1>{profile.companyName || 'Компания'}</h1>
                                        </div>
                                        <p className="employer-profile__hero-text">
                                            {profile.description || 'Описание компании пока не заполнено'}
                                        </p>
                                    </div>
                                </div>

                                <div className="employer-profile__grid">
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
                                            ) : (
                                                '—'
                                            )}
                                        </div>
                                    </div>

                                    <div className="employer-profile__field">
                                        <Label>Локация</Label>
                                        <div className="field-value">
                                            {profile.locationPreview
                                                ? getLocationLabel(profile.locationPreview)
                                                : profile.cityName || '—'}
                                        </div>
                                    </div>

                                    <div className="employer-profile__field">
                                        <Label>Размер компании</Label>
                                        <div className="field-value">{getCompanySizeLabel(profile.companySize)}</div>
                                    </div>

                                    <div className="employer-profile__field">
                                        <Label>Год основания</Label>
                                        <div className="field-value">{profile.foundedYear || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <AppFooter />
        </>
    )
}
