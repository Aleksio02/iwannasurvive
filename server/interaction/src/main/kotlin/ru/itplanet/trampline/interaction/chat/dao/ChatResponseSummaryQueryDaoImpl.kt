package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import ru.itplanet.trampline.interaction.chat.model.ChatResponseSummary
import ru.itplanet.trampline.interaction.chat.service.ChatPolicy
import java.time.OffsetDateTime

@Repository
class ChatResponseSummaryQueryDaoImpl(
    private val jdbcTemplate: NamedParameterJdbcTemplate,
) : ChatResponseSummaryQueryDao {

    override fun findByOpportunityResponseIds(
        currentUserId: Long,
        opportunityResponseIds: Collection<Long>,
    ): Map<Long, ChatResponseSummary> {
        if (opportunityResponseIds.isEmpty()) {
            return emptyMap()
        }

        val params = MapSqlParameterSource()
            .addValue("currentUserId", currentUserId)
            .addValue("opportunityResponseIds", opportunityResponseIds.toList())
            .addValue(
                "writableResponseStatuses",
                ChatPolicy.WRITABLE_RESPONSE_STATUSES.map { it.name },
            )

        val sql = """
            SELECT
                d.opportunity_response_id,
                d.id AS dialog_id,
                d.last_message_at,
                CASE
                    WHEN ps.dialog_id IS NULL THEN 0
                    ELSE COALESCE((
                        SELECT COUNT(*)
                        FROM chat_message unread_message
                        WHERE unread_message.dialog_id = d.id
                          AND unread_message.sender_user_id <> :currentUserId
                          AND unread_message.id > COALESCE(ps.last_read_message_id, 0)
                    ), 0)
                END AS unread_count,
                CASE
                    WHEN d.status = 'OPEN' AND r.status IN (:writableResponseStatuses) THEN TRUE
                    ELSE FALSE
                END AS can_send
            FROM chat_dialog d
            JOIN opportunity_response r ON r.id = d.opportunity_response_id
            LEFT JOIN chat_participant_state ps ON ps.dialog_id = d.id
                AND ps.user_id = :currentUserId
            WHERE d.opportunity_response_id IN (:opportunityResponseIds)
              AND (
                    d.applicant_user_id = :currentUserId
                    OR d.employer_user_id = :currentUserId
              )
        """.trimIndent()

        return jdbcTemplate.query(sql, params) { rs, _ ->
            ChatResponseSummary(
                opportunityResponseId = rs.getLong("opportunity_response_id"),
                dialogId = rs.getLong("dialog_id"),
                unreadCount = rs.getLong("unread_count"),
                canSend = rs.getBoolean("can_send"),
                lastMessageAt = rs.getObject("last_message_at", OffsetDateTime::class.java),
            )
        }.associateBy { it.opportunityResponseId }
    }
}
