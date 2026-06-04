import './VerifiedCompanyBadge.scss'

export default function VerifiedCompanyBadge({ compact = false, className = '' }) {
    return (
        <span
            className={[
                'verified-company-badge',
                compact ? 'verified-company-badge--compact' : '',
                className,
            ].filter(Boolean).join(' ')}
            title="Компания прошла проверку на платформе"
        >
            <span aria-hidden="true">✓</span>
            <span>Проверенная компания</span>
        </span>
    )
}
