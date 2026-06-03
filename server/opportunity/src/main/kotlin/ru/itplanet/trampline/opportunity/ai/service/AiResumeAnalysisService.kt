package ru.itplanet.trampline.opportunity.ai.service

import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.interaction.InternalApplicantOpportunitySignalsResponse
import ru.itplanet.trampline.commons.model.profile.InternalApplicantRecommendationContextResponse
import ru.itplanet.trampline.opportunity.ai.client.YandexGptClient
import ru.itplanet.trampline.opportunity.ai.config.AiRecommendationExplanationProperties
import ru.itplanet.trampline.opportunity.ai.config.AiResumeAnalysisProperties
import ru.itplanet.trampline.opportunity.ai.config.YandexGptProperties
import ru.itplanet.trampline.opportunity.ai.model.AiResumeAnalysisParsedResult
import ru.itplanet.trampline.opportunity.ai.model.AiResumeAnalysisParsedTag
import ru.itplanet.trampline.opportunity.ai.model.ResumeAnalysisCandidateTag
import ru.itplanet.trampline.opportunity.client.InteractionServiceClient
import ru.itplanet.trampline.opportunity.client.MediaServiceClient
import ru.itplanet.trampline.opportunity.client.ProfileServiceClient
import ru.itplanet.trampline.opportunity.converter.OpportunityConverter
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.specification.OpportunitySpecification
import ru.itplanet.trampline.opportunity.exception.OpportunityValidationException
import ru.itplanet.trampline.opportunity.model.ResumeAnalysisInputSource
import ru.itplanet.trampline.opportunity.model.request.ResumeAnalysisRequest
import ru.itplanet.trampline.opportunity.model.response.ResumeAnalysisResponse
import ru.itplanet.trampline.opportunity.model.response.ResumeAnalysisSource
import ru.itplanet.trampline.opportunity.model.response.ResumeAnalysisTagSuggestion
import ru.itplanet.trampline.opportunity.service.OpportunityRecommendationScoreCalculator
import ru.itplanet.trampline.opportunity.service.TagService
import ru.itplanet.trampline.opportunity.service.qualifyPersonalizedRecommendations
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class AiResumeAnalysisService(
    private val properties: AiResumeAnalysisProperties,
    private val recommendationProperties: AiRecommendationExplanationProperties,
    private val yandexGptProperties: YandexGptProperties,
    private val yandexGptClient: YandexGptClient,
    private val promptFactory: AiResumeAnalysisPromptFactory,
    private val resultParser: AiResumeAnalysisResultParser,
    private val pdfResumeTextExtractor: PdfResumeTextExtractor,
    private val tagService: TagService,
    private val profileServiceClient: ProfileServiceClient,
    private val interactionServiceClient: InteractionServiceClient,
    private val mediaServiceClient: MediaServiceClient,
    private val opportunityDao: OpportunityDao,
    private val opportunityConverter: OpportunityConverter,
    private val scoreCalculator: OpportunityRecommendationScoreCalculator,
) {
    @Transactional(readOnly = true)
    fun analyze(userId: Long, request: ResumeAnalysisRequest): ResumeAnalysisResponse {
        val inputSource = request.source
        val normalizedResumeText = normalizeResumeText(resolveResumeText(userId, request))
        validateInputText(normalizedResumeText, inputSource)
        val redactedResumeText = redactCommonPii(normalizedResumeText)
        val applicant = profileServiceClient.getApplicantRecommendationContext(userId)
        val signals = loadSignals(userId)
        val techTags = tagService.getActiveTags(TagCategory.TECH)
        val directionTags = tagService.getActiveTags(TagCategory.DIRECTION)
        val activeTags = techTags + directionTags
        val candidateTags = activeTags
            .sortedWith(compareBy<Tag>({ it.category.name }, { it.name.lowercase() }))
            .take(properties.maxCandidateTags.coerceAtLeast(0))
            .map { ResumeAnalysisCandidateTag(it.id, it.name, it.category) }

        val baseResponse = if (properties.enabled && yandexGptProperties.isConfigured() && candidateTags.isNotEmpty()) {
            analyzeWithAi(
                userId = userId,
                redactedResumeText = redactedResumeText,
                candidateTags = candidateTags,
                applicant = applicant,
                techTags = techTags,
                directionTags = directionTags,
            ) ?: analyzeWithRules(
                resumeText = normalizedResumeText,
                techTags = techTags,
                directionTags = directionTags,
            )
        } else {
            analyzeWithRules(
                resumeText = normalizedResumeText,
                techTags = techTags,
                directionTags = directionTags,
            )
        }

        val previewContext = buildPreviewContext(
            applicant = applicant,
            suggestedSkills = baseResponse.suggestedSkillTags,
            suggestedInterests = baseResponse.suggestedInterestTags,
        )

        return baseResponse.copy(
            opportunityPreview = buildOpportunityPreview(previewContext, signals),
            inputSource = inputSource,
        )
    }

    private fun resolveResumeText(userId: Long, request: ResumeAnalysisRequest): String {
        return when (request.source) {
            ResumeAnalysisInputSource.TEXT -> request.resumeText
            ResumeAnalysisInputSource.FILE -> extractTextFromProfileResumeFile(userId)
        }
    }

    private fun validateInputText(text: String, inputSource: ResumeAnalysisInputSource) {
        if (text.isBlank()) {
            throw when (inputSource) {
                ResumeAnalysisInputSource.TEXT -> OpportunityValidationException("Добавьте текст резюме")
                ResumeAnalysisInputSource.FILE -> OpportunityValidationException("Не удалось извлечь текст из файла резюме")
            }
        }
        if (text.length < properties.minInputChars.coerceAtLeast(1)) {
            throw when (inputSource) {
                ResumeAnalysisInputSource.TEXT ->
                    OpportunityValidationException("Добавьте минимум ${properties.minInputChars} символов резюме")
                ResumeAnalysisInputSource.FILE ->
                    OpportunityValidationException("В файле резюме слишком мало текста для анализа")
            }
        }
    }

    private fun extractTextFromProfileResumeFile(userId: Long): String {
        val resumeAttachment = loadResumeAttachment(userId)
        val file = resumeAttachment.file

        if (file.ownerUserId != userId || file.kind != FileAssetKind.RESUME) {
            throw OpportunityValidationException("Файл резюме не найден")
        }
        if (file.status != FileAssetStatus.READY) {
            throw OpportunityValidationException("Файл резюме ещё обрабатывается")
        }
        if (file.sizeBytes > properties.maxFileBytes.coerceAtLeast(1L)) {
            throw OpportunityValidationException("Файл резюме слишком большой для анализа")
        }
        if (!isPdf(file.mediaType, file.originalFileName)) {
            throw OpportunityValidationException("Для анализа файла резюме нужен PDF")
        }

        val bytes = try {
            mediaServiceClient.getFileContent(file.fileId)
        } catch (exception: Exception) {
            logger.warn("Failed to download resume file for analysis: userId={}, error={}", userId, exception.javaClass.simpleName)
            throw OpportunityValidationException("Не удалось скачать файл резюме")
        }

        return try {
            pdfResumeTextExtractor.extractText(bytes)
        } catch (exception: Exception) {
            logger.warn("Failed to extract resume PDF text: userId={}, error={}", userId, exception.javaClass.simpleName)
            throw OpportunityValidationException("Не удалось извлечь текст из файла резюме")
        }
    }

    private fun loadResumeAttachment(userId: Long): InternalFileAttachmentResponse {
        val attachments = try {
            mediaServiceClient.getAttachments(FileAttachmentEntityType.APPLICANT_PROFILE, userId)
        } catch (exception: Exception) {
            logger.warn("Failed to load resume attachment for analysis: userId={}, error={}", userId, exception.javaClass.simpleName)
            throw OpportunityValidationException("Не удалось загрузить файл резюме")
        }

        return attachments
            .filter { it.attachmentRole == FileAttachmentRole.RESUME }
            .maxByOrNull { it.file.updatedAt ?: it.file.createdAt ?: OffsetDateTime.MIN }
            ?: throw OpportunityValidationException("Прикрепите файл резюме")
    }

    private fun analyzeWithAi(
        userId: Long,
        redactedResumeText: String,
        candidateTags: List<ResumeAnalysisCandidateTag>,
        applicant: InternalApplicantRecommendationContextResponse,
        techTags: List<Tag>,
        directionTags: List<Tag>,
    ): ResumeAnalysisResponse? {
        return try {
            val rawResult = yandexGptClient.complete(
                systemPrompt = promptFactory.systemPrompt(),
                userPrompt = promptFactory.userPrompt(
                    redactedResumeText = redactedResumeText,
                    candidateTags = candidateTags,
                    currentProfileSkills = applicant.skills,
                    currentProfileInterests = applicant.interests,
                ),
            )
            val parsed = resultParser.parse(rawResult)
            buildAiResponse(parsed, techTags, directionTags)
        } catch (exception: Exception) {
            logger.warn(
                "AI resume analysis failed: userId={}, error={}",
                userId,
                exception.javaClass.simpleName,
            )
            null
        }
    }

    private fun buildAiResponse(
        parsed: AiResumeAnalysisParsedResult,
        techTags: List<Tag>,
        directionTags: List<Tag>,
    ): ResumeAnalysisResponse {
        val skillSuggestions = mapParsedTags(parsed.suggestedSkillTags, techTags, TagCategory.TECH)
            .take(properties.maxSuggestedSkills.coerceAtLeast(0))
        val interestSuggestions = mapParsedTags(parsed.suggestedInterestTags, directionTags, TagCategory.DIRECTION)
            .take(properties.maxSuggestedInterests.coerceAtLeast(0))
        val detectedSkills = (parsed.detectedSkills + skillSuggestions.map { it.name })
            .map(String::trim)
            .filter(String::isNotBlank)
            .distinctBy { it.lowercase() }
            .take(properties.maxSuggestedSkills.coerceAtLeast(0))

        return ResumeAnalysisResponse(
            summary = parsed.summary,
            detectedSkills = detectedSkills,
            suggestedSkillTags = skillSuggestions,
            suggestedInterestTags = interestSuggestions,
            strengths = parsed.strengths.take(properties.maxStrengths.coerceAtLeast(0)),
            improvementTips = parsed.improvementTips.take(properties.maxImprovementTips.coerceAtLeast(0)),
            opportunityPreview = emptyList(),
            source = ResumeAnalysisSource.AI,
            inputSource = ResumeAnalysisInputSource.TEXT,
        )
    }

    private fun mapParsedTags(
        parsedTags: List<AiResumeAnalysisParsedTag>,
        activeTags: List<Tag>,
        category: TagCategory,
    ): List<ResumeAnalysisTagSuggestion> {
        val tagsByName = activeTags.associateBy { normalizeName(it.name) }

        return parsedTags.mapNotNull { suggestion ->
            val tag = tagsByName[normalizeName(suggestion.name)] ?: return@mapNotNull null
            ResumeAnalysisTagSuggestion(
                id = tag.id,
                name = tag.name,
                category = category,
                confidence = suggestion.confidence.coerceIn(0, 100),
            )
        }
            .distinctBy(ResumeAnalysisTagSuggestion::id)
            .sortedByDescending(ResumeAnalysisTagSuggestion::confidence)
    }

    private fun analyzeWithRules(
        resumeText: String,
        techTags: List<Tag>,
        directionTags: List<Tag>,
    ): ResumeAnalysisResponse {
        val suggestedSkills = techTags
            .filter { containsTagName(resumeText, it.name) }
            .take(properties.maxSuggestedSkills.coerceAtLeast(0))
            .map { tag ->
                ResumeAnalysisTagSuggestion(
                    id = tag.id,
                    name = tag.name,
                    category = TagCategory.TECH,
                    confidence = 72,
                )
            }
        val suggestedInterests = directionTags
            .filter { containsTagName(resumeText, it.name) }
            .take(properties.maxSuggestedInterests.coerceAtLeast(0))
            .map { tag ->
                ResumeAnalysisTagSuggestion(
                    id = tag.id,
                    name = tag.name,
                    category = TagCategory.DIRECTION,
                    confidence = 65,
                )
            }

        return ResumeAnalysisResponse(
            summary = if (suggestedSkills.isNotEmpty()) {
                "Нашли навыки, которые можно добавить в профиль."
            } else {
                "Не удалось уверенно определить навыки по тексту."
            },
            detectedSkills = suggestedSkills.map { it.name },
            suggestedSkillTags = suggestedSkills,
            suggestedInterestTags = suggestedInterests,
            strengths = if (suggestedSkills.isNotEmpty()) {
                listOf("В резюме есть технические навыки.")
            } else {
                emptyList()
            },
            improvementTips = listOf(
                "Добавьте стек технологий в отдельный блок.",
                "Укажите проекты и результаты работы.",
                "Опишите опыт конкретнее: задачи, инструменты, результат.",
            ).take(properties.maxImprovementTips.coerceAtLeast(0)),
            opportunityPreview = emptyList(),
            source = ResumeAnalysisSource.RULES,
            inputSource = ResumeAnalysisInputSource.TEXT,
        )
    }

    private fun buildPreviewContext(
        applicant: InternalApplicantRecommendationContextResponse,
        suggestedSkills: List<ResumeAnalysisTagSuggestion>,
        suggestedInterests: List<ResumeAnalysisTagSuggestion>,
    ): InternalApplicantRecommendationContextResponse {
        val mergedSkills = (applicant.skills + suggestedSkills.map { Tag(it.id, it.name, it.category) })
            .distinctBy(Tag::id)
        val mergedInterests = (applicant.interests + suggestedInterests.map { Tag(it.id, it.name, it.category) })
            .distinctBy(Tag::id)

        return applicant.copy(
            skills = mergedSkills,
            interests = mergedInterests,
        )
    }

    private fun buildOpportunityPreview(
        applicant: InternalApplicantRecommendationContextResponse,
        signals: InternalApplicantOpportunitySignalsResponse,
    ): List<ru.itplanet.trampline.opportunity.model.OpportunityListItem> {
        if (properties.maxOpportunityPreview <= 0) {
            return emptyList()
        }

        val now = OffsetDateTime.now(ZoneOffset.UTC)
        val candidates = opportunityDao.findAll(
            OpportunitySpecification.recommendationCandidates(now),
            PageRequest.of(
                0,
                recommendationProperties.maxCandidates.coerceAtLeast(properties.maxOpportunityPreview),
                Sort.by(Sort.Direction.DESC, "publishedAt"),
            ),
        ).content.filterNot { checkNotNull(it.id) in signals.respondedOpportunityIds }

        val scored = candidates.map { opportunity ->
            opportunity to scoreCalculator.calculate(opportunity, applicant, signals, now)
        }

        return qualifyPersonalizedRecommendations(scored, recommendationProperties.minScore)
            .take(properties.maxOpportunityPreview.coerceAtLeast(0))
            .map { (opportunity, _) -> opportunityConverter.toListItem(opportunity) }
    }

    private fun loadSignals(userId: Long): InternalApplicantOpportunitySignalsResponse {
        return try {
            interactionServiceClient.getApplicantOpportunitySignals(userId)
        } catch (exception: Exception) {
            logger.warn("Failed to load applicant opportunity signals for resume analysis: {}", exception.javaClass.simpleName)
            InternalApplicantOpportunitySignalsResponse(emptyList(), emptyList())
        }
    }

    private fun normalizeResumeText(text: String): String {
        return text.trim()
            .replace(WHITESPACE_REGEX, " ")
            .take(properties.maxInputChars.coerceAtLeast(0))
    }

    private fun redactCommonPii(text: String): String {
        return text
            .replace(EMAIL_REGEX, "[email]")
            .replace(URL_REGEX, "[url]")
            .replace(PHONE_REGEX, "[phone]")
    }

    private fun containsTagName(text: String, tagName: String): Boolean {
        val normalizedText = normalizeMatchText(text)
        val normalizedTagName = normalizeMatchText(tagName)
        if (normalizedTagName.length < 2) {
            return false
        }

        if (SPECIAL_TAG_CHARS_REGEX.containsMatchIn(normalizedTagName)) {
            return normalizedText.contains(normalizedTagName)
        }

        val escapedTag = Regex.escape(normalizedTagName)
        return Regex("(?<![\\p{L}\\p{N}])$escapedTag(?![\\p{L}\\p{N}])").containsMatchIn(normalizedText)
    }

    private fun normalizeName(value: String): String {
        return value.trim()
            .lowercase()
            .replace('ё', 'е')
            .replace(WHITESPACE_REGEX, " ")
    }

    private fun normalizeMatchText(value: String): String {
        return normalizeName(value)
            .replace(MATCH_SEPARATOR_REGEX, " ")
            .replace(WHITESPACE_REGEX, " ")
            .trim()
    }

    private fun isPdf(mediaType: String, originalFileName: String): Boolean {
        return mediaType.equals("application/pdf", ignoreCase = true) ||
            originalFileName.endsWith(".pdf", ignoreCase = true)
    }

    private companion object {
        val logger = LoggerFactory.getLogger(AiResumeAnalysisService::class.java)
        val WHITESPACE_REGEX = Regex("\\s+")
        val EMAIL_REGEX = Regex("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")
        val URL_REGEX = Regex("https?://\\S+|www\\.\\S+", RegexOption.IGNORE_CASE)
        val PHONE_REGEX = Regex("(?<!\\d)(?:\\+?\\d[\\d\\s().-]{7,}\\d)(?!\\d)")
        val MATCH_SEPARATOR_REGEX = Regex("[^\\p{L}\\p{N}#+.]+")
        val SPECIAL_TAG_CHARS_REGEX = Regex("[#+.]")
    }
}
