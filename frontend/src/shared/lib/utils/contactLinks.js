export function isTelegramLabel(label = '') {
    const normalized = String(label || '').trim().toLowerCase()
    return (
        normalized.includes('telegram') ||
        normalized === 'tg' ||
        normalized.includes('телеграм')
    )
}

export function normalizeTelegramUrl(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''

    if (/^https?:\/\/t\.me\//i.test(raw)) return raw
    if (/^t\.me\//i.test(raw)) return `https://${raw}`
    if (raw.startsWith('@')) return `https://t.me/${raw.slice(1)}`
    if (/^[a-zA-Z0-9_]{5,32}$/.test(raw)) return `https://t.me/${raw}`

    return raw
}

export function getTelegramUsername(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''

    return raw
        .replace(/^https?:\/\/t\.me\//i, '')
        .replace(/^t\.me\//i, '')
        .replace(/^@/, '')
        .split(/[/?#]/)[0]
}

export function normalizeSocialLinkUrl(value, label = '') {
    const raw = String(value || '').trim()
    if (!raw) return ''
    return isTelegramLabel(label) ? normalizeTelegramUrl(raw) : raw
}

export function isTelegramValue(value = '') {
    const normalized = String(value || '').trim().toLowerCase()
    return (
        normalized.startsWith('@') ||
        normalized.startsWith('https://t.me/') ||
        normalized.startsWith('http://t.me/') ||
        normalized.startsWith('t.me/')
    )
}

export function detectContactMethodType(value = '', label = '') {
    const normalizedValue = String(value || '').trim().toLowerCase()
    const normalizedLabel = String(label || '').trim().toLowerCase()

    if (isTelegramLabel(normalizedLabel) || isTelegramValue(normalizedValue)) {
        return 'TELEGRAM'
    }

    if (
        normalizedLabel.includes('email') ||
        normalizedLabel.includes('mail') ||
        normalizedLabel.includes('почт') ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)
    ) {
        return 'EMAIL'
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
        normalizedLabel.includes('звон') ||
        normalizedValue.startsWith('+') ||
        /^\d[\d\s\-()]+$/.test(normalizedValue)
    ) {
        return 'PHONE'
    }

    return 'OTHER'
}

export function isEmployerPublicContactType(type = '') {
    return ['EMAIL', 'PHONE', 'TELEGRAM', 'WHATSAPP'].includes(type)
}
