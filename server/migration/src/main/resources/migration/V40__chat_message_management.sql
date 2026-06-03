ALTER TABLE chat_message
    ADD COLUMN IF NOT EXISTS reply_to_message_id BIGINT REFERENCES chat_message(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_from_message_id BIGINT REFERENCES chat_message(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_from_sender_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS chat_message_user_state (
    message_id BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hidden_at TIMESTAMPTZ,
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_user_state_user_hidden
    ON chat_message_user_state (user_id, hidden_at);

CREATE TABLE IF NOT EXISTS chat_message_reaction (
    message_id BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id),
    CONSTRAINT chk_chat_message_reaction_allowed
        CHECK (reaction IN ('👍', '❤️', '😂', '😮', '😢', '🙏'))
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reaction_message
    ON chat_message_reaction (message_id);

CREATE TABLE IF NOT EXISTS chat_pinned_message (
    dialog_id BIGINT PRIMARY KEY REFERENCES chat_dialog(id) ON DELETE CASCADE,
    message_id BIGINT NOT NULL REFERENCES chat_message(id) ON DELETE CASCADE,
    pinned_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reply_to
    ON chat_message (reply_to_message_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_forwarded_from
    ON chat_message (forwarded_from_message_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_body_search
    ON chat_message (dialog_id, id DESC)
    WHERE body IS NOT NULL AND deleted_at IS NULL;
