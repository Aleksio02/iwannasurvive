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
