export function isEmployerVerified(entity) {
    return Boolean(entity?.employerVerified) || entity?.employerVerificationStatus === 'APPROVED'
}
