ALTER TABLE file_asset
    DROP CONSTRAINT IF EXISTS chk_file_asset_kind;

ALTER TABLE file_asset
    ADD CONSTRAINT chk_file_asset_kind
        CHECK (kind IN (
            'AVATAR',
            'RESUME',
            'PORTFOLIO',
            'LOGO',
            'OPPORTUNITY_MEDIA',
            'VERIFICATION_ATTACHMENT',
            'APPLICATION_ATTACHMENT',
            'MODERATION_ATTACHMENT',
            'CHAT_ATTACHMENT',
            'OTHER'
        ));

ALTER TABLE file_attachment
    DROP CONSTRAINT IF EXISTS chk_file_attachment_entity_type;

ALTER TABLE file_attachment
    ADD CONSTRAINT chk_file_attachment_entity_type
        CHECK (entity_type IN (
            'APPLICANT_PROFILE',
            'EMPLOYER_PROFILE',
            'EMPLOYER_VERIFICATION',
            'OPPORTUNITY',
            'OPPORTUNITY_RESPONSE',
            'MODERATION_TASK',
            'CHAT_MESSAGE'
        ));

ALTER TABLE chat_message
    DROP CONSTRAINT IF EXISTS chk_chat_message_type,
    DROP CONSTRAINT IF EXISTS chk_chat_message_body_not_blank,
    ALTER COLUMN body DROP NOT NULL;

ALTER TABLE chat_message
    ADD CONSTRAINT chk_chat_message_type
        CHECK (message_type IN ('TEXT', 'ATTACHMENT', 'MIXED')),
    ADD CONSTRAINT chk_chat_message_body
        CHECK (
            (
                message_type = 'TEXT'
                AND body IS NOT NULL
                AND char_length(btrim(body)) BETWEEN 1 AND 4000
            )
            OR (
                message_type = 'ATTACHMENT'
                AND (body IS NULL OR char_length(btrim(body)) BETWEEN 1 AND 4000)
            )
            OR (
                message_type = 'MIXED'
                AND body IS NOT NULL
                AND char_length(btrim(body)) BETWEEN 1 AND 4000
            )
        );

CREATE TABLE chat_message_attachment (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    attachment_kind VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_chat_message_attachment_file UNIQUE (message_id, file_id),
    CONSTRAINT chk_chat_message_attachment_size CHECK (size_bytes > 0),
    CONSTRAINT chk_chat_message_attachment_kind CHECK (attachment_kind IN ('IMAGE', 'FILE'))
);

CREATE INDEX idx_chat_message_attachment_message
    ON chat_message_attachment (message_id);
