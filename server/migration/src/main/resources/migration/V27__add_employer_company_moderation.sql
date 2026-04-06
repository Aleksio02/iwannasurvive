ALTER TABLE employer_profile
    ADD COLUMN IF NOT EXISTS company_moderation_status VARCHAR(32);

ALTER TABLE employer_profile
    ADD COLUMN IF NOT EXISTS approved_company_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE employer_profile
SET company_moderation_status = CASE
                WHEN verification_status = 'APPROVED'
                    AND (legal_name IS NOT NULL OR inn IS NOT NULL)
                    THEN 'APPROVED'
                ELSE 'DRAFT'
    END
WHERE company_moderation_status IS NULL;

UPDATE employer_profile
SET approved_company_snapshot = jsonb_strip_nulls(
        jsonb_build_object(
                'legalName', legal_name,
                'inn', inn
        )
)
WHERE verification_status = 'APPROVED'
  AND (legal_name IS NOT NULL OR inn IS NOT NULL)
  AND approved_company_snapshot = '{}'::jsonb;

ALTER TABLE employer_profile
    ALTER COLUMN company_moderation_status SET NOT NULL;

ALTER TABLE employer_profile
DROP CONSTRAINT IF EXISTS chk_employer_profile_company_moderation_status;

ALTER TABLE employer_profile
    ADD CONSTRAINT chk_employer_profile_company_moderation_status
        CHECK (company_moderation_status IN ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'NEEDS_REVISION'));

CREATE INDEX IF NOT EXISTS idx_employer_profile_company_moderation_status
    ON employer_profile (company_moderation_status);

ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_type;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_type
        CHECK (task_type IN (
                         'PROFILE_REVIEW',
                         'COMPANY_REVIEW',
                         'VERIFICATION_REVIEW',
                         'OPPORTUNITY_REVIEW',
                         'TAG_REVIEW',
                         'CONTENT_REVIEW'
        ));
