import Button from '@/shared/ui/Button'
import { OPPORTUNITY_LABELS } from '@/shared/api/opportunities'
import { Link } from 'wouter'

function PersonalizedRecommendationsSection({
    items,
    isLoading,
    error,
    isOpen,
    hasRequested,
    onToggleOpen,
    onOpenOpportunity,
    onApply,
    onToggleFavorite,
    favoriteOpportunities,
}) {
    const subtitle = isLoading
        ? 'Подбираем подходящие возможности...'
        : hasRequested && items.length > 0
            ? `Нашли ${items.length} подходящих возможностей по профилю.`
            : hasRequested && !error
                ? 'Добавьте навыки, чтобы подборка стала точнее.'
                : 'Подберём возможности по навыкам, интересам и данным профиля.'

    return (
        <section className="personalized-recommendations">
            <div className="personalized-recommendations__heading">
                <div>
                    <h2>Рекомендовано для вас</h2>
                    <p>{subtitle}</p>
                </div>
                <button
                    type="button"
                    className="personalized-recommendations__toggle"
                    onClick={onToggleOpen}
                    aria-expanded={isOpen}
                    aria-controls="personalized-recommendations-panel"
                >
                    {isOpen ? 'Скрыть' : 'Показать'}
                </button>
            </div>

            {isOpen && (
                <div id="personalized-recommendations-panel" className="personalized-recommendations__panel">
                    {isLoading && (
                        <div className="personalized-recommendations__state">Подбираем рекомендации...</div>
                    )}

                    {!isLoading && error && (
                        <div className="personalized-recommendations__state">
                            Не удалось загрузить рекомендации. Каталог ниже доступен как обычно.
                        </div>
                    )}

                    {!isLoading && !error && hasRequested && items.length === 0 && (
                        <div className="personalized-recommendations__state">
                            <strong>Пока нет рекомендаций</strong>
                            <span>Добавьте навыки, чтобы подборка стала точнее.</span>
                            <Link href="/seeker?edit=skills" className="personalized-recommendations__profile-link">
                                Добавить навыки
                            </Link>
                        </div>
                    )}

                    {!isLoading && !error && items.length > 0 && (
                        <div className="personalized-recommendations__grid">
                    {items.map((item) => {
                        const opportunity = item.opportunity
                        const explanation = item.explanation || {}
                        const whyFits = (explanation.whyFits || item.reasons || []).slice(0, 2)
                        const whatToImprove = (explanation.whatToImprove || item.improvementTips || []).slice(0, 2)
                        const matchedSkills = (item.matchedSkills || []).slice(0, 3)
                        const matchedInterests = (item.matchedInterests || []).slice(0, 2)
                        const hiddenMatches = Math.max(
                            0,
                            (item.matchedSkills?.length || 0) + (item.matchedInterests?.length || 0) -
                            matchedSkills.length - matchedInterests.length
                        )

                        return (
                            <article key={opportunity.id} className="personalized-recommendations__card">
                                <div className="personalized-recommendations__card-top">
                                    <span className="personalized-recommendations__source">
                                        {explanation.source === 'AI' ? 'ИИ-пояснение' : 'По профилю'}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Изменить избранное"
                                        className={`opportunities-page__fav-star ${favoriteOpportunities.has(opportunity.id) ? 'is-favorite' : ''}`}
                                        onClick={() => onToggleFavorite(opportunity)}
                                    >
                                        ★
                                    </button>
                                </div>

                                <h3>{opportunity.title}</h3>
                                <p className="personalized-recommendations__company">{opportunity.companyName}</p>

                                <div className="personalized-recommendations__badges">
                                    <span>{OPPORTUNITY_LABELS.type[opportunity.type] || opportunity.type}</span>
                                    <span>{OPPORTUNITY_LABELS.workFormat[opportunity.workFormat] || opportunity.workFormat}</span>
                                    {opportunity.grade && <span>{OPPORTUNITY_LABELS.grade[opportunity.grade] || opportunity.grade}</span>}
                                    {opportunity.city?.name && <span>{opportunity.city.name}</span>}
                                </div>

                                {(matchedSkills.length > 0 || matchedInterests.length > 0) && (
                                    <div className="personalized-recommendations__skills">
                                        {matchedSkills.map((skill) => <span key={`skill-${skill}`}>{skill}</span>)}
                                        {matchedInterests.map((interest) => <span key={`interest-${interest}`}>{interest}</span>)}
                                        {hiddenMatches > 0 && <span>+{hiddenMatches}</span>}
                                    </div>
                                )}

                                <p className="personalized-recommendations__summary">{explanation.summary}</p>

                                {whyFits.length > 0 && (
                                    <div className="personalized-recommendations__list">
                                        <strong>Почему подходит</strong>
                                        <ul>{whyFits.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                                    </div>
                                )}

                                {whatToImprove.length > 0 && (
                                    <div className="personalized-recommendations__list">
                                        <strong>Что подтянуть</strong>
                                        <ul>{whatToImprove.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                                    </div>
                                )}

                                <div className="personalized-recommendations__actions">
                                    <Button className="button--primary" onClick={() => onApply(opportunity)}>
                                        Откликнуться
                                    </Button>
                                    <Button className="button--outline" onClick={() => onOpenOpportunity(opportunity.id)}>
                                        Подробнее
                                    </Button>
                                </div>
                            </article>
                        )
                    })}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}

export default PersonalizedRecommendationsSection
