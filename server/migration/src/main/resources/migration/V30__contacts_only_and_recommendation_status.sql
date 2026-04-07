ALTER TABLE applicant_profile
DROP CONSTRAINT IF EXISTS chk_applicant_resume_visibility;

ALTER TABLE applicant_profile
    ADD CONSTRAINT chk_applicant_resume_visibility
        CHECK (resume_visibility IN ('PRIVATE', 'CONTACTS_ONLY', 'AUTHENTICATED', 'PUBLIC'));

ALTER TABLE applicant_profile
DROP CONSTRAINT IF EXISTS chk_applicant_applications_visibility;

ALTER TABLE applicant_profile
    ADD CONSTRAINT chk_applicant_applications_visibility
        CHECK (applications_visibility IN ('PRIVATE', 'CONTACTS_ONLY', 'AUTHENTICATED', 'PUBLIC'));

ALTER TABLE applicant_profile
DROP CONSTRAINT IF EXISTS chk_applicant_contacts_visibility;

ALTER TABLE applicant_profile
    ADD CONSTRAINT chk_applicant_contacts_visibility
        CHECK (contacts_visibility IN ('PRIVATE', 'CONTACTS_ONLY', 'AUTHENTICATED', 'PUBLIC'));

ALTER TABLE contact_recommendation
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'NEW',
    ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE contact_recommendation
DROP CONSTRAINT IF EXISTS chk_contact_recommendation_status;

ALTER TABLE contact_recommendation
    ADD CONSTRAINT chk_contact_recommendation_status
        CHECK (status IN ('NEW', 'VIEWED', 'INTERESTED', 'APPLIED', 'DECLINED'));

ALTER TABLE contact_recommendation
DROP CONSTRAINT IF EXISTS chk_contact_recommendation_timestamps;

ALTER TABLE contact_recommendation
    ADD CONSTRAINT chk_contact_recommendation_timestamps
        CHECK (
            (status = 'NEW' AND viewed_at IS NULL AND responded_at IS NULL)
                OR
            (status = 'VIEWED' AND viewed_at IS NOT NULL AND responded_at IS NULL)
                OR
            (status IN ('INTERESTED', 'APPLIED', 'DECLINED') AND viewed_at IS NOT NULL AND responded_at IS NOT NULL)
            );

CREATE INDEX IF NOT EXISTS idx_contact_recommendation_to_user_status_created_at
    ON contact_recommendation (to_applicant_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_recommendation_opportunity_to_user
    ON contact_recommendation (opportunity_id, to_applicant_user_id);
