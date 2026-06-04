import Label from '@/shared/ui/Label'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

function ApplicantPreviewModal({
                                   isOpen,
                                   selectedApplicant,
                                   onClose,
                               }) {
    if (!isOpen || !selectedApplicant) return null

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
        <Modal
            isOpen={isOpen}
            title="Профиль кандидата"
            onClose={onClose}
            footer={<Button className="button--ghost" onClick={onClose}>Закрыть</Button>}
        >
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
        </Modal>
    )
}

export default ApplicantPreviewModal
