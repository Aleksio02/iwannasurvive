import {
    getAiModerationCategoryLabel,
    getAiModerationStatusLabel,
    getAiModerationVerdictClass,
    getAiModerationVerdictLabel,
} from '@/shared/lib/utils/moderationHelpers'

function AiModerationCard({ analysis }) {
    if (!analysis) return null

    const status = analysis.status
    const isSuccess = status === 'SUCCESS'
    const stateText = {
        PENDING: 'ИИ-анализ ожидает выполнения',
        PROCESSING: 'ИИ-анализ выполняется',
        FAILED: 'ИИ-анализ недоступен, задача доступна для обычной модерации.',
        SKIPPED: 'ИИ-анализ не применяется к этому типу задачи.',
    }[status]

    return (
        <section className={`ai-moderation-card ai-moderation-card--${String(status || '').toLowerCase()}`}>
            <div className="ai-moderation-card__header">
                <div>
                    <h4>ИИ-предмодерация</h4>
                    <p>Подсказка для проверки задачи</p>
                </div>
                <span className="ai-moderation-card__status">{getAiModerationStatusLabel(status)}</span>
            </div>

            {!isSuccess && <p className="ai-moderation-card__state">{stateText}</p>}

            {isSuccess && (
                <>
                    <div className="ai-moderation-card__summary">
                        <span className={`ai-moderation-card__verdict ${getAiModerationVerdictClass(analysis.verdict)}`}>
                            {getAiModerationVerdictLabel(analysis.verdict)}
                        </span>
                        <span className="ai-moderation-card__score">Риск: {analysis.riskScore ?? 0}/100</span>
                    </div>

                    {analysis.categories?.length > 0 && (
                        <div className="ai-moderation-card__chips">
                            {analysis.categories.map((category) => (
                                <span key={category}>{getAiModerationCategoryLabel(category)}</span>
                            ))}
                        </div>
                    )}

                    {analysis.reasons?.length > 0 && (
                        <div className="ai-moderation-card__section">
                            <h5>Причины</h5>
                            <ul>{analysis.reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul>
                        </div>
                    )}

                    {analysis.highlightedFields?.length > 0 && (
                        <div className="ai-moderation-card__section">
                            <h5>Замечания по полям</h5>
                            <ul>
                                {analysis.highlightedFields.map((item, index) => (
                                    <li key={`${item.field}-${index}`}><strong>{item.field}:</strong> {item.issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {analysis.moderatorHint && (
                        <div className="ai-moderation-card__hint">
                            <h5>Рекомендация</h5>
                            <p>{analysis.moderatorHint}</p>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}

export default AiModerationCard
