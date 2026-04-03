package ru.itplanet.trampline.interaction.chat.dao

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.interaction.chat.dao.dto.ChatDialogStatus
import ru.itplanet.trampline.interaction.chat.model.ChatDialog
import ru.itplanet.trampline.interaction.chat.model.ChatDialogCursor
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListItem
import ru.itplanet.trampline.interaction.chat.model.ChatDialogListQuery
import ru.itplanet.trampline.interaction.chat.model.ChatDialogPage
import ru.itplanet.trampline.interaction.chat.model.ChatParticipantSummary
import ru.itplanet.trampline.interaction.chat.service.ChatPolicy
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseStatus
import java.sql.ResultSet
import java.time.OffsetDateTime

@Repository
class ChatDialogQueryDaoImpl(
    private val jdbcTemplate: NamedParameterJdbcTemplate,
) : ChatDialogQueryDao {

    override fun findDialog(
        dialogId: Long,
        currentUserId: Long,
    ): ChatDialog? {
        val params = baseParams(currentUserId)
            .addValue("dialogId", dialogId)

        val sql = """
            $selectFields
            $baseFrom
            WHERE d.id = :dialogId
        """.trimIndent()

        return jdbcTemplate.query(sql, params) { rs, _ -> mapDialog(rs) }
            .firstOrNull()
    }

    override fun findDialogs(
        currentUserId: Long,
        query: ChatDialogListQuery,
    ): ChatDialogPage {
        val params = baseParams(currentUserId)
            .addValue("limit", query.limit + 1)

        val whereClause = buildListWhereClause(query, params)

        val sql = """
            $selectFields
            $baseFrom
            $whereClause
            ORDER BY COALESCE(d.last_message_at, d.created_at) DESC, d.id DESC
            LIMIT :limit
        """.trimIndent()

        val rows = jdbcTemplate.query(sql, params) { rs, _ -> mapListRow(rs) }

        val hasNext = rows.size > query.limit
        val items = if (hasNext) rows.take(query.limit) else rows

        val nextCursor = if (hasNext) {
            items.lastOrNull()?.let { ChatDialogCursor(it.sortAt, it.item.dialogId) }
        } else {
            null
        }

        return ChatDialogPage(
            items = items.map { it.item },
            nextCursor = nextCursor,
        )
    }

    private fun buildListWhereClause(
        query: ChatDialogListQuery,
        params: MapSqlParameterSource,
    ): String {
        val conditions = mutableListOf<String>()

        conditions += if (query.archived) {
            "ps.archived_at IS NOT NULL"
        } else {
            "ps.archived_at IS NULL"
        }

        query.opportunityId?.let { opportunityId ->
            conditions += "d.opportunity_id = :opportunityId"
            params.addValue("opportunityId", opportunityId)
        }

        if (query.unreadOnly) {
            conditions += """
                EXISTS (
                    SELECT 1
                    FROM chat_message unread_message
                    WHERE unread_message.dialog_id = d.id
                      AND unread_message.sender_user_id <> :currentUserId
                      AND unread_message.id > COALESCE(ps.last_read_message_id, 0)
                )
            """.trimIndent()
        }

        query.cursor?.let { cursor ->
            params.addValue("cursorSortAt", cursor.sortAt)
            params.addValue("cursorDialogId", cursor.dialogId)

            conditions += """
                (
                    COALESCE(d.last_message_at, d.created_at) < :cursorSortAt
                    OR (
                        COALESCE(d.last_message_at, d.created_at) = :cursorSortAt
                        AND d.id < :cursorDialogId
                    )
                )
            """.trimIndent()
        }

        return if (conditions.isEmpty()) {
            ""
        } else {
            "WHERE ${conditions.joinToString("\n  AND ")}"
        }
    }

    private fun mapDialog(
        rs: ResultSet,
    ): ChatDialog {
        return ChatDialog(
            dialogId = rs.getLong("dialog_id"),
            opportunityResponseId = rs.getLong("opportunity_response_id"),
            opportunityId = rs.getLong("opportunity_id"),
            opportunityTitle = rs.getString("opportunity_title_snapshot"),
            companyName = rs.getString("company_name_snapshot"),
            counterpart = mapCounterpart(rs),
            status = ChatDialogStatus.valueOf(rs.getString("dialog_status")),
            responseStatus = OpportunityResponseStatus.valueOf(rs.getString("response_status")),
            lastMessagePreview = rs.getString("last_message_preview"),
            lastMessageAt = readOffsetDateTime(rs, "last_message_at"),
            unreadCount = rs.getLong("unread_count"),
            canSend = rs.getBoolean("can_send"),
            archived = readOffsetDateTime(rs, "archived_at") != null,
            createdAt = readOffsetDateTime(rs, "created_at"),
            updatedAt = readOffsetDateTime(rs, "updated_at"),
        )
    }

    private fun mapListRow(
        rs: ResultSet,
    ): ChatDialogListRow {
        val item = ChatDialogListItem(
            dialogId = rs.getLong("dialog_id"),
            opportunityResponseId = rs.getLong("opportunity_response_id"),
            opportunityId = rs.getLong("opportunity_id"),
            opportunityTitle = rs.getString("opportunity_title_snapshot"),
            companyName = rs.getString("company_name_snapshot"),
            counterpart = mapCounterpart(rs),
            lastMessagePreview = rs.getString("last_message_preview"),
            lastMessageAt = readOffsetDateTime(rs, "last_message_at"),
            unreadCount = rs.getLong("unread_count"),
            canSend = rs.getBoolean("can_send"),
            responseStatus = OpportunityResponseStatus.valueOf(rs.getString("response_status")),
            archived = readOffsetDateTime(rs, "archived_at") != null,
        )

        val sortAt = readOffsetDateTime(rs, "sort_at")
            ?: throw IllegalStateException("sort_at must not be null")

        return ChatDialogListRow(
            item = item,
            sortAt = sortAt,
        )
    }

    private fun mapCounterpart(
        rs: ResultSet,
    ): ChatParticipantSummary {
        return ChatParticipantSummary(
            userId = rs.getLong("counterpart_user_id"),
            role = Role.valueOf(rs.getString("counterpart_role")),
            displayName = rs.getString("counterpart_display_name"),
        )
    }

    private fun readOffsetDateTime(
        rs: ResultSet,
        column: String,
    ): OffsetDateTime? {
        return rs.getObject(column, OffsetDateTime::class.java)
    }

    private fun baseParams(
        currentUserId: Long,
    ): MapSqlParameterSource {
        return MapSqlParameterSource()
            .addValue("currentUserId", currentUserId)
            .addValue(
                "writableResponseStatuses",
                ChatPolicy.WRITABLE_RESPONSE_STATUSES.map { it.name },
            )
    }

    private data class ChatDialogListRow(
        val item: ChatDialogListItem,
        val sortAt: OffsetDateTime,
    )

    companion object {
        private val selectFields = """
            SELECT
                d.id AS dialog_id,
                d.opportunity_response_id,
                d.opportunity_id,
                d.status AS dialog_status,
                d.opportunity_title_snapshot,
                d.company_name_snapshot,
                d.applicant_name_snapshot,
                d.applicant_user_id,
                d.employer_user_id,
                d.last_message_preview,
                d.last_message_at,
                d.created_at,
                d.updated_at,
                ps.archived_at,
                r.status AS response_status,
                COALESCE(d.last_message_at, d.created_at) AS sort_at,
                CASE
                    WHEN :currentUserId = d.applicant_user_id THEN d.company_name_snapshot
                    ELSE d.applicant_name_snapshot
                END AS counterpart_display_name,
                CASE
                    WHEN :currentUserId = d.applicant_user_id THEN d.employer_user_id
                    ELSE d.applicant_user_id
                END AS counterpart_user_id,
                CASE
                    WHEN :currentUserId = d.applicant_user_id THEN 'EMPLOYER'
                    ELSE 'APPLICANT'
                END AS counterpart_role,
                COALESCE((
                    SELECT COUNT(*)
                    FROM chat_message unread_message
                    WHERE unread_message.dialog_id = d.id
                      AND unread_message.sender_user_id <> :currentUserId
                      AND unread_message.id > COALESCE(ps.last_read_message_id, 0)
                ), 0) AS unread_count,
                CASE
                    WHEN d.status = 'OPEN' AND r.status IN (:writableResponseStatuses) THEN TRUE
                    ELSE FALSE
                END AS can_send
        """.trimIndent()

        private val baseFrom = """
            FROM chat_dialog d
            JOIN opportunity_response r ON r.id = d.opportunity_response_id
            JOIN chat_participant_state ps ON ps.dialog_id = d.id
                AND ps.user_id = :currentUserId
        """.trimIndent()
    }
}
