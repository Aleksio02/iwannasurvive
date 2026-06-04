import './ApplicantPrivacyPreview.scss'

const VIEWERS = [
    {
        id: 'anonymous',
        title: 'Анонимный пользователь',
        description: 'Открывает профиль без входа в аккаунт',
        type: 'ANONYMOUS',
    },
    {
        id: 'authenticated',
        title: 'Работодатель / зарегистрированный пользователь',
        description: 'Вошел в аккаунт, но еще не добавлен в контакты',
        type: 'AUTHENTICATED',
    },
    {
        id: 'contact',
        title: 'Контакт',
        description: 'Пользователь с подтвержденным контактом',
        type: 'CONTACT',
    },
]

function canAccess(visibility, viewerType) {
    if (visibility === 'PUBLIC') return true
    if (visibility === 'AUTHENTICATED') return viewerType !== 'ANONYMOUS'
    if (visibility === 'CONTACTS_ONLY') return viewerType === 'CONTACT'
    if (visibility === 'PRIVATE') return false
    return false
}

function getBlocks(viewer, {
    profileVisibility,
    resumeVisibility,
    applicationsVisibility,
    contactsVisibility,
}) {
    return [
        {
            id: 'profile',
            label: 'Профиль',
            description: 'имя, город, вуз, описание',
            visible: canAccess(profileVisibility, viewer.type),
        },
        {
            id: 'resume',
            label: 'Резюме',
            description: 'резюме, навыки, интересы, портфолио',
            visible: canAccess(resumeVisibility, viewer.type),
        },
        {
            id: 'applications',
            label: 'Отклики',
            description: 'история откликов и карьерная активность',
            visible: canAccess(applicationsVisibility, viewer.type),
        },
        {
            id: 'contacts',
            label: 'Контакты',
            description: 'Telegram, email, телефон и другие способы связи',
            visible: canAccess(contactsVisibility, viewer.type),
        },
    ]
}

function ApplicantPrivacyPreview({
    profileVisibility,
    resumeVisibility,
    applicationsVisibility,
    contactsVisibility,
}) {
    const visibilityState = {
        profileVisibility,
        resumeVisibility,
        applicationsVisibility,
        contactsVisibility,
    }

    return (
        <section className="applicant-privacy-preview" aria-labelledby="applicant-privacy-preview-title">
            <div className="applicant-privacy-preview__header">
                <div>
                    <h3 id="applicant-privacy-preview-title">Как вас видят другие</h3>
                    <p>Предпросмотр обновляется по выбранным настройкам.</p>
                </div>
            </div>

            <div className="applicant-privacy-preview__grid">
                {VIEWERS.map((viewer) => {
                    const blocks = getBlocks(viewer, visibilityState)

                    return (
                        <article key={viewer.id} className="applicant-privacy-preview__viewer">
                            <div className="applicant-privacy-preview__viewer-header">
                                <h4 className="applicant-privacy-preview__viewer-title">
                                    {viewer.title}
                                </h4>
                                <p className="applicant-privacy-preview__viewer-description">
                                    {viewer.description}
                                </p>
                            </div>

                            <div className="applicant-privacy-preview__list">
                                {blocks.map((block) => (
                                    <div
                                        key={block.id}
                                        className={`applicant-privacy-preview__item ${
                                            block.visible
                                                ? 'applicant-privacy-preview__item--visible'
                                                : 'applicant-privacy-preview__item--hidden'
                                        }`}
                                    >
                                        <span
                                            className="applicant-privacy-preview__item-icon"
                                            aria-hidden="true"
                                        >
                                            {block.visible ? '✓' : '•'}
                                        </span>
                                        <div className="applicant-privacy-preview__item-text">
                                            <strong className="applicant-privacy-preview__item-label">
                                                {block.label}
                                            </strong>
                                            <span className="applicant-privacy-preview__item-description">
                                                {block.visible ? 'Видит' : 'Скрыто'} · {block.description}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    )
                })}
            </div>

            <div className="applicant-privacy-preview__legend" aria-hidden="true">
                <span>
                    <i className="applicant-privacy-preview__legend-dot applicant-privacy-preview__legend-dot--visible" />
                    Видит
                </span>
                <span>
                    <i className="applicant-privacy-preview__legend-dot applicant-privacy-preview__legend-dot--hidden" />
                    Скрыто
                </span>
            </div>
        </section>
    )
}

export default ApplicantPrivacyPreview
