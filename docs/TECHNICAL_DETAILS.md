# Tramplin: Технические детали реализации

> Документ для технической защиты проекта. Содержит углублённую информацию об архитектуре, паттернах проектирования, безопасности, производительности и ключевых технических решениях.

---

## Оглавление

1. [Архитектурные принципы](#1-архитектурные-принципы)
2. [Безопасность и аутентификация](#2-безопасность-и-аутентификация)
3. [База данных и оптимизация](#3-база-данных-и-оптимизация)
4. [API Design и контрактное взаимодействие](#4-api-design-и-контрактное-взаимодействие)
5. [WebSocket и реальное время](#5-websocket-и-реальное-время)
6. [AI-интеграции](#6-ai-интеграции)
7. [Файловое хранилище](#7-файловое-хранилище)
8. [Обработка ошибок и валидация](#8-обработка-ошибок-и-валидация)
9. [Производительность и кэширование](#9-производительность-и-кэширование)
10. [Миграции и эволюция схемы](#10-миграции-и-эволюция-схемы)
11. [Тестирование](#11-тестирование)
12. [Развёртывание и окружения](#12-развёртывание-и-окружения)
13. [Ключевые технические решения](#13-ключевые-технические-решения)
14. [Возможные улучшения](#14-возможные-улучшения)

---

## 1. Архитектурные принципы

### 1.1. Multi-module монолит с чёткими границами

Проект использует **модульную монолитную архитектуру** на базе Spring Boot с разделением по бизнес-доменам:

```
server/
├── commons/          # Общие модели, enums, исключения, DTO
├── auth/             # Аутентификация, авторизация, сессии
├── profile/          # Профили пользователей, верификация
├── opportunity/      # Вакансии, стажировки, теги, AI
├── moderation/       # Модерация контента
├── interaction/      # Отклики, чаты, контакты, избранное
├── geo/              # Гео-поиск, DaData интеграция
├── media/            # Файловое хранилище (S3)
└── notification/     # Email-уведомления
```

**Преимущества такого подхода:**
- Чёткое разделение ответственности (Separation of Concerns)
- Возможность независимого развёртывания модулей в будущем (эволюция в микросервисы)
- Изоляция зависимостей (каждый модуль имеет свой `pom.xml`)
- Упрощённое тестирование отдельных доменов

### 1.2. Слоистая архитектура внутри модулей

Каждый модуль следует классической слоистой архитектуре:

```
controller/     # HTTP/WebSocket endpoints, маппинг запросов
├── service/    # Бизнес-логика, транзакции, валидация
├── dao/        # Доступ к данным (JPA, native queries)
├── model/      # JPA entities, DTO, request/response модели
├── config/     # Конфигурация безопасности, Feign clients
├── security/   # Filters, Authentication, Authorization
└── exception/  # Обработчики ошибок
```

**Пример потока запроса:**
```
HTTP Request → Controller → Service → DAO → Database
                ↓              ↓
           Validation    Transaction
                ↓
           Response DTO ← Entity
```

### 1.3. Dependency Injection через конструктор

Все зависимости внедряются через конструктор (constructor injection):

```kotlin
@RestController
class ProfileController(
    private val profileService: ProfileService,
    private val applicantProfileWorkspaceQueryService: ApplicantProfileWorkspaceQueryService,
    private val employerProfileWorkspaceQueryService: EmployerProfileWorkspaceQueryService,
) {
    // ...
}
```

**Преимущества:**
- Явные зависимости
- Упрощённое тестирование (легко замокать)
- Immutable поля (val вместо var)
- Раннее выявление циклических зависимостей

### 1.4. Разделение Command и Query (CQRS-подобный подход)

В некоторых модулях реализовано разделение операций записи и чтения:

```kotlin
// Command Service - изменение состояния
interface ModerationCommandService {
    fun approve(taskId: Long, currentUser: AuthenticatedUser, request: ApproveModerationTaskRequest)
    fun reject(taskId: Long, currentUser: AuthenticatedUser, request: RejectModerationTaskRequest)
}

// Query Service - чтение данных
interface ModerationQueryService {
    fun getDashboard(currentUser: AuthenticatedUser): ModerationDashboardResponse
    fun getTasks(currentUser: AuthenticatedUser, request: GetModerationTasksRequest): ModerationTaskPageResponse
}
```

**Обоснование:**
- Разные модели для чтения и записи (оптимизация под сценарий)
- Возможность масштабировать чтение и запись независимо
- Упрощение бизнес-логики (команды не возвращают данные, только результат)

---

## 2. Безопасность и аутентификация

### 2.1. Stateless сессии с Redis

**Архитектура хранения сессий:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Auth      │────▶│    Redis    │
│  (Cookie)   │     │   Service   │     │  (Session)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Структура сессии в Redis:**
```
Key: session:{sessionId}
Value: {
    "userId": 123,
    "email": "user@example.com",
    "role": "APPLICANT",
    "createdAt": "2026-06-05T10:00:00Z",
    "expiresAt": "2026-06-12T10:00:00Z"
}
```

**Реализация (SessionAuthenticationFilter.kt):**
```kotlin
class SessionAuthenticationFilter(
    private val authServiceClient: AuthServiceClient
) : OncePerRequestFilter() {
    
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val sessionId = extractSessionId(request)
        val tokenPayload = authServiceClient.validateSession(sessionId)
        
        if (!tokenPayload.isExpired()) {
            val authentication = SessionAuthentication(tokenPayload)
            SecurityContextHolder.getContext().authentication = authentication
        }
        
        filterChain.doFilter(request, response)
    }
}
```

### 2.2. Двухфакторная аутентификация (2FA)

**Flow включения 2FA:**

```
1. POST /api/auth/2fa/enable/request
   └─> Требует пароль
   └─> Генерирует секретный ключ
   └─> Отправляет код на email
   └─> Возвращает challenge token

2. POST /api/auth/2fa/enable/confirm
   └─> Проверяет код из email
   └─> Активирует 2FA для пользователя
   └─> Сохранляет secret key в БД
```

**Хранение 2FA-данных (users таблица):**
```sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
```

**Генерация и проверка кодов:**
```kotlin
// TOTP-алгоритм (Time-based One-Time Password)
fun generateTwoFactorCode(secret: String): String {
    val timeStep = System.currentTimeMillis() / 30000
    val hmac = Mac.getInstance("HmacSHA1")
    hmac.init(SecretKeySpec(Base32.decode(secret), "HmacSHA1"))
    val hash = hmac.doFinal(ByteBuffer.allocate(8).putLong(timeStep).array())
    // ... truncation to 6 digits
}
```

### 2.3. CSRF Protection

**Механизм защиты:**
- CSRF-токен хранится в cookie (`XSRF-TOKEN`)
- Для state-changing операций (POST, PUT, DELETE, PATCH) требуется заголовок `X-XSRF-TOKEN`
- Токен обновляется при каждом запросе к `/api/auth/csrf`

**Frontend реализация (auth.js):**
```javascript
async function getCsrf(forceRefresh = false) {
    if (csrfState && !forceRefresh) {
        return csrfState
    }
    
    const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
    })
    
    const data = await response.json()
    csrfState = {
        headerName: data.headerName,  // 'X-XSRF-TOKEN'
        token: data.token,
    }
    return csrfState
}

async function request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase()
    const shouldAttachCsrf = !skipCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)
    
    if (shouldAttachCsrf) {
        const csrf = await getCsrf()
        headers[csrf.headerName] = csrf.token
    }
    // ...
}
```

### 2.4. Ролевая модель и проверки доступа

**Security Config (Spring Security):**
```kotlin
@Configuration
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        return http
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/opportunities/**").permitAll()  // Публичный каталог
                    .requestMatchers("/api/employer/**").hasRole("EMPLOYER")
                    .requestMatchers("/internal/**").hasRole("INTERNAL")
                    .anyRequest().authenticated()
            }
            .build()
    }
}
```

**Проверки на уровне сервиса:**
```kotlin
fun patchApplicantProfile(
    userId: Long,
    request: ApplicantProfilePatchRequest,
    currentUser: AuthenticatedUser
): ApplicantProfile {
    if (currentUser.role != Role.APPLICANT) {
        throw ProfileForbiddenException(
            message = "Только соискатель может редактировать профиль соискателя",
            code = "applicant_role_required"
        )
    }
    
    if (currentUser.userId != userId) {
        throw ProfileForbiddenException(
            message = "Нельзя редактировать чужой профиль",
            code = "profile_owner_required"
        )
    }
    
    // ... логика обновления
}
```

### 2.5. Internal API для межсервисного взаимодействия

**Механизм защиты internal endpoint'ов:**
- Специальный заголовок `X-Internal-API-Key`
- Ключ хранится в environment variables
- Фильтр проверяет заголовок перед допуском к endpoint'ам

**InternalApiRequestFilter.kt:**
```kotlin
class InternalApiRequestFilter(
    @Value("\${internal.api.key}") private val internalApiKey: String
) : OncePerRequestFilter() {
    
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val providedKey = request.getHeader("X-Internal-API-Key")
        
        if (request.requestURI.startsWith("/internal/") && providedKey != internalApiKey) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid internal API key")
            return
        }
        
        filterChain.doFilter(request, response)
    }
}
```

**Пример internal endpoint'а:**
```kotlin
@RestController
@RequestMapping("/internal/opportunities")
class InternalOpportunityController(
    private val opportunityService: OpportunityService
) {
    @GetMapping("/{id}")
    fun getOpportunityInternal(
        @PathVariable id: Long
    ): OpportunityDto {
        return opportunityService.getById(id)
    }
}
```

---

## 3. База данных и оптимизация

### 3.1. Схема БД с CHECK constraints

**Пример валидации на уровне БД:**
```sql
CREATE TABLE opportunity (
    -- ...
    CONSTRAINT chk_opportunity_status
    CHECK (status IN ('DRAFT', 'PENDING_MODERATION', 'PUBLISHED', 'REJECTED', 'CLOSED', 'ARCHIVED', 'PLANNED')),
    
    CONSTRAINT chk_opportunity_salary_range
    CHECK (salary_from IS NULL OR salary_to IS NULL OR salary_from <= salary_to),
    
    CONSTRAINT chk_opportunity_event_requires_event_date
    CHECK (type <> 'EVENT' OR event_date IS NOT NULL),
    
    CONSTRAINT chk_opportunity_location_by_format
    CHECK (
        (work_format IN ('OFFICE', 'HYBRID') AND location_id IS NOT NULL)
        OR (work_format IN ('REMOTE', 'ONLINE') AND city_id IS NOT NULL)
    )
);
```

**Преимущества:**
- Гарантия целостности данных на уровне БД
- Раннее выявление ошибок (до попадания в бизнес-логику)
- Документирование инвариантов в схеме

### 3.2. Индексы для производительности

**Критичные индексы:**
```sql
-- Поиск возможностей по статусу и дате публикации
CREATE INDEX idx_opportunity_status_published_at
    ON opportunity (status, published_at DESC NULLS LAST);

-- Поиск откликов по соискателю
CREATE INDEX idx_opportunity_response_applicant_status
    ON opportunity_response (applicant_user_id, status);

-- Поиск чатов по последнему сообщению
CREATE INDEX idx_chat_dialog_applicant_last_message
    ON chat_dialog (applicant_user_id, last_message_at DESC NULLS LAST, id DESC);

-- Гео-поиск с PostGIS
CREATE INDEX idx_city_point_geo
    ON city USING GIST (point);
```

### 3.3. PostGIS для гео-поиска

**Хранение координат:**
```sql
ALTER TABLE city ADD COLUMN point geometry(Point, 4326);

CREATE INDEX idx_city_point_geo
    ON city USING GIST (point);
```

**Поиск nearby возможностей:**
```kotlin
@Query("""
    SELECT o FROM Opportunity o
    JOIN o.city c
    WHERE ST_DWithin(
        c.point,
        ST_MakePoint(:longitude, :latitude)::geography,
        :radiusMeters
    )
    AND o.status = 'PUBLISHED'
""")
fun findNearbyOpportunities(
    latitude: Double,
    longitude: Double,
    radiusMeters: Double
): List<Opportunity>
```

**Формула расстояния:**
- Используется `ST_DWithin` с типом `geography` (сферическая геометрия)
- Точность до метров
- Учитывает кривизну Земли (Haversine formula внутри PostGIS)

### 3.4. JSONB для гибких данных

**Примеры использования:**

```sql
-- Контакты соискателя (разные типы: email, phone, telegram, etc.)
contact_links JSONB NOT NULL DEFAULT '[]'::jsonb

-- Портфолио ссылки
portfolio_links JSONB NOT NULL DEFAULT '[]'::jsonb

-- Снимок резюме при отклике
resume_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb

-- Контактная информация возможности
contact_info JSONB NOT NULL DEFAULT '{}'::jsonb
```

**Преимущества:**
- Гибкая схема для часто меняющихся данных
- Возможность индексации полей внутри JSONB
- Хранение snapshot'ов (исторические данные не меняются)

**Пример запроса к JSONB:**
```sql
-- Поиск соискателей с конкретным контактом
SELECT * FROM applicant_profile
WHERE contact_links @> '[{"type": "TELEGRAM"}]';
```

### 3.5. Триггеры для автоматического обновления

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_opportunity_set_updated_at
    BEFORE UPDATE ON opportunity
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
```

### 3.6. Транзакционная целостность

**Аннотация @Transactional:**
```kotlin
@Transactional
fun approve(taskId: Long, currentUser: AuthenticatedUser, request: ApproveModerationTaskRequest) {
    val task = moderationTaskDao.findById(taskId)
        ?: throw ModerationTaskNotFoundException(taskId)
    
    // 1. Обновляем статус задачи
    task.status = ModerationTaskStatus.APPROVED
    task.resolvedAt = Instant.now()
    
    // 2. Обновляем модерируемую сущность
    when (task.entityType) {
        ModerationEntityType.OPPORTUNITY -> {
            opportunityDao.updateStatus(task.entityId, OpportunityStatus.PUBLISHED)
        }
        ModerationEntityType.EMPLOYER_VERIFICATION -> {
            employerVerificationDao.approve(task.entityId)
        }
        // ...
    }
    
    // 3. Логируем действие
    moderationLogDao.create(ModerationLog(
        taskId = taskId,
        action = ModerationLogAction.APPROVED,
        actorUserId = currentUser.userId,
        payload = request.toMap()
    ))
}
```

**Изоляция транзакций:**
- По умолчанию `READ_COMMITTED`
- Для критичных операций явно указывается `REPEATABLE_READ`

---

## 4. API Design и контрактное взаимодействие

### 4.1. RESTful принципы

**Resource-oriented дизайн:**
```
GET    /api/opportunities          # Список
GET    /api/opportunities/:id      # Детально
POST   /api/opportunities          # Создать (публично - нельзя)
PUT    /api/opportunities/:id      # Обновить
DELETE /api/opportunities/:id      # Удалить

# Вложенные ресурсы
GET    /api/opportunities/:id/responses    # Отклики на возможность
POST   /api/opportunities/:id/favorites    # В избранное
```

**HTTP статусы:**
- `200 OK` — успешный GET/PUT/PATCH
- `201 Created` — успешный POST (создание)
- `204 No Content` — успешный DELETE или POST без тела ответа
- `400 Bad Request` — валидация не прошла
- `401 Unauthorized` — не аутентифицирован
- `403 Forbidden` — нет прав доступа
- `404 Not Found` — ресурс не найден
- `409 Conflict` — конфликт состояния (например, duplicate отклик)
- `422 Unprocessable Entity` — бизнес-валидация не прошла
- `500 Internal Server Error` — ошибка сервера

### 4.2. DTO для разделения моделей

**Entity (JPA):**
```kotlin
@Entity
@Table(name = "opportunity")
data class Opportunity(
    @Id @GeneratedValue val id: Long,
    val title: String,
    val shortDescription: String,
    val fullDescription: String?,
    // ...
)
```

**DTO для ответа:**
```kotlin
data class OpportunityCard(
    val id: Long,
    val title: String,
    val shortDescription: String,
    val company: EmployerSummary,
    val location: LocationSummary,
    val tags: List<TagDto>,
    val salary: SalaryRange?,
    val publishedAt: Instant?,
    val applicationDeadline: Instant?
)
```

**DTO для запроса:**
```kotlin
data class CreateOpportunityRequest(
    @NotBlank val title: String,
    @NotBlank @Size(max = 1000) val shortDescription: String,
    val fullDescription: String?,
    @NotNull val type: OpportunityType,
    @NotNull val workFormat: WorkFormat,
    // ...
)
```

**Преимущества:**
- Контроль над сериализацией (не утекают внутренние поля)
- Версионирование API (можно менять DTO независимо от entity)
- Валидация на границе системы

### 4.3. Feign клиенты для межсервисного взаимодействия

**Конфигурация:**
```kotlin
@FeignClient(
    name = "profile-service",
    url = "\${profile.service.url}",
    configuration = [ProfileServiceFeignConfig::class]
)
interface ProfileServiceClient {
    
    @GetMapping("/api/profile/applicant/{userId}")
    fun getApplicantProfile(@PathVariable userId: Long): ApplicantProfileDto
    
    @GetMapping("/api/profile/employer/{userId}")
    fun getEmployerProfile(@PathVariable userId: Long): EmployerProfileDto
}
```

**Конфигурация с interceptor:**
```kotlin
class InternalServiceFeignConfig(
    @Value("\${internal.api.key}") private val internalApiKey: String
) {
    @Bean
    fun requestInterceptor(): RequestInterceptor {
        return RequestInterceptor { template ->
            template.header("X-Internal-API-Key", internalApiKey)
        }
    }
}
```

### 4.4. Пагинация и сортировка

**Запрос:**
```
GET /api/opportunities?limit=20&offset=0&sortBy=PUBLISHED_AT&sortDirection=DESC
```

**Ответ:**
```json
{
    "items": [...],
    "totalCount": 150,
    "hasMore": true,
    "nextOffset": 20
}
```

**Реализация:**
```kotlin
data class GetOpportunityListRequest(
    val limit: Int = 20,
    val offset: Int = 0,
    val sortBy: OpportunitySortField = PUBLISHED_AT,
    val sortDirection: SortDirection = DESC,
    // фильтры...
)

fun getPublicCatalog(request: GetOpportunityListRequest): OpportunityPage {
    val pageable = OffsetBasedPageRequest(
        limit = request.limit,
        offset = request.offset,
        sort = Sort.by(request.sortDirection, request.sortBy.fieldName)
    )
    
    val opportunities = opportunityDao.findAll(specification, pageable)
    val totalCount = opportunityDao.count(specification)
    
    return OpportunityPage(
        items = opportunities.map { it.toDto() },
        totalCount = totalCount,
        hasMore = offset + limit < totalCount
    )
}
```

---

## 5. WebSocket и реальное время

### 5.1. STOMP поверх WebSocket

**Конфигурация endpoint'ов:**
```kotlin
@Configuration
@EnableWebSocketMessageBroker
class ChatWebSocketConfig : WebSocketMessageBrokerConfigurer {
    
    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
            .addEndpoint("/ws")
            .setAllowedOriginPatterns(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://tramplin-career.ru"
            )
            .addInterceptors(chatHandshakeInterceptor)
    }
    
    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        registry.enableSimpleBroker("/queue")      // Server → Client
        registry.setApplicationDestinationPrefixes("/app")  // Client → Server
        registry.setUserDestinationPrefix("/user")  // Per-user queues
    }
}
```

### 5.2. Аутентификация WebSocket сессий

**Handshake Interceptor:**
```kotlin
class ChatHandshakeInterceptor : HandshakeInterceptor {
    
    override fun beforeHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>
    ): Boolean {
        if (request is ServletServerHttpRequest) {
            val sessionId = extractSessionId(request.servletRequest)
            val tokenPayload = authService.validateSession(sessionId)
            
            if (tokenPayload != null && !tokenPayload.isExpired()) {
                attributes["userId"] = tokenPayload.userId
                attributes["email"] = tokenPayload.email
                attributes["role"] = tokenPayload.role
                return true
            }
        }
        return false
    }
}
```

### 5.3. Message Flow

**Отправка сообщения:**
```
Client: SEND /app/chats/{dialogId}/send
        {
            "clientMessageId": "uuid-123",
            "body": "Привет!",
            "replyToMessageId": 456
        }

Server: → Валидация (пользователь участник диалога?)
        → Сохранение в БД (chat_message)
        → Обновление last_message в dialog
        → Отправка подписчикам

Server: MESSAGE /user/queue/chat/{dialogId}
        {
            "id": 789,
            "dialogId": 123,
            "senderUserId": 456,
            "senderRole": "APPLICANT",
            "body": "Привет!",
            "createdAt": "2026-06-05T10:00:00Z"
        }
```

### 5.4. Гарантии доставки

**Механизм clientMessageId:**
- Клиент генерирует уникальный ID для каждого сообщения
- Сервер проверяет уникальность `(dialog_id, sender_user_id, client_message_id)`
- При повторной отправке (retry) сообщение не дублируется

**База данных:**
```sql
CREATE UNIQUE INDEX uk_chat_message_client_message
    ON chat_message (dialog_id, sender_user_id, client_message_id);
```

### 5.5. Typing индикаторы

**WebSocket событие:**
```
Client: SEND /app/chats/{dialogId}/typing
        { "typing": true }

Server: → Отправка подписчику (без сохранения в БД)

Server: MESSAGE /user/queue/chat/{dialogId}/typing
        {
            "userId": 456,
            "typing": true
        }
```

**Debouncing на клиенте:**
```javascript
let typingTimeout;
function sendTypingStatus(isTyping) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stompClient.send(`/app/chats/${dialogId}/typing`, {}, { typing: false });
    }, 1000);
    
    if (isTyping) {
        stompClient.send(`/app/chats/${dialogId}/typing`, {}, { typing: true });
    }
}
```

---

## 6. AI-интеграции

### 6.1. YandexGPT для генерации контента

**Клиент:**
```kotlin
interface YandexGptClient {
    fun complete(systemPrompt: String, userPrompt: String): String
}
```

**Реализация:**
```kotlin
@Component
class YandexGptClientImpl(
    @Value("\${yandex.gpt.api.key}") private val apiKey: String,
    @Value("\${yandex.gpt.folder.id}") private val folderId: String
) : YandexGptClient {
    
    private val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) { json() }
    }
    
    override fun complete(systemPrompt: String, userPrompt: String): String {
        val response = runBlocking {
            httpClient.post("https://llm.api.cloud.yandex.net/foundationModels/v1/completion") {
                contentType(ContentType.Application.Json)
                header("Authorization", "Api-Key $apiKey")
                header("x-folder-id", folderId)
                setBody(YandexGptRequest(
                    modelUri = "gpt://$folderId/yandexgpt/latest",
                    completionOptions = CompletionOptions(temperature = 0.7, maxTokens = 2000),
                    messages = listOf(
                        Message(role = "system", text = systemPrompt),
                        Message(role = "user", text = userPrompt)
                    )
                ))
            }
        }
        
        return response.body<YandexGptResponse>().result.alternatives[0].message.text
    }
}
```

### 6.2. Генерация описания вакансии

**Prompt engineering:**
```kotlin
class AiOpportunityDescriptionService(
    private val yandexGptClient: YandexGptClient
) {
    fun generateDescription(request: GenerateDescriptionRequest): String {
        val systemPrompt = """
            Ты — профессиональный HR-специалист, который составляет описания вакансий.
            Пиши структурированно, конкретно, без воды.
            Используй маркированные списки для требований и обязанностей.
            Тон — дружелюбный, но профессиональный.
        """.trimIndent()
        
        val userPrompt = """
            Создай описание вакансии на основе:
            - Должность: ${request.title}
            - Краткое описание: ${request.shortDescription}
            - Ключевые навыки: ${request.skills.joinToString(", ")}
            - Формат работы: ${request.workFormat}
            
            Включи разделы:
            1. Обязанности
            2. Требования
            3. Будет преимуществом
            4. Условия
        """.trimIndent()
        
        return yandexGptClient.complete(systemPrompt, userPrompt)
    }
}
```

### 6.3. Подбор тегов через AI

**Endpoint:**
```
POST /api/employer/opportunities/ai/suggest-tags
{
    "title": "Frontend Developer Intern",
    "shortDescription": "Разработка UI на React...",
    "skills": ["JavaScript", "React", "TypeScript"]
}
```

**Ответ:**
```json
{
    "suggestedSkillTags": [
        { "id": 1, "name": "React", "category": "SKILL" },
        { "id": 5, "name": "TypeScript", "category": "SKILL" },
        { "id": 12, "name": "Frontend", "category": "SPECIALIZATION" }
    ],
    "suggestedInterestTags": [
        { "id": 20, "name": "Веб-разработка", "category": "INTEREST" }
    ]
}
```

### 6.4. Анализ резюме для рекомендаций

**Flow:**
```
1. Соискатель вводит текст резюме
2. AI извлекает навыки и интересы
3. Система подбирает теги из справочника
4. Генерируются персонализированные рекомендации вакансий
```

**Endpoint:**
```
POST /api/opportunities/recommendations/resume-analysis
{
    "resumeText": "Студент 3 курса, изучаю React, TypeScript...",
    "source": "TEXT"
}
```

**Ответ:**
```json
{
    "detectedSkills": ["React", "TypeScript", "JavaScript"],
    "suggestedSkillTags": [...],
    "suggestedInterestTags": [...],
    "strengths": ["Современный стек", "Актуальные навыки"],
    "improvementTips": ["Добавьте проекты в портфолио"],
    "opportunityPreview": [
        { "id": 1, "title": "Frontend Intern", "matchScore": 0.85 }
    ]
}
```

### 6.5. Ограничения и fallback'и

**Rate limiting:**
- Максимум 10 запросов в минуту на пользователя
- При превышении — возврат к ручному вводу

**Timeout:**
- Таймаут запроса к YandexGPT: 30 секунд
- При timeout — возврат ошибки с предложением попробовать позже

**Валидация ответа:**
```kotlin
fun validateAiResponse(response: String): Boolean {
    // Проверка на пустой ответ
    if (response.isBlank()) return false
    
    // Проверка на некорректный контент
    if (response.contains("не могу") || response.contains("не знаю")) {
        return false
    }
    
    return true
}
```

---

## 7. Файловое хранилище

### 7.1. S3-совместимое хранилище

**Структура бакета:**
```
tramplin-files/
├── avatars/
│   └── {userId}/{fileId}.jpg
├── resumes/
│   └── {userId}/{fileId}.pdf
├── company-logos/
│   └── {employerId}/{fileId}.png
├── verification/
│   └── {verificationId}/{fileId}.jpg
└── chat-attachments/
    └── {dialogId}/{fileId}.pdf
```

### 7.2. Модель данных

**file_asset таблица:**
```sql
CREATE TABLE file_asset (
    id BIGSERIAL PRIMARY KEY,
    storage_key VARCHAR(255) NOT NULL UNIQUE,  -- Ключ в S3
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    kind VARCHAR(32) NOT NULL,  -- AVATAR, RESUME, LOGO, etc.
    status VARCHAR(32) NOT NULL DEFAULT 'UPLOADING',
    visibility VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**file_attachment таблица:**
```sql
CREATE TABLE file_attachment (
    id BIGSERIAL PRIMARY KEY,
    file_id BIGINT NOT NULL REFERENCES file_asset(id),
    entity_type VARCHAR(32) NOT NULL,  -- APPLICANT_PROFILE, OPPORTUNITY, etc.
    entity_id BIGINT NOT NULL,
    attachment_role VARCHAR(32) NOT NULL,  -- AVATAR, RESUME, ATTACHMENT
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_file_attachment UNIQUE (file_id, entity_type, entity_id, attachment_role)
);
```

### 7.3. Загрузка файлов

**Flow:**
```
1. Клиент: POST /api/profile/applicant/profile/resume-file (multipart/form-data)
2. Сервер: Генерирует storage_key
3. Сервер: Загружает файл в S3
4. Сервер: Создаёт запись в file_asset
5. Сервер: Создаёт запись в file_attachment
6. Сервер: Возвращает metadata файла
```

**Валидация:**
```kotlin
fun validateFile(file: MultipartFile, kind: FileAssetKind) {
    // Проверка размера
    val maxSize = when (kind) {
        AVATAR -> 5 * 1024 * 1024  // 5MB
        RESUME -> 10 * 1024 * 1024  // 10MB
        else -> 20 * 1024 * 1024  // 20MB
    }
    
    if (file.size > maxSize) {
        throw FileTooLargeException(kind, maxSize)
    }
    
    // Проверка типа
    val allowedTypes = when (kind) {
        AVATAR -> listOf("image/jpeg", "image/png", "image/webp")
        RESUME -> listOf("application/pdf")
        else -> emptyList()
    }
    
    if (file.contentType !in allowedTypes) {
        throw InvalidFileTypeException(kind, allowedTypes)
    }
}
```

### 7.4. Генерация URL для скачивания

**Presigned URL (временный доступ):**
```kotlin
fun generateDownloadUrl(fileId: Long, currentUser: AuthenticatedUser): String {
    val attachment = fileAttachmentDao.findByFileIdAndEntityId(fileId, currentUser.userId)
        ?: throw FileNotFoundException()
    
    // Проверка прав доступа
    if (!hasAccess(attachment, currentUser)) {
        throw AccessDeniedException()
    }
    
    val fileAsset = fileAssetDao.findById(fileId)
    
    // Генерация presigned URL (срок действия 1 час)
    return s3Client.generatePresignedUrl(
        bucket = s3Properties.bucket,
        key = fileAsset.storageKey,
        expiration = Date(System.currentTimeMillis() + 3600_000)
    ).toString()
}
```

---

## 8. Обработка ошибок и валидация

### 8.1. Иерархия исключений

```
ApiException (базовое)
├── AuthException
│   ├── InvalidCredentialsException
│   ├── TwoFactorRequiredException
│   └── SessionExpiredException
├── ProfileException
│   ├── ProfileNotFoundException
│   ├── ProfileForbiddenException
│   └── ProfileValidationException
├── OpportunityException
│   ├── OpportunityNotFoundException
│   └── EmployerOpportunityCreationNotAllowedException
├── ModerationException
│   ├── ModerationTaskNotFoundException
│   └── ModerationAlreadyCompletedException
└── InteractionException
    ├── ContactAlreadyExistsException
    └── OpportunityResponseAlreadyExistsException
```

### 8.2. Глобальный обработчик ошибок

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {
    
    @ExceptionHandler(ApiException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleApiException(ex: ApiException): ErrorResponse {
        return ErrorResponse(
            status = ex.status.value(),
            code = ex.code,
            message = ex.message,
            details = ex.details
        )
    }
    
    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleValidationException(ex: MethodArgumentNotValidException): ErrorResponse {
        val details = ex.bindingResult.fieldErrors.associate {
            it.field to it.defaultMessage
        }
        
        return ErrorResponse(
            status = HttpStatus.BAD_REQUEST.value(),
            code = "validation_error",
            message = "Ошибка валидации данных",
            details = details
        )
    }
    
    @ExceptionHandler(Exception::class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    fun handleGenericException(ex: Exception): ErrorResponse {
        log.error("Unexpected error", ex)
        
        return ErrorResponse(
            status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
            code = "internal_error",
            message = "Внутренняя ошибка сервера"
        )
    }
}
```

### 8.3. Формат ответа об ошибке

```json
{
    "status": 400,
    "code": "validation_error",
    "message": "Ошибка валидации данных",
    "details": {
        "email": "Некорректный формат email",
        "password": "Пароль должен содержать минимум 8 символов"
    }
}
```

### 8.4. Валидация на уровне модели

```kotlin
data class RegistrationRequest(
    @field:NotBlank(message = "Email обязателен")
    @field:Email(message = "Некорректный формат email")
    val email: String,
    
    @field:NotBlank(message = "Пароль обязателен")
    @field:Size(min = 8, max = 128, message = "Пароль должен быть от 8 до 128 символов")
    val password: String,
    
    @field:NotBlank(message = "Имя обязательно")
    @field:Size(max = 120, message = "Имя не должно превышать 120 символов")
    val displayName: String,
    
    @field:NotNull(message = "Роль обязательна")
    val role: Role
)
```

---

## 9. Производительность и кэширование

### 9.1. Кэширование на frontend

**HTTP-кэш для GET-запросов:**
```javascript
const GET_RESPONSE_CACHE = new Map()
const GET_IN_FLIGHT_REQUESTS = new Map()
const CACHE_TTL_MS = 10_000  // 10 секунд

async function httpJson(url, options = {}) {
    const cacheTtlMs = Number(options.cacheTtlMs) || 0
    const dedupe = Boolean(options.dedupe)
    const cacheKey = `${options.method || 'GET'}:${url}`
    
    // Проверка кэша
    if (cacheTtlMs > 0) {
        const cached = GET_RESPONSE_CACHE.get(cacheKey)
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data
        }
    }
    
    // Deduplication in-flight запросов
    if (dedupe) {
        const inFlight = GET_IN_FLIGHT_REQUESTS.get(cacheKey)
        if (inFlight) {
            return inFlight
        }
    }
    
    // Выполнение запроса
    const requestPromise = fetch(url, options)
        .then(response => response.json())
    
    if (dedupe) {
        GET_IN_FLIGHT_REQUESTS.set(cacheKey, requestPromise)
    }
    
    try {
        const data = await requestPromise
        
        // Сохранение в кэш
        if (cacheTtlMs > 0) {
            GET_RESPONSE_CACHE.set(cacheKey, {
                data,
                expiresAt: Date.now() + cacheTtlMs
            })
        }
        
        return data
    } finally {
        if (dedupe) {
            GET_IN_FLIGHT_REQUESTS.delete(cacheKey)
        }
    }
}
```

### 9.2. Кэширование сессии пользователя

```javascript
const SESSION_CACHE_TTL_MS = 15_000  // 15 секунд
let sessionUserCache = null
let sessionUserCacheAt = 0

async function getSessionUserFromApi({ force = false } = {}) {
    const isFresh = sessionUserCache && Date.now() - sessionUserCacheAt < SESSION_CACHE_TTL_MS
    
    if (!force && isFresh) {
        return sessionUserCache
    }
    
    const data = await httpJson('/api/auth/me')
    sessionUserCache = mapSessionUser(data)
    sessionUserCacheAt = Date.now()
    
    return sessionUserCache
}
```

### 9.3. Индексы БД для производительности

**Критичные query и индексы:**

| Запрос | Индекс |
|--------|--------|
| `SELECT * FROM opportunity WHERE status = 'PUBLISHED' ORDER BY published_at DESC` | `idx_opportunity_status_published_at (status, published_at DESC)` |
| `SELECT * FROM opportunity_response WHERE applicant_user_id = ?` | `idx_opportunity_response_applicant_status (applicant_user_id, status)` |
| `SELECT * FROM chat_dialog WHERE applicant_user_id = ? ORDER BY last_message_at DESC` | `idx_chat_dialog_applicant_last_message (applicant_user_id, last_message_at DESC, id DESC)` |
| `SELECT * FROM city WHERE ST_DWithin(point, ?, ?)` | `idx_city_point_geo (GIST point)` |

### 9.4. Lazy loading и Eager loading

**JPA Fetch стратегии:**
```kotlin
@Entity
class Opportunity(
    // ...
    
    @OneToMany(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_id")
    val tags: List<OpportunityTag> = emptyList(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id")
    val city: City? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employer_user_id")
    val employer: EmployerProfile? = null
)
```

**DTO projection для избежания N+1:**
```kotlin
@Query("""
    SELECT new ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto(
        o.id, o.title, o.shortDescription, o.type, o.workFormat,
        c.name, c.regionName,
        e.companyName, e.logoFileId
    )
    FROM Opportunity o
    JOIN o.city c
    JOIN o.employer e
    LEFT JOIN FETCH o.tags
    WHERE o.status = 'PUBLISHED'
""")
fun findAllDto(): List<OpportunityDto>
```

---

## 10. Миграции и эволюция схемы

### 10.1. Версионирование миграций

**Нумерация:**
```
V1__base_geo_init.sql           # Базовая инициализация
V2__user_profile_create.sql     # Пользователи и профили
V3__tag_create.sql              # Теги
V4__file_storage_create.sql     # Файловое хранилище
V5__opportunity_create.sql      # Возможности
V6__interaction_create.sql      # Взаимодействия
V7__moderation_create.sql       # Модерация
V8__seed_reference_data.sql     # Справочники
...
V41__tag_category_unique_index.sql  # Индексы
```

### 10.2. Обратная совместимость

**Правила:**
1. Никогда не удалять колонки сразу — помечать как deprecated
2. Новые колонки делать NULLABLE с DEFAULT значениями
3. Миграция данных в отдельной миграции
4. Двойная запись при изменении формата (старое + новое поле)

**Пример безопасного изменения:**
```sql
-- V25__add_applicant_profile_moderation_status.sql
ALTER TABLE applicant_profile 
    ADD COLUMN moderation_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT';

-- V36__backfill_applicant_and_employer_public_snapshots.sql
UPDATE applicant_profile 
SET moderation_status = 'APPROVED' 
WHERE moderation_status = 'DRAFT' AND created_at < NOW() - INTERVAL '30 days';
```

### 10.3. Rollback стратегия

**Для каждой миграции планируется rollback:**
```sql
-- Forward
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;

-- Rollback
ALTER TABLE users DROP COLUMN two_factor_enabled;
```

**Важно:** Rollback миграции с данными требует восстановления данных:
```sql
-- Forward
ALTER TABLE applicant_profile ADD COLUMN new_field VARCHAR(255);
UPDATE applicant_profile SET new_field = 'default_value';

-- Rollback (данные будут потеряны)
ALTER TABLE applicant_profile DROP COLUMN new_field;
```

---

## 11. Тестирование

### 11.1. Уровни тестирования

```
┌─────────────────────────────────────┐
│         E2E Tests (редко)           │
├─────────────────────────────────────┤
│      Integration Tests (часто)      │
├─────────────────────────────────────┤
│        Unit Tests (всегда)          │
└─────────────────────────────────────┘
```

### 11.2. Unit тесты

**Пример теста сервиса:**
```kotlin
@ExtendWith(MockKExtension::class)
class OpportunityServiceTest {
    
    @MockK
    private lateinit var opportunityDao: OpportunityDao
    
    @MockK
    private lateinit var moderationClient: ModerationServiceClient
    
    @InjectMocks
    private lateinit var opportunityService: OpportunityServiceImpl
    
    @Test
    fun `should create opportunity in DRAFT status`() {
        // Given
        val request = CreateOpportunityRequest(
            title = "Test Vacancy",
            type = OpportunityType.VACANCY,
            // ...
        )
        val employerId = 123L
        
        // When
        val result = opportunityService.create(employerId, request)
        
        // Then
        verify { opportunityDao.save(any()) }
        assertEquals(OpportunityStatus.DRAFT, result.status)
    }
}
```

### 11.3. Integration тесты

**Тест контроллера:**
```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class OpportunityControllerIntegrationTest {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    @Test
    fun `should return published opportunities`() {
        // Given
        val opportunity = createPublishedOpportunity()
        
        // When
        val result = mockMvc.perform(
            get("/api/opportunities")
                .contentType(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.items").isArray)
        .andReturn()
        
        // Then
        val response = objectMapper.readValue(result.response.contentAsString, OpportunityPage::class.java)
        assertTrue(response.items.any { it.id == opportunity.id })
    }
}
```

### 11.4. Testcontainers для интеграционных тестов

```kotlin
@Testcontainers
@SpringBootTest
class DatabaseIntegrationTest {
    
    companion object {
        @Container
        val postgres = PostgreSQLContainer("postgis/postgis:17-3.5")
            .withDatabaseName("test_tramplin")
            .withUsername("test")
            .withPassword("test")
    }
    
    @DynamicPropertySource
    @JvmStatic
    fun properties(registry: DynamicPropertyRegistry) {
        registry.add("spring.datasource.url") { postgres.jdbcUrl }
        registry.add("spring.datasource.username") { postgres.username }
        registry.add("spring.datasource.password") { postgres.password }
    }
}
```

---

## 12. Развёртывание и окружения

### 12.1. Docker Compose для локальной разработки

```yaml
services:
  postgres:
    image: postgis/postgis:17-3.5
    ports:
      - "5555:5432"
    environment:
      POSTGRES_DB: tramplin
      POSTGRES_USER: tramplin_adm
      POSTGRES_PASSWORD: tramplin_adm
  
  redis:
    image: redis
    command: redis-server --requirepass tramplin_token
    ports:
      - "6379:6379"
  
  auth:
    build: ./server/auth
    ports:
      - "9999:9999"
    depends_on:
      - redis
      - postgres
  
  # ... остальные сервисы
```

### 12.2. Переменные окружения

**Обязательные:**
```bash
# Database
POSTGRES_URL=jdbc:postgresql://localhost:5555/tramplin
POSTGRES_USER=tramplin_adm
POSTGRES_PASSWORD=tramplin_adm

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tramplin_token

# S3
S3_BUCKET=tramplin-files
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=ru-central1

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=noreply@tramplin.ru
SMTP_PASSWORD=your-password

# WebSocket
CHAT_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*

# AI
YANDEX_GPT_API_KEY=your-api-key
YANDEX_GPT_FOLDER_ID=your-folder-id

# Geo
DADATA_API_KEY=your-dadata-key
```

### 12.3. Сборка и запуск

**Backend:**
```bash
cd server
mvn clean package -DskipTests
docker compose up --build
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
# или для разработки
npm start
```

---

## 13. Ключевые технические решения

### 13.1. Почему Kotlin?

**Преимущества:**
- Null safety (меньше NPE в продакшене)
- Data classes (меньше boilerplate)
- Coroutines (асинхронность без callback hell)
- Полная совместимость с Java экосистемой

**Пример:**
```kotlin
// Java
public class User {
    private Long id;
    private String email;
    
    // getters, setters, equals, hashCode, toString...
}

// Kotlin
data class User(
    val id: Long,
    val email: String
)
```

### 13.2. Почему multi-module монолит?

**Альтернативы:**
| Архитектура | Почему не выбрали |
|-------------|-------------------|
| Микросервисы | Overkill для текущего масштаба, сложность оперирования |
| Единый модуль | Сложно масштабировать команду, tight coupling |
| Multi-module | Баланс между простотой и модульностью |

### 13.3. Почему PostgreSQL + PostGIS?

**Требования:**
- Реляционные данные (пользователи, вакансии, отклики)
- Гео-поиск (вакансии рядом)
- JSONB для гибких полей
- Full-text search (потенциально)

**PostgreSQL покрывает все требования из коробки.**

### 13.4. Почему WebSocket (STOMP)?

**Альтернативы:**
| Технология | Почему не выбрали |
|------------|-------------------|
| Polling | Высокая задержка, лишние запросы |
| Server-Sent Events | Только server→client, нет бидирекциональности |
| WebSocket + STOMP | Push notifications, typing indicators, реальное время |

### 13.5. Почему сессии в Redis?

**Альтернативы:**
| Хранение | Почему не выбрали |
|----------|-------------------|
| JWT в cookie | Сложность invalidation, большой размер токена |
| Сессии в памяти | Не масштабируется на несколько инстансов |
| Redis | Быстро, shared между инстансами, TTL из коробки |

---

## 14. Возможные улучшения

### 14.1. Краткосрочные (1-3 месяца)

1. **Rate Limiting** — защита от злоупотреблений API
2. **Audit Log** — логирование всех критичных действий
3. **GraphQL API** — для гибких запросов на frontend
4. **Elasticsearch** — полнотекстовый поиск по вакансиям

### 14.2. Среднесрочные (3-6 месяцев)

1. **Выделение auth в отдельный сервис** — независимое масштабирование
2. **Message Queue (RabbitMQ/Kafka)** — асинхронные уведомления
3. **Read Replica для БД** — масштабирование чтения
4. **CDN для статики** — ускорение загрузки файлов

### 14.3. Долгосрочные (6+ месяцев)

1. **Микросервисная архитектура** — при росте нагрузки
2. **Machine Learning** — умные рекомендации вакансий
3. **Mobile App** — нативные приложения iOS/Android
4. **Multi-region deployment** — гео-распределение

---

## Приложения

### A. Словарь терминов

| Термин | Значение |
|--------|----------|
| Opportunity | Вакансия, стажировка, менторская программа или мероприятие |
| Response | Отклик соискателя на возможность |
| Dialog | Чат между соискателем и работодателем |
| Moderation Task | Задача на проверку контента куратором |
| Workspace | Расширенные данные профиля для владельца |

### B. Ссылки на документацию

- [Spring Boot](https://spring.io/projects/spring-boot)
- [Kotlin](https://kotlinlang.org/docs/home.html)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [PostGIS](https://postgis.net/documentation/)
- [STOMP Protocol](https://stomp.github.io/)
- [YandexGPT API](https://cloud.yandex.ru/docs/yandexgpt/)

### C. Контакты команды

- Backend: [имя]@[email]
- Frontend: [имя]@[email]
- DevOps: [имя]@[email]

---

*Документ актуален на 5 июня 2026 г. Версия: 1.0*
