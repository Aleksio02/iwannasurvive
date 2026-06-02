export const COMPANY_SIZE_LABELS = {
    STARTUP: 'Стартап (1–10)',
    SMALL: 'Малый бизнес (11–50)',
    MEDIUM: 'Средний (51–200)',
    LARGE: 'Крупный (201–1000)',
    ENTERPRISE: 'Корпорация (1000+)',
}

export function getCompanySizeLabel(companySize) {
    if (!companySize) return '—'
    const normalized = String(companySize).trim().toUpperCase()
    return COMPANY_SIZE_LABELS[normalized] || companySize
}
