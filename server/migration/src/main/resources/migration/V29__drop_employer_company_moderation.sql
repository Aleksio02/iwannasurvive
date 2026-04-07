UPDATE employer_profile
SET verification_status = 'APPROVED'
WHERE company_moderation_status = 'APPROVED'
  AND verification_status <> 'APPROVED';

UPDATE employer_profile
SET verification_status = 'REJECTED'
WHERE company_moderation_status = 'NEEDS_REVISION'
  AND verification_status = 'PENDING';

DELETE FROM moderation_log
WHERE task_id IN (
    SELECT id
    FROM moderation_task
    WHERE task_type = 'COMPANY_REVIEW'
);

DELETE FROM moderation_task
WHERE task_type = 'COMPANY_REVIEW';

DROP INDEX IF EXISTS idx_employer_profile_company_moderation_status;

ALTER TABLE employer_profile
DROP CONSTRAINT IF EXISTS chk_employer_profile_company_moderation_status;

ALTER TABLE employer_profile
DROP COLUMN IF EXISTS approved_company_snapshot;

ALTER TABLE employer_profile
DROP COLUMN IF EXISTS company_moderation_status;

ALTER TABLE moderation_task
DROP CONSTRAINT IF EXISTS chk_moderation_task_type;

ALTER TABLE moderation_task
    ADD CONSTRAINT chk_moderation_task_type
        CHECK (task_type IN (
                         'PROFILE_REVIEW',
                         'VERIFICATION_REVIEW',
                         'OPPORTUNITY_REVIEW',
                         'TAG_REVIEW',
                         'CONTENT_REVIEW'
        ));
