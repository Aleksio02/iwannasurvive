ALTER TABLE employer_profile
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(32);

ALTER TABLE employer_profile
    ADD COLUMN IF NOT EXISTS approved_public_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE employer_profile
SET moderation_status = CASE
                WHEN verification_status = 'APPROVED' THEN 'APPROVED'
                ELSE 'DRAFT'
    END
WHERE moderation_status IS NULL;

ALTER TABLE employer_profile
    ALTER COLUMN moderation_status SET NOT NULL;

ALTER TABLE employer_profile
DROP CONSTRAINT IF EXISTS chk_employer_profile_moderation_status;

ALTER TABLE employer_profile
    ADD CONSTRAINT chk_employer_profile_moderation_status
        CHECK (moderation_status IN ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'NEEDS_REVISION'));
