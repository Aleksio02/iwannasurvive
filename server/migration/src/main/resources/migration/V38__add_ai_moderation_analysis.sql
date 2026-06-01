CREATE TABLE ai_moderation_analysis (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES moderation_task(id),
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT NOT NULL,
    task_type VARCHAR(64) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model_uri VARCHAR(255) NOT NULL,
    model_version VARCHAR(128),
    endpoint VARCHAR(255) NOT NULL,
    prompt_version VARCHAR(64) NOT NULL,
    input_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    verdict VARCHAR(32),
    risk_score INT,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    highlighted_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    moderator_hint TEXT,
    raw_response JSONB,
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_ai_moderation_analysis_task
    ON ai_moderation_analysis(task_id);

CREATE INDEX ix_ai_moderation_analysis_status_created_at
    ON ai_moderation_analysis(status, created_at);

CREATE INDEX ix_ai_moderation_analysis_entity
    ON ai_moderation_analysis(entity_type, entity_id);
