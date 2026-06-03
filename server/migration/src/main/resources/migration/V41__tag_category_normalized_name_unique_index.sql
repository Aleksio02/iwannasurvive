-- If this migration fails, inspect existing duplicates manually:
-- SELECT category, normalized_name, COUNT(*)
-- FROM tag
-- GROUP BY category, normalized_name
-- HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tag_category_normalized_name
    ON tag (category, normalized_name);
