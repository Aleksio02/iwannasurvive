# Tramplin: полный контекст реализации проекта

## 1. Назначение проекта

**Tramplin** — платформа для старта карьеры в IT, соединяющая соискателей (студентов, начинающих специалистов) с работодателями.

### С точки зрения продукта:

| Роль | Задачи, которые закрывает система |
|------|-----------------------------------|
| **Соискатель (APPLICANT)** | Поиск вакансий/стажировок/мероприятий, фильтрация по навыкам и формату работы, отклики на возможности, ведение профиля с указанием навыков и контактов, добавление в избранное, получение рекомендаций от других пользователей, общение в чатах с работодателями |
| **Работодатель (EMPLOYER)** | Управление профилем компании, публикация вакансий/стажировок/менторских программ, просмотр откликов кандидатов, верификация компании, общение с соискателями в чатах |
| **Куратор (CURATOR)** | Модерация профилей соискателей и работодателей, верификация компаний, модерация возможностей (вакансий), модерация тегов |
| **Администратор (ADMIN)** | Все функции куратора + создание и управление кураторами |

### Ключевые фичи из кода:
- Двухфакторная аутентификация (2FA) по email
- Верификация компаний через корпоративную почту / ИНН / профессиональные ссылки
- Модерация контента с AI-помощником (YandexGPT)
- Гео-поиск возможностей с использованием PostGIS
- WebSocket-чаты между соискателем и работодателем
- Персонализированные рекомендации вакансий на основе резюме
- AI-генерация описаний вакансий и подбор тегов

---

## 2. Общая архитектура

### Frontend
- **Технологии:** React 19, Vite, JavaScript (Node.js 18+)
- **Маршрутизация:** wouter
- **Стили:** SCSS
- **API-клиенты:** `/frontend/src/shared/api/*.js` (http.js, auth.js, profile.js, opportunities.js, interaction.js, chats.js, moderation.js, geo.js, favorites.js, curatorTag.js, employerTag.js, admin.js)
- **Layouts:** `ProtectedRoute` (защита маршрутов по ролям), `ProfileOnboardingGuard` (контроль заполнения профиля)
- **Основной файл:** `frontend/src/app/App.jsx`

### Backend
- **Язык:** Kotlin 1.9.25
- **Фреймворк:** Spring Boot 3.5.11
- **Сборка:** Maven (Java 21)
- **Архитектура:** Multi-module (9 модулей)

### Инфраструктура (docker-compose.yml)

| Сервис | Порт | Назначение |
|--------|------|------------|
| `tramplin_db` (PostgreSQL 17 + PostGIS 3.5) | 5555 | Основная БД с гео-расширениями |
| `tramplin_cache` (Redis) | 6379 | Кэш сессий, rate limiting |
| `tramplin_auth` | 9999 | Аутентификация, 2FA, сессии |
| `tramplin_profile` | 8080 | Профили соискателей/работодателей |
| `tramplin_opportunity` | 8081 | Вакансии, стажировки, теги, AI-функции |
| `tramplin_moderation` | 8082 | Модерация контента, AI-анализ (YandexGPT) |
| `tramplin_interaction` | 8083 | Отклики, чаты (WebSocket), контакты, избранное |
| `tramplin_geo` | 8084 | Гео-поиск, DaData интеграция |
| `tramplin_media` | 8091 | Файловое хранилище (S3) |
| `tramplin_frontend` | 8888 (HTTP), 443 (HTTPS) | Nginx для статики |

### Таблица backend-модулей

| Модуль | Назначение | Основные сущности | Основные контроллеры | Внешние зависимости |
|--------|------------|-------------------|---------------------|---------------------|
| **commons** | Общие модели, enums, DTO, исключения | Role, OpportunityStatus, FileAsset, ModerationTask | - | - |
| **auth** | Аутентификация, 2FA, сессии, администрирование | User, Session, TwoFactorToken, PasswordResetToken | AuthController, AdminController | Redis, notification (email) |
| **profile** | Профили пользователей, верификация компаний | ApplicantProfile, EmployerProfile, EmployerVerification, Location | ProfileController, EmployerVerificationController, EmployerLocationController | auth, moderation, media, opportunity, interaction (Feign) |
| **moderation** | Модерация контента, AI-анализ | ModerationTask, ModerationLog, AiAnalysis | ModerationController | auth, profile, opportunity, media, YandexGPT API |
| **interaction** | Отклики, чаты, контакты, избранное | OpportunityResponse, ChatDialog, ChatMessage, ApplicantContact, Favorite | InteractionController, ChatController, ChatWebSocketController, EmployerResponseController | auth, profile, opportunity, media |
| **opportunity** | Вакансии, стажировки, теги, рекомендации | Opportunity, Tag, TagSynonym, OpportunityTag | OpportunityController, EmployerOpportunityController, TagController, CuratorTagController, ResumeAnalysisRecommendationController | auth, profile, moderation, media |
| **geo** | Гео-поиск, справочники городов | City, Location, GeoReference | GeoController, GeoReferenceController | auth, DaData API |
| **media** | Файловое хранилище | FileAsset, FileAttachment | InternalFileController | S3 |
| **notification** | Email-уведомления | - | - | SMTP |

### Технологии хранения данных

| Технология | Назначение |
|------------|------------|
| **PostgreSQL 17 + PostGIS 3.5** | Основная БД: пользователи, профили, возможности, отклики, чаты, модерация, гео-данные |
| **Redis** | Сессии пользователей, кэш |
| **S3-совместимое хранилище** | Файлы: аватары, резюме, логотипы компаний, вложения модерации, вложения чатов |
| **SMTP** | Отправка email (2FA-коды, регистрация, восстановление пароля) |
| **WebSocket (STOMP)** | Чаты в реальном времени |

### AI-интеграции
- **YandexGPT** — модерация контента, генерация описаний вакансий, подбор тегов, анализ резюме
- **DaData** — подсказки адресов, гео-кодирование (через модуль `geo`)

---

## 3. Роли и права доступа

### Роли из `commons/model/Role.kt`:
```kotlin
enum class Role {
    ADMIN,      // Администратор
    CURATOR,    // Куратор (модератор)
    EMPLOYER,   // Работодатель
    APPLICANT   // Соискатель
}
```

### Детализация по ролям:

#### APPLICANT (Соискатель)
**Что может делать:**
- Заполнять и редактировать профиль соискателя
- Просматривать каталог возможностей (вакансии, стажировки, мероприятия)
- Откликаться на возможности
- Добавлять возможности и работодателей в избранное
- Добавлять других соискателей в контакты
- Создавать и получать рекомендации от других соискателей
- Общаться в чатах с работодателями
- Управлять настройками безопасности (2FA, пароль)

**Frontend-страницы:**
- `/` — каталог возможностей
- `/opportunities/:id` — детальная страница возможности
- `/seeker` — личный кабинет соискателя (Dashboard)
- `/seekers` — поиск соискателей
- `/seekers/:id` — публичный профиль соискателя
- `/profile/edit` — редактирование профиля
- `/settings/security` — настройки безопасности
- `/chats/:dialogId` — чаты

**Backend API:**
- `GET/PATCH /api/profile/applicant/*` — профиль соискателя
- `GET /api/opportunities/*` — каталог возможностей
- `POST /api/interaction/responses` — отклик на возможность
- `GET/POST/DELETE /api/interaction/favorites/*` — избранное
- `GET/POST/DELETE /api/interaction/contacts/*` — контакты
- `GET/POST/DELETE /api/interaction/recommendations/*` — рекомендации
- `GET/POST /api/chats/*` — чаты (REST + WebSocket)

**Ограничения:**
- Не может публиковать возможности
- Не может модерировать контент
- Не может управлять кураторами

---

#### EMPLOYER (Работодатель)
**Что может делать:**
- Заполнять и редактировать профиль компании
- Проходить верификацию компании
- Создавать, редактировать, публиковать возможности (вакансии, стажировки)
- Просматривать отклики на свои возможности
- Управлять статусами откликов
- Добавлять работодателей в избранное
- Общаться в чатах с соискателями
- Использовать AI-функции для генерации описаний и подбора тегов

**Frontend-страницы:**
- `/employer` — личный кабинет работодателя (Dashboard)
- `/employers/:id` — публичный профиль работодателя
- `/profile/edit` — редактирование профиля
- `/settings/security` — настройки безопасности
- `/chats/:dialogId` — чаты

**Backend API:**
- `GET/PATCH /api/profile/employer/*` — профиль работодателя
- `POST /api/employer/verification` — верификация компании
- `GET/POST/PUT /api/employer/opportunities/*` — возможности работодателя
- `GET /api/employer/responses/*` — отклики на возможности
- `POST /api/employer/opportunities/ai/*` — AI-функции

**Ограничения:**
- Не может публиковать возможности без верификации компании
- Не может модерировать контент
- Не может управлять кураторами

---

#### CURATOR (Куратор)
**Что может делать:**
- Просматривать dashboard модерации
- Получать список задач модерации
- Назначать задачи на себя
- Одобрять/отклонять/возвращать на доработку задачи
- Комментировать задачи
- Просматривать историю сущностей
- Просматривать вложения задач

**Frontend-страницы:**
- `/curator` — панель модерации (CuratorDashboard)
- `/settings/security` — настройки безопасности

**Backend API:**
- `GET /api/moderation/dashboard` — dashboard
- `GET /api/moderation/tasks` — список задач
- `GET /api/moderation/tasks/:id` — детальная задача
- `POST /api/moderation/tasks/:id/assign` — назначить задачу
- `POST /api/moderation/tasks/:id/approve` — одобрить
- `POST /api/moderation/tasks/:id/reject` — отклонить
- `POST /api/moderation/tasks/:id/request-changes` — вернуть на доработку
- `POST /api/moderation/tasks/:id/comment` — комментарий

**Ограничения:**
- Не может создавать кураторов
- Не может управлять пользователями напрямую

---

#### ADMIN (Администратор)
**Что может делать:**
- Все функции CURATOR
- Создавать новых кураторов
- Управлять списком кураторов

**Frontend-страницы:**
- `/curator` — панель модерации
- `/admin/curators` — управление кураторами
- `/settings/security` — настройки безопасности

**Backend API:**
- Все endpoint'ы CURATOR
- `POST /api/admin/curators` — создать куратора
- `GET /api/admin/curators` — список кураторов

---

### Protected Routes (frontend/src/shared/ui/ProtectedRoute.jsx)
Маршруты защищаются по ролям через `allowedRoles`:
```jsx
<ProtectedRoute allowedRoles={['APPLICANT']}>
    <SeekerDashboard />
</ProtectedRoute>

<ProtectedRoute allowedRoles={['CURATOR', 'ADMIN']}>
    <CuratorDashboard />
</ProtectedRoute>
```

---

## 4. Авторизация, регистрация, сессии и безопасность

### Auth Flow (backend: `auth/controller/AuthController.kt`)

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/auth/register` | POST | Регистрация пользователя |
| `/api/auth/register/confirm` | POST | Подтверждение регистрации кодом |
| `/api/auth/register/resend` | POST | Повторная отправка кода регистрации |
| `/api/auth/login` | POST | Логин (email + пароль) |
| `/api/auth/2fa/login/verify` | POST | Подтверждение 2FA при входе |
| `/api/auth/2fa/login/resend` | POST | Повторная отправка 2FA-кода |
| `/api/auth/2fa/enable/request` | POST | Запрос на включение 2FA |
| `/api/auth/2fa/enable/confirm` | POST | Подтверждение включения 2FA |
| `/api/auth/2fa/disable/request` | POST | Запрос на отключение 2FA |
| `/api/auth/2fa/disable/confirm` | POST | Подтверждение отключения 2FA |
| `/api/auth/password-reset/request` | POST | Запрос на восстановление пароля |
| `/api/auth/password-reset/verify` | POST | Проверка кода восстановления |
| `/api/auth/password-reset/confirm` | POST | Установка нового пароля |
| `/api/auth/validateSession` | GET | Проверка сессии |
| `/api/auth/me` | GET | Получение текущего пользователя |
| `/api/auth/logout` | POST | Выход |
| `/api/auth/csrf` | GET | Получение CSRF-токена |

### Сессии и безопасность

**Хранение сессии:**
- Сессионный идентификатор хранится в **Redis**
- Session ID передаётся через **HTTP-only cookie**
- CSRF-токен требуется для state-changing операций (POST, PUT, DELETE, PATCH)

**2FA реализация:**
- Код отправляется на email
- Токены хранятся в БД (`two_factor_token`, `password_reset_token`)
- При включении/отключении 2FA требуется подтверждение паролем

**Frontend (auth.js):**
- CSRF-токен автоматически получается и прикрепляется к запросам
- Session error codes: `invalid_session`
- При ошибке сессии пользователь разлогинивается

### Граничные случаи:
- При регистрации пользователь получает статус `PENDING_VERIFICATION` до подтверждения email
- При логине с включенным 2FA возвращается `TwoFactorChallengeResponse` вместо `AuthResponse`
- Сессия продлевается при каждом запросе к `/api/auth/validateSession` и `/api/auth/me`

---

## 5. Frontend-навигация и основные экраны

### Карта экранов (App.jsx)

| Route | Экран | Доступ | Что делает | Backend API |
|-------|-------|--------|------------|-------------|
| `/` | OpportunitiesPage | Все | Каталог возможностей с фильтрами и картой | `GET /api/opportunities`, `GET /api/opportunities/map` |
| `/opportunities/:id` | OpportunityDetailPage | Все | Детальная страница возможности | `GET /api/opportunities/:id` |
| `/login` | Login | Все | Страница входа | `POST /api/auth/login` |
| `/register` | Register | Все | Страница регистрации | `POST /api/auth/register` |
| `/forgot-password` | ForgotPassword | Все | Восстановление пароля | `POST /api/auth/password-reset/*` |
| `/seeker` | SeekerDashboard | APPLICANT | Личный кабинет соискателя | `GET /api/profile/applicant/:id/workspace` |
| `/employer` | EmployerDashboard | EMPLOYER | Личный кабинет работодателя | `GET /api/employer/opportunities` |
| `/curator` | CuratorDashboard | CURATOR, ADMIN | Панель модерации | `GET /api/moderation/tasks` |
| `/admin/curators` | CuratorsAdminPage | ADMIN | Управление кураторами | `POST /api/admin/curators` |
| `/profile/edit` | ProfileEdit | APPLICANT, EMPLOYER | Редактирование профиля | `PATCH /api/profile/applicant`, `PATCH /api/profile/employer` |
| `/settings/security` | SecuritySettings | Все авторизованные | Настройки 2FA и пароля | `POST /api/auth/2fa/*` |
| `/seekers` | ApplicantSearchPage | Авторизованные | Поиск соискателей | `GET /api/profile/applicants` |
| `/seekers/:id` | ApplicantPublicProfile | Все | Публичный профиль соискателя | `GET /api/profile/applicant/:id` |
| `/employers/:id` | EmployerPublicProfile | Все | Публичный профиль работодателя | `GET /api/profile/employer/:id` |
| `/chats` | ChatsPage | APPLICANT, EMPLOYER | Список чатов | `GET /api/chats` |
| `/chats/:dialogId` | ChatsPage | APPLICANT, EMPLOYER | Конкретный чат | `GET /api/chats/:dialogId` + WebSocket |

### ProfileOnboardingGuard
Компонент-обёртка, который проверяет заполненность профиля пользователя и перенаправляет на `/profile/edit` если профиль не заполнен.

---

## 6. Профиль соискателя

### Backend реализация (`profile/controller/ProfileController.kt`, `profile/model/ApplicantProfile.kt`)

**Основные поля:**
- `first_name`, `last_name`, `middle_name` — ФИО
- `university_name`, `faculty_name`, `study_program` — учебное заведение
- `course`, `graduation_year` — курс и год выпуска
- `city_id` — город
- `about`, `resume_text` — о себе и резюме
- `portfolio_links`, `contact_links` — ссылки (JSONB)
- `profile_visibility`, `resume_visibility`, `applications_visibility`, `contacts_visibility` — настройки приватности
- `open_to_work`, `open_to_events` — готовность к работе и мероприятиям
- `moderation_status` — статус модерации (`DRAFT`, `PENDING_MODERATION`, `APPROVED`, `NEEDS_REVISION`)

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `PATCH /api/profile/applicant` | PATCH | Редактирование профиля |
| `POST /api/profile/applicant/moderation/submit` | POST | Отправка на модерацию |
| `GET /api/profile/applicant/:userId` | GET | Публичный профиль |
| `GET /api/profile/applicant/:userId/workspace` | GET | Workspace (полные данные для владельца) |
| `GET /api/profile/applicant/:userId/contacts` | GET | Контакты профиля |
| `GET /api/profile/applicant/:userId/applications` | GET | Отклики профиля |
| `GET /api/profile/applicants` | GET | Поиск соискателей |

### Файлы и медиа (`ApplicantProfileFileController.kt`, `ApplicantProfileAvatarController.kt`):
- `PUT /api/applicant/profile/avatar` — загрузка аватара
- `PUT /api/applicant/profile/resume-file` — загрузка резюме
- `POST /api/applicant/profile/portfolio/files` — загрузка файлов портфолио
- `DELETE /api/applicant/profile/files/:fileId` — удаление файла

### Frontend реализация:
- `ProfileEdit` — форма редактирования профиля
- `ApplicantPublicProfile` — публичный профиль
- `ApplicantSearchPage` — поиск соискателей

### Приватность:
- `profile_visibility`: `PRIVATE`, `AUTHENTICATED`, `PUBLIC`
- `resume_visibility`: `PRIVATE`, `AUTHENTICATED`, `PUBLIC`
- `applications_visibility`: `PRIVATE`, `AUTHENTICATED`, `PUBLIC`
- `contacts_visibility`: `PRIVATE`, `AUTHENTICATED`, `PUBLIC`

---

## 7. Профиль работодателя и компании

### Backend реализация (`profile/model/EmployerProfile.kt`)

**Основные поля:**
- `company_name`, `legal_name`, `inn` — данные компании
- `description`, `industry`, `company_size`, `founded_year` — информация о компании
- `website_url`, `social_links` — ссылки
- `public_contacts` — публичные контакты (JSONB)
- `city_id`, `location_id` — местоположение
- `verification_status` — статус верификации (`PENDING`, `APPROVED`, `REJECTED`, `REVOKED`)
- `moderation_status` — статус модерации (`DRAFT`, `PENDING_MODERATION`, `APPROVED`, `NEEDS_REVISION`)

### Статусы модерации профиля работодателя

| Статус | Когда устанавливается | Что может делать работодатель | Что видит frontend | Кто может изменить |
|--------|----------------------|------------------------------|-------------------|-------------------|
| `DRAFT` | При создании профиля | Редактировать профиль, отправлять на модерацию | Профиль не виден публично | Работодатель, куратор |
| `PENDING_MODERATION` | После отправки на модерацию | Ждать решения модератора | Профиль на проверке | Куратор (approve/reject/request-changes) |
| `APPROVED` | После одобрения куратором | Публиковать возможности | Профиль виден публично | Куратор (может вернуть на доработку) |
| `NEEDS_REVISION` | После возврата на доработку | Исправить замечания, отправить повторно | Профиль скрыт до исправлений | Работодатель (исправить), Куратор (одобрить) |

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `PATCH /api/profile/employer` | PATCH | Редактирование профиля |
| `PATCH /api/profile/employer/company` | PATCH | Редактирование данных компании |
| `POST /api/profile/employer/moderation/submit` | POST | Отправка на модерацию |
| `GET /api/profile/employer/:userId` | GET | Публичный профиль |
| `GET /api/profile/employer/:userId/workspace` | GET | Workspace (полные данные для владельца) |
| `PUT /api/employer/profile/logo` | PUT | Загрузка логотипа |
| `DELETE /api/employer/files/:fileId` | DELETE | Удаление файла |

### Frontend:
- `EmployerDashboard` — кабинет работодателя
- `EmployerPublicProfile` — публичный профиль
- Профиль считается "неполным" если не заполнены обязательные поля или не пройдена верификация

---

## 8. Верификация работодателя

### Backend реализация (`profile/controller/EmployerVerificationController.kt`, `profile/model/EmployerVerification.kt`)

**Способы верификации:**
1. **CORPORATE_EMAIL** — корпоративная email
2. **TIN** — ИНН (10 или 12 цифр)
3. **PROFESSIONAL_LINKS** — профессиональные ссылки (GitHub, LinkedIn и т.д.)
4. **MANUAL** — ручная верификация куратором

**Статусы верификации:**
- `PENDING` — ожидает проверки
- `APPROVED` — одобрено
- `REJECTED` — отклонено
- `REVOKED` — отозвано

### Процесс верификации:

1. Работодатель заполняет данные для верификации
2. Прикрепляет файлы-доказательства (скрины, документы)
3. Отправляет заявку через `POST /api/employer/verification`
4. Создаётся задача модерации типа `VERIFICATION_REVIEW`
5. Куратор рассматривает заявку
6. При approve — `verification_status` становится `APPROVED`
7. При reject/request-changes — работодатель видит комментарий и может исправить

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `POST /api/employer/verification` | POST | Создать заявку на верификацию |
| `POST /api/employer/verifications/:id/attachments` | POST | Прикрепить файлы |
| `DELETE /api/employer/verifications/:id/attachments/:attachmentId` | DELETE | Удалить вложение |
| `GET /api/employer/verification` | GET | Получить статус верификации |

### Frontend:
- Экран верификации в кабинете работодателя
- Пошаговый процесс: заполнение данных → загрузка файлов → отправка
- После отправки — ожидание решения модератора

---

## 9. Возможности: вакансии, стажировки, менторство, события

### Типы возможностей (`OpportunityType.kt`):
- `INTERNSHIP` — стажировка
- `VACANCY` — вакансия
- `MENTORING` — менторская программа
- `EVENT` — мероприятие (вебинар, хакатон и т.д.)

### Backend модель (`opportunity/dao/dto/OpportunityDto.kt`, migration V5):

**Основные поля:**
- `title`, `short_description`, `full_description`, `requirements`
- `company_name`, `type`, `work_format`, `employment_type`, `grade`
- `salary_from`, `salary_to`, `salary_currency`
- `published_at`, `expires_at`, `event_date` (для EVENT)
- `city_id`, `location_id` — местоположение
- `contact_info` — контактная информация (JSONB)
- `status` — статус возможности
- `moderation_comment` — комментарий модератора

**Связи:**
- `opportunity_tag` — теги возможности (N:M)
- `opportunity_resource_link` — внешние ссылки (ресурсы, отклики, регистрация)
- `opportunity_response` — отклики соискателей

### Форматы работы:
- `OFFICE` — офис
- `HYBRID` — гибрид
- `REMOTE` — удалённо
- `ONLINE` — онлайн (для мероприятий)

### Уровни позиций:
- `INTERN`, `JUNIOR`, `MIDDLE`, `SENIOR`

### Типы занятости:
- `FULL_TIME`, `PART_TIME`, `PROJECT`

---

## 10. Жизненный цикл возможности

### Статусы (`OpportunityStatus.kt`):

| Статус | Значение | Как попадает | Кто видит | Действия | Следующие статусы |
|--------|----------|--------------|-----------|----------|-------------------|
| `DRAFT` | Черновик | При создании | Только работодатель | Редактировать, отправить на модерацию, удалить | `PENDING_MODERATION` |
| `PENDING_MODERATION` | На модерации | После отправки | Работодатель, куратор | Ждать решения, отменить модерацию | `PUBLISHED`, `REJECTED` |
| `PUBLISHED` | Опубликовано | После одобрения модератором | Все | Просматривать, откликаться, закрыть, редактировать (с повторной модерацией) | `CLOSED`, `ARCHIVED` |
| `REJECTED` | Отклонено | После отклонения модератором | Работодатель | Исправить, отправить повторно | `PENDING_MODERATION`, `DRAFT` |
| `CLOSED` | Закрыто | Работодатель закрывает вакансию | Все (без откликов) | Открыть повторно, архивировать | `ARCHIVED`, `PUBLISHED` |
| `ARCHIVED` | В архиве | Работодатель архивирует | Только работодатель | Просматривать | - |
| `PLANNED` | Запланировано | Для будущих мероприятий | Все | Редактировать | `PUBLISHED` |

### Backend реализация:
- `EmployerOpportunityController.kt` — CRUD для работодателя
- `OpportunityController.kt` — публичный каталог
- `EmployerOpportunityModerationService.kt` — логика модерации

### Действия работодателя:
- `POST /api/employer/opportunities` — создать
- `PUT /api/employer/opportunities/:id` — обновить
- `POST /api/employer/opportunities/:id/close` — закрыть
- `POST /api/employer/opportunities/:id/archive` — архивировать
- `POST /api/employer/opportunities/:id/return-to-draft` — вернуть в черновики
- `POST /api/employer/opportunities/:id/moderation-task/cancel` — отменить модерацию

### Ограничения:
- Нельзя откликаться на `CLOSED`, `ARCHIVED`, `DRAFT`, `REJECTED` возможности
- Нельзя редактировать опубликованную возможность без повторной модерации
- Для публикации обязательна верификация компании

---

## 11. Каталог возможностей для соискателя

### Backend (`opportunity/controller/OpportunityController.kt`):

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `GET /api/opportunities` | GET | Список возможностей с фильтрами |
| `GET /api/opportunities/:id` | GET | Детальная страница |
| `GET /api/opportunities/map` | GET | Возможности для карты |
| `GET /api/opportunities/recommendations/personalized` | GET | Персонализированные рекомендации |
| `POST /api/opportunities/recommendations/resume-analysis` | POST | AI-анализ резюме для рекомендаций |

### Фильтры:
- `type` — тип возможности
- `workFormat` — формат работы
- `employmentType` — тип занятости
- `grade` — уровень позиции
- `cityId` — город
- `tagIds` — теги/навыки
- `search` — поиск по тексту
- `salaryFrom`, `salaryTo` — зарплатная вилка

### Frontend:
- `OpportunitiesPage` — каталог с фильтрами
- `OpportunityDetailPage` — детальная страница
- Отображение списком и на карте (Yandex Map API)

### Гео-поиск:
- `GET /api/geo/opportunities/nearby` — возможности рядом с указанной точкой
- Используется PostGIS для расчёта расстояний

---

## 12. Отклики на возможности

### Backend (`interaction/controller/InteractionController.kt`, `interaction/controller/EmployerResponseController.kt`):

**Модель отклика (`opportunity_response`):**
- `opportunity_id`, `applicant_user_id`
- `cover_letter` — сопроводительное письмо
- `resume_snapshot` — снимок резюме на момент отклика (JSONB)
- `resume_file_id` — файл резюме
- `status` — статус отклика
- `employer_comment` — комментарий работодателя
- `created_at`, `responded_at`

**Статусы отклика:**
- `SUBMITTED` — отправлен
- `IN_REVIEW` — на рассмотрении
- `ACCEPTED` — принят
- `REJECTED` — отклонён
- `RESERVE` — в резерве
- `WITHDRAWN` — отозван

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `POST /api/interaction/responses` | POST | Создать отклик |
| `PATCH /api/interaction/responses/:id/status` | PATCH | Обновить статус (работодатель) |
| `GET /api/interaction/responses/my` | GET | Мои отклики (соискатель) |
| `GET /api/employer/responses` | GET | Отклики на вакансии работодателя |

### Ограничения:
- Один отклик на возможность от одного соискателя (уникальность по `opportunity_id + applicant_user_id`)
- Нельзя откликаться на `CLOSED`, `ARCHIVED`, `DRAFT`, `REJECTED` возможности
- При создании отклика автоматически создаётся чат-диалог

---

## 13. Избранное

### Backend (`interaction/model/Favorite.kt`):

**Модель избранного:**
- `user_id` — кто добавил
- `target_type` — тип цели (`OPPORTUNITY`, `EMPLOYER`)
- `opportunity_id` — ID возможности (если target_type = OPPORTUNITY)
- `employer_user_id` — ID работодателя (если target_type = EMPLOYER)

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `POST /api/interaction/favorites/opportunities/:id` | POST | Добавить возможность в избранное |
| `DELETE /api/interaction/favorites/opportunities/:id` | DELETE | Удалить возможность из избранного |
| `POST /api/interaction/favorites/employers/:id` | POST | Добавить работодателя в избранное |
| `DELETE /api/interaction/favorites/employers/:id` | DELETE | Удалить работодателя из избранного |
| `GET /api/interaction/favorites` | GET | Список избранного |

### Frontend:
- Для гостей избранное хранится в localStorage
- При авторизации происходит миграция гостевых закладок в аккаунт

---

## 14. Контакты и взаимодействие пользователей

### Backend (`interaction/model/ApplicantContact.kt`):

**Модель контакта:**
- `user_low_id`, `user_high_id` — ID соискателей (низкий и высокий для уникальности)
- `initiated_by_user_id` — кто инициировал
- `status` — статус контакта
- `note` — заметка

**Статусы контактов:**
- `PENDING` — ожидает подтверждения
- `ACCEPTED` — подтверждён
- `DECLINED` — отклонён
- `BLOCKED` — заблокирован

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `POST /api/interaction/contacts` | POST | Добавить контакт |
| `PATCH /api/interaction/contacts/:id/accept` | PATCH | Принять контакт |
| `PATCH /api/interaction/contacts/:id/decline` | PATCH | Отклонить контакт |
| `DELETE /api/interaction/contacts/:id` | DELETE | Удалить контакт |
| `GET /api/interaction/contacts` | GET | Список контактов |

---

## 15. Рекомендации пользователей

### Backend (`interaction/model/ContactRecommendation.kt`):

**Модель рекомендации:**
- `opportunity_id` — возможность, по которой оставлена рекомендация
- `from_applicant_user_id` — кто оставил
- `to_applicant_user_id` — кому
- `message` — текст рекомендации

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `POST /api/interaction/recommendations` | POST | Создать рекомендацию |
| `GET /api/interaction/recommendations/incoming` | GET | Входящие рекомендации |
| `GET /api/interaction/recommendations/outgoing` | GET | Исходящие рекомендации |
| `PATCH /api/interaction/recommendations/:id/status` | PATCH | Обновить статус |
| `DELETE /api/interaction/recommendations/:id` | DELETE | Удалить рекомендацию |

### Ограничения:
- Только соискатели могут создавать и управлять рекомендациями
- Нельзя создать рекомендацию самому себе

---

## 16. Чаты и WebSocket/STOMP

### Backend реализация (`interaction/chat/`):

**REST API (`ChatController.kt`):**
- `POST /api/chats/by-response/:responseId/ensure` — создать/получить чат по отклику
- `GET /api/chats` — список диалогов
- `GET /api/chats/:dialogId` — конкретный диалог
- `GET /api/chats/:dialogId/messages` — сообщения диалога
- `POST /api/chats/:dialogId/messages` — отправить сообщение
- `POST /api/chats/:dialogId/attachments` — отправить файл
- `PATCH /api/chats/:dialogId/messages/:messageId` — редактировать сообщение
- `POST /api/chats/:dialogId/messages/:messageId/delete-for-me` — удалить для себя
- `POST /api/chats/:dialogId/messages/:messageId/delete-for-everyone` — удалить для всех
- `POST /api/chats/:dialogId/read` — отметить прочитанным
- `POST /api/chats/:dialogId/archive` — архивировать чат

**WebSocket (`ChatWebSocketController.kt`):**
- Endpoint: `/api/chats/ws` (STOMP over WebSocket)
- Destinations:
  - `/app/chat.send` — отправка сообщения
  - `/user/queue/chat/:dialogId` — получение сообщений

**Модели:**
- `chat_dialog` — диалог, привязанный к отклику
- `chat_message` — сообщения
- `chat_participant_state` — состояние прочтения для каждого участника

### Frontend:
- `ChatsPage.jsx` — страница чатов
- `shared/api/chats.js` — API клиент
- `@stomp/stompjs` — STOMP клиент
- Автоматический reconnect при обрыве соединения

### CORS/WebSocket настройки:
```env
CHAT_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,https://localhost:*,http://127.0.0.1:*,https://127.0.0.1:*
```

---

## 17. Модерация

### Backend (`moderation/controller/ModerationController.kt`):

**Типы задач модерации (`ModerationTaskType.kt`):**
- `PROFILE_REVIEW` — модерация профиля соискателя
- `COMPANY_REVIEW` — модерация профиля компании
- `VERIFICATION_REVIEW` — верификация компании
- `OPPORTUNITY_REVIEW` — модерация возможности
- `TAG_REVIEW` — модерация тегов
- `CONTENT_REVIEW` — модерация контента

**Статусы задач (`ModerationTaskStatus.kt`):**
- `OPEN` — открыта
- `IN_PROGRESS` — в работе
- `APPROVED` — одобрена
- `REJECTED` — отклонена
- `NEEDS_REVISION` — требует доработки
- `CANCELLED` — отменена

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `GET /api/moderation/dashboard` | GET | Dashboard с метриками |
| `GET /api/moderation/tasks` | GET | Список задач с фильтрами |
| `GET /api/moderation/tasks/:id` | GET | Детальная задача |
| `POST /api/moderation/tasks/manual` | POST | Создать ручную задачу |
| `POST /api/moderation/tasks/:id/assign` | POST | Назначить задачу |
| `POST /api/moderation/tasks/:id/approve` | POST | Одобрить |
| `POST /api/moderation/tasks/:id/reject` | POST | Отклонить |
| `POST /api/moderation/tasks/:id/request-changes` | POST | Вернуть на доработку |
| `POST /api/moderation/tasks/:id/comment` | POST | Добавить комментарий |
| `POST /api/moderation/tasks/:id/cancel` | POST | Отменить задачу |
| `GET /api/moderation/entities/:type/:id/history` | GET | История сущности |
| `POST /api/moderation/tasks/:id/attachments` | POST | Прикрепить файл |
| `DELETE /api/moderation/tasks/:id/attachments/:id` | DELETE | Удалить вложение |

### AI-модерация:
- Интеграция с YandexGPT через `moderation/ai/`
- Автоматический анализ контента на нарушения
- Предложения для куратора

### Таблица типов задач:

| Тип задачи | Сущность | Когда создаётся | Решения | Что меняется |
|------------|----------|-----------------|---------|--------------|
| `PROFILE_REVIEW` | ApplicantProfile | При отправке соискателем | approve/reject/request-changes | `moderation_status` профиля |
| `COMPANY_REVIEW` | EmployerProfile | При отправке работодателем | approve/reject/request-changes | `moderation_status` профиля |
| `VERIFICATION_REVIEW` | EmployerVerification | При создании заявки на верификацию | approve/reject | `verification_status` |
| `OPPORTUNITY_REVIEW` | Opportunity | При отправке возможности | approve/reject/request-changes | `status` возможности |
| `TAG_REVIEW` | Tag | При создании тега | approve/reject | `status` тега |

---

## 18. Администрирование кураторов

### Backend (`auth/controller/AdminController.kt`):

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `POST /api/admin/curators` | POST | Создать куратора |
| `GET /api/admin/curators` | GET | Список кураторов |

### Frontend:
- `/admin/curators` — страница управления кураторами
- Доступно только роли `ADMIN`

---

## 19. Теги и AI-функции

### Теги (`opportunity/model/Tag.kt`):

**Категории тегов (`TagCategory.kt`):**
- `SKILL` — навыки
- `INTEREST` — интересы
- `SPECIALIZATION` — специализации

**Статусы тегов:**
- `PENDING` — ожидает модерации
- `APPROVED` — одобрен
- `REJECTED` — отклонён

### AI-функции (`opportunity/ai/`):

**Генерация описаний:**
- `POST /api/employer/opportunities/ai/generate-description` — генерация описания вакансии
- Используется YandexGPT

**Подбор тегов:**
- `POST /api/employer/opportunities/ai/suggest-tags` — AI-предложения тегов

**Анализ резюме:**
- `POST /api/opportunities/recommendations/resume-analysis` — анализ резюме для рекомендаций
- Возвращает detected skills, suggested tags, strengths, improvement tips

### Frontend:
- Кнопки "Сгенерировать AI" в формах
- Отображение предложенных тегов с возможностью редактирования

---

## 20. География и карта

### Backend (`geo/controller/GeoController.kt`):

**Модели:**
- `city` — справочник городов (с PostGIS координатами)
- `location` — конкретные адреса
- `geo_reference` — привязка сущностей к гео-точкам

### API endpoint'ы:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `GET /api/geo/cities` | GET | Поиск городов |
| `GET /api/geo/opportunities/nearby` | GET | Возможности рядом с точкой |
| `GET /api/geo/address/suggest` | GET | Подсказки адресов (DaData) |
| `POST /api/geo/address/resolve` | POST | Гео-кодирование адреса |

### PostGIS:
- Координаты хранятся в `city.point` (тип `geometry(Point, 4326)`)
- Поиск nearby использует `ST_DWithin` для расчёта расстояний

### Frontend:
- Yandex Map API для отображения карты
- Фильтр "радиус поиска" для гео-поиска

---

## 21. Файлы, медиа и S3

### Backend (`media/`, `commons/model/file/`):

**Модели:**
- `file_asset` — файл в S3
- `file_attachment` — привязка файла к сущности

**Статусы файлов:**
- `UPLOADING` — загрузка
- `READY` — готов
- `DELETED` — удалён
- `FAILED` — ошибка

**Типы сущностей для вложений:**
- `APPLICANT_PROFILE`, `EMPLOYER_PROFILE`
- `EMPLOYER_VERIFICATION`, `OPPORTUNITY`
- `OPPORTUNITY_RESPONSE`, `MODERATION_TASK`
- `CHAT_MESSAGE`

### API endpoint'ы:
- `POST /internal/files/upload` — загрузка (internal)
- `GET /internal/files/:id/download-url` — URL для скачивания
- `DELETE /internal/files/:id` — удаление

### Frontend:
- Загрузка через FormData
- Получение download URL через API
- Отображение аватаров, логотипов, резюме, вложений

---

## 22. Уведомления и email

### Backend (`notification/`):

**События для уведомлений:**
- Регистрация (код подтверждения)
- 2FA (код входа, включения/отключения)
- Восстановление пароля
- Отклики на вакансии
- Сообщения в чатах
- Задачи модерации

### SMTP настройки:
```env
SMTP_HOST=...
SMTP_PORT=...
SMTP_USERNAME=...
SMTP_PASSWORD=...
```

---

## 23. База данных и миграции

### Основные таблицы (41 миграция):

| Таблица | Модуль | Назначение |
|---------|--------|------------|
| `users` | auth | Пользователи с ролями |
| `applicant_profile` | profile | Профили соискателей |
| `employer_profile` | profile | Профили работодателей |
| `employer_verification` | profile | Верификации компаний |
| `opportunity` | opportunity | Возможности |
| `opportunity_response` | interaction | Отклики |
| `chat_dialog`, `chat_message` | interaction | Чаты |
| `moderation_task`, `moderation_log` | moderation | Модерация |
| `file_asset`, `file_attachment` | media | Файлы |
| `city`, `location` | geo | Гео-справочники |
| `tag`, `opportunity_tag` | opportunity | Теги |
| `favorite` | interaction | Избранное |
| `applicant_contact` | interaction | Контакты соискателей |
| `contact_recommendation` | interaction | Рекомендации |

### Ключевые связи:
- `opportunity.employer_user_id` → `employer_profile.user_id`
- `opportunity_response.opportunity_id` → `opportunity.id`
- `chat_dialog.opportunity_response_id` → `opportunity_response.id`
- `moderation_task.entity_type/entity_id` — полиморфная связь

---

## 24. Межсервисные взаимодействия

### Feign clients:

| Источник | Целевой сервис | Для чего | Реализация |
|----------|----------------|----------|------------|
| profile | auth | Проверка сессий | `AuthClient.kt` |
| profile | moderation | Создание задач | `ModerationClient.kt` |
| profile | media | Загрузка файлов | `MediaClient.kt` |
| opportunity | auth | Проверка сессий | `AuthClient.kt` |
| opportunity | profile | Получение данных работодателя | `ProfileClient.kt` |
| opportunity | moderation | Создание задач | `ModerationClient.kt` |
| opportunity | media | Загрузка файлов | `MediaClient.kt` |
| moderation | auth | Проверка сессий | `AuthClient.kt` |
| moderation | profile | Данные профилей | `ProfileClient.kt` |
| moderation | opportunity | Данные возможностей | `OpportunityClient.kt` |
| moderation | media | Вложения | `MediaClient.kt` |
| interaction | auth | Проверка сессий | `AuthClient.kt` |
| interaction | profile | Данные профилей | `ProfileClient.kt` |
| interaction | opportunity | Данные возможностей | `OpportunityClient.kt` |
| geo | auth | Проверка сессий | `AuthClient.kt` |

---

## 25. Ошибки, валидация и ограничения

### Глобальная обработка ошибок:
- `@Validated` на контроллерах
- Business exceptions с кодами ошибок
- Проверки `userId > 0` через `@Positive`

### Типовые проверки:
- Владелец сущности (только автор может редактировать)
- Роль пользователя (только работодатель может создавать вакансии)
- Статус сущности (нельзя откликаться на закрытую вакансию)

### Frontend обработка ошибок:
- Перевод кодов ошибок через `statusLabels.js`
- Отображение toast-уведомлений
- Retry logic для сетевых ошибок

---

## 26. Локальный запуск и окружение

### Backend:
```bash
cd server
mvn clean package -DskipTests
docker compose up --build
```

### Frontend:
```bash
cd frontend
npm install
npm start
```

### Переменные окружения:
```env
# PostgreSQL
POSTGRES_DB=tramplin
POSTGRES_USER=tramplin_adm
POSTGRES_PASSWORD=tramplin_adm

# Redis
REDIS_PASSWORD=tramplin_token

# S3
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# SMTP
SMTP_HOST=...
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...

# WebSocket
CHAT_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*

# YandexGPT (AI)
YANDEX_GPT_API_KEY=...

# DaData (гео)
DADATA_API_KEY=...
```

---

## 27. Полные пользовательские сценарии

### 27.1 Соискатель регистрируется и откликается

1. Регистрация: `POST /api/auth/register` → код на email
2. Подтверждение: `POST /api/auth/register/confirm` → сессия
3. Заполнение профиля: `/profile/edit` → `PATCH /api/profile/applicant`
4. Поиск вакансий: `/` → `GET /api/opportunities`
5. Детальная страница: `/opportunities/:id` → `GET /api/opportunities/:id`
6. Отклик: кнопка "Откликнуться" → `POST /api/interaction/responses`
7. Чат с работодателем: автоматически создаётся диалог

### 27.2 Работодатель регистрируется и публикует возможность

1. Регистрация как EMPLOYER
2. Заполнение профиля компании: `PATCH /api/profile/employer/company`
3. Верификация: `POST /api/employer/verification` + файлы
4. Ожидание: `verification_status` = `PENDING` → `APPROVED`
5. Создание возможности: `POST /api/employer/opportunities`
6. Отправка на модерацию: статус → `PENDING_MODERATION`
7. Модерация куратором: `approve` → статус → `PUBLISHED`

### 27.3 Куратор обрабатывает задачу модерации

1. Dashboard: `GET /api/moderation/dashboard`
2. Список задач: `GET /api/moderation/tasks`
3. Детальная задача: `GET /api/moderation/tasks/:id`
4. Назначение: `POST /api/moderation/tasks/:id/assign`
5. Проверка данных + вложений
6. Решение: `approve` / `reject` / `request-changes`
7. Комментарий: `POST /api/moderation/tasks/:id/comment`

### 27.4 Работодатель проходит верификацию

1. Выбор способа: email / ИНН / ссылки
2. Заполнение данных
3. Загрузка файлов-доказательств
4. Отправка: создаётся задача `VERIFICATION_REVIEW`
5. Куратор проверяет
6. Результат:
   - `APPROVED` → можно публиковать вакансии
   - `REJECTED` → комментарий, можно исправить
   - `NEEDS_REVISION` → исправить и отправить повторно

### 27.5 Соискатель и работодатель общаются в чате

1. Соискатель откликается на вакансию
2. Автоматически создаётся `chat_dialog`
3. REST: `GET /api/chats/by-response/:responseId/ensure`
4. WebSocket: подключение к `/api/chats/ws`
5. Подписка: `/user/queue/chat/:dialogId`
6. Отправка: `/app/chat.send` или REST `POST /api/chats/:dialogId/messages`
7. Прочитано: `POST /api/chats/:dialogId/read`

### 27.6 AI помогает создать возможность

1. Работодатель вводит заголовок и краткое описание
2. Нажимает "Сгенерировать AI"
3. `POST /api/employer/opportunities/ai/generate-description`
4. YandexGPT возвращает полное описание
5. "Подобрать теги": `POST /api/employer/opportunities/ai/suggest-tags`
6. AI предлагает теги → работодатель выбирает
7. Отправка на модерацию

---

## 28. Что важно знать разработчику

### Бизнес-логика:
- Основная логика в сервисах (`*Service.kt`), не в контроллерах
- Статусы сущностей нельзя менять напрямую — только через методы сервиса
- Проверки владельца через `@CurrentUser` + сравнение `userId`

### Критичные места:
- Модерация: нельзя публиковать без `APPROVED` статуса
- Верификация: без `APPROVED` нельзя создавать возможности
- Чаты: диалог привязан к отклику, нельзя создать вручную
- Гео-поиск: PostGIS требует правильной SRID (4326)

### Межсервисные зависимости:
- `profile` зависит от `auth`, `moderation`, `media`
- `opportunity` зависит от `profile`, `moderation`, `media`
- `moderation` — центральный хаб для проверок контента

### Frontend нюансы:
- CSRF-токен автоматически прикрепляется к mutating-запросам
- Сессия хранится в cookie, не в localStorage
- ProtectedRoute проверяет роль до рендера компонента

---

## 29. Быстрый справочник

### Роли
| Роль | Назначение | Основные экраны |
|------|------------|-----------------|
| `APPLICANT` | Соискатель | `/seeker`, `/profile/edit`, `/opportunities` |
| `EMPLOYER` | Работодатель | `/employer`, `/profile/edit`, `/employer/opportunities` |
| `CURATOR` | Модератор | `/curator`, `/moderation/tasks` |
| `ADMIN` | Администратор | `/curator`, `/admin/curators` |

### Статусы возможностей
| Статус | Значение |
|--------|----------|
| `DRAFT` | Черновик |
| `PENDING_MODERATION` | На модерации |
| `PUBLISHED` | Опубликовано |
| `REJECTED` | Отклонено |
| `CLOSED` | Закрыто |
| `ARCHIVED` | В архиве |
| `PLANNED` | Запланировано |

### Типы возможностей
| Тип | Значение |
|-----|----------|
| `INTERNSHIP` | Стажировка |
| `VACANCY` | Вакансия |
| `MENTORING` | Менторская программа |
| `EVENT` | Мероприятие |

### Статусы модерации работодателя
| Статус | Значение |
|--------|----------|
| `DRAFT` | Черновик |
| `PENDING_MODERATION` | На модерации |
| `APPROVED` | Одобрено |
| `NEEDS_REVISION` | Требует доработки |

### Статусы верификации работодателя
| Статус | Значение |
|--------|----------|
| `PENDING` | Ожидает проверки |
| `APPROVED` | Верифицирован |
| `REJECTED` | Отклонено |
| `REVOKED` | Отозвано |

### Типы задач модерации
| Тип | Значение |
|-----|----------|
| `PROFILE_REVIEW` | Профиль соискателя |
| `COMPANY_REVIEW` | Профиль компании |
| `VERIFICATION_REVIEW` | Верификация компании |
| `OPPORTUNITY_REVIEW` | Возможность |
| `TAG_REVIEW` | Теги |
| `CONTENT_REVIEW` | Контент |

### Основные frontend routes
| Route | Назначение |
|-------|------------|
| `/` | Каталог возможностей |
| `/opportunities/:id` | Детальная возможность |
| `/login`, `/register` | Авторизация |
| `/seeker` | Кабинет соискателя |
| `/employer` | Кабинет работодателя |
| `/curator` | Панель модерации |
| `/profile/edit` | Редактирование профиля |
| `/chats/:dialogId` | Чат |

### Основные backend services/modules
| Service/module | Назначение |
|----------------|------------|
| `auth` | Аутентификация, 2FA, сессии |
| `profile` | Профили, верификация |
| `opportunity` | Вакансии, теги, AI |
| `moderation` | Модерация контента |
| `interaction` | Отклики, чаты, контакты |
| `geo` | Гео-поиск, DaData |
| `media` | S3 файлы |
