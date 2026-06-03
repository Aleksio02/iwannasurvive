import { useRef, useEffect } from 'react'
import Label from '@/shared/ui/Label'

function ApplicantPreviewModal({
                                   isOpen,
                                   selectedApplicant,
                                   onClose,
                               }) {
    const overlayMouseDownStartedOutsideRef = useRef(false)

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen || !selectedApplicant) return null

    const handleOverlayMouseDown = (event) => {
        overlayMouseDownStartedOutsideRef.current = event.target === event.currentTarget
    }

    const handleOverlayMouseUp = (event) => {
        const endedOutside = event.target === event.currentTarget
        if (overlayMouseDownStartedOutsideRef.current && endedOutside) {
            onClose()
        }
        overlayMouseDownStartedOutsideRef.current = false
    }

    const getSkills = () => {
        if (Array.isArray(selectedApplicant.skills)) {
            if (selectedApplicant.skills.length > 0 && typeof selectedApplicant.skills[0] === 'object') {
                return selectedApplicant.skills.map(s => s.name || s).join(', ')
            }
            return selectedApplicant.skills.join(', ')
        }
        return '—'
    }

    const getFullName = () => {
        if (selectedApplicant.fullName) return selectedApplicant.fullName
        if (selectedApplicant.displayName) return selectedApplicant.displayName
        const firstName = selectedApplicant.firstName || ''
        const lastName = selectedApplicant.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim()
        return fullName || '—'
    }

    return (
        <div
            className="modal-overlay"
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
        >
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal__header">
                    <h3>Профиль кандидата</h3>
                    <button
                        className="modal__close-btn"
                        onClick={onClose}
                        aria-label="Закрыть"
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <div className="employer-profile__grid">
                    <div className="employer-profile__field">
                        <Label>Имя</Label>
                        <div className="field-value">{getFullName()}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Вуз</Label>
                        <div className="field-value">{selectedApplicant.universityName || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Курс</Label>
                        <div className="field-value">{selectedApplicant.course || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Год выпуска</Label>
                        <div className="field-value">{selectedApplicant.graduationYear || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Открыт к работе</Label>
                        <div className="field-value">{selectedApplicant.openToWork ? 'Да' : 'Нет'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Открыт к мероприятиям</Label>
                        <div className="field-value">{selectedApplicant.openToEvents ? 'Да' : 'Нет'}</div>
                    </div>
                    <div className="employer-profile__field employer-profile__field--wide">
                        <Label>Навыки</Label>
                        <div className="field-value">{getSkills()}</div>
                    </div>
                    {selectedApplicant.about && (
                        <div className="employer-profile__field employer-profile__field--wide">
                            <Label>О себе</Label>
                            <div className="field-value field-value--multiline">{selectedApplicant.about}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ApplicantPreviewModal