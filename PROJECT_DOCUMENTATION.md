# SecureCode AI — Complete Project Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Backend: securecode-platform](#3-backend-securecode-platform)
4. [Frontend: securecode-web](#4-frontend-securecode-web)
5. [Database & Infrastructure](#5-database--infrastructure)
6. [Authentication & Security Flow](#6-authentication--security-flow)
7. [API Reference](#7-api-reference)
8. [Error Handling](#8-error-handling)
9. [Testing](#9-testing)
10. [All Changes Made (Changelog)](#10-all-changes-made-changelog)
11. [How to Run](#11-how-to-run)

---

## 1. Project Overview

SecureCode AI is an **enterprise coding assessment platform** — a multi-tenant SaaS application where organizations can create coding assessments, proctor exams, execute code in sandboxes, and generate reports. The platform uses a microservices architecture with 8 backend services and a React SPA frontend.

**Current State:** Only the `identity-service` (authentication/authorization) and `common` (shared library) modules are fully implemented. The other 6 services are stubs with placeholder `Application` classes. The frontend has login, register, and dashboard pages.

---

## 2. Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                            │
│                  http://localhost:5173                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (CORS enabled)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (securecode-web)                      │
│  React 18 + Vite + TypeScript + TailwindCSS + Zustand           │
│  Port: 5173                                                     │
│  - LoginPage, RegisterPage, DashboardPage                       │
│  - useAuthStore (Zustand) — tokens, user state                  │
│  - api.ts — fetch wrapper with JWT bearer auth                  │
│  - Toaster — portal-based toast notifications                   │
│  - AppShell — sidebar + topnav layout                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              API GATEWAY (api-gateway) [STUB]                    │
│  Spring Cloud Gateway — not yet implemented                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  identity    │ │ assessment   │ │ execution    │
│  -service    │ │ -service     │ │ -service     │
│  [COMPLETE]  │ │ [STUB]       │ │ [STUB]       │
│  Port: 8081  │ │              │ │              │
└──────┬───────┘ └──────────────┘ └──────────────┘
       │
       ├── PostgreSQL (port 5432) — primary database
       ├── Redis (port 6379) — session/cache store
       └── Flyway — database migrations

Other stubs: proctoring-service, reporting-service, notification-service
```

### Tech Stack Summary

| Layer         | Technology                                                    |
|---------------|--------------------------------------------------------------|
| Frontend      | React 18, Vite 5, TypeScript 5, TailwindCSS 3, Zustand 4    |
| Backend       | Spring Boot 3.3.4, Java 21, Spring Security, Spring Data JPA|
| Database      | PostgreSQL 16 (prod), H2 in-memory (test/dev)               |
| Cache         | Redis 7                                                      |
| Migrations    | Flyway 10                                                    |
| Auth          | JWT (jjwt 0.12.6, HS512), Argon2id (Bouncy Castle 1.78.1)   |
| Testing       | JUnit 5, MockMvc, Vitest, React Testing Library             |
| Build         | Maven 3.9 (backend), npm/Vite (frontend)                    |

---

## 3. Backend: securecode-platform

### 3.1 Module Structure

```
securecode-platform/                 (parent pom, Java 21, Spring Boot 3.3.4)
├── pom.xml                          Parent POM with dependency management
├── common/                          Shared library (jar) — used by all services
│   └── src/main/java/ai/securecode/common/
│       ├── audit/                   Hash-chained audit log (AuditHashChain, AuditLogAppender, AuditLogEntry, AuditLogReader)
│       ├── dto/                     ApiErrorResponse — standard error envelope { error: { code, message, field, requestId } }
│       ├── exception/               ApiException, AbstractApiExceptionHandler, ValidationException, ResourceNotFoundException, ForbiddenOperationException, DesktopClientRequiredException
│       ├── proctoring/              CapabilityBoundary — proctoring capability definitions
│       └── security/                TenantContext, TenantContextHolder — multi-tenant context from JWT
│
├── identity-service/                [FULLY IMPLEMENTED] Auth service
│   ├── pom.xml                      Dependencies: web, JPA, security, validation, Redis, actuator, Flyway, PostgreSQL, JWT, Bouncy Castle, H2, Testcontainers
│   └── src/
│       ├── main/java/ai/securecode/identity/
│       │   ├── IdentityServiceApplication.java    Spring Boot entry point
│       │   ├── config/
│       │   │   ├── SecurityConfig.java            Spring Security filter chain + CORS
│       │   │   ├── Argon2PasswordEncoder.java     Argon2id password hashing (Bouncy Castle)
│       │   │   ├── IdentityExceptionHandler.java  @RestControllerAdvice extending AbstractApiExceptionHandler
│       │   │   └── RoleSeeder.java                Seeds 8 roles on startup (ApplicationRunner)
│       │   ├── controller/
│       │   │   └── AuthController.java            POST /register, /login, /refresh
│       │   ├── dto/
│       │   │   ├── RegisterRequest.java           record(email, password, orgName, role) with validation
│       │   │   ├── LoginRequest.java              record(orgId:UUID, email, password) with validation
│       │   │   ├── RefreshTokenRequest.java       record(refreshToken)
│       │   │   └── AuthResponse.java              record(accessToken, refreshToken, tokenType, expiresIn, userId, orgId, email, roles)
│       │   ├── entity/
│       │   │   ├── Organization.java              UUID id, parentOrgId, name, tier, dataResidency, status, timestamps
│       │   │   ├── AppUser.java                   UUID id, orgId, email, passwordHash, mfaEnabled, mfaSecret, status, timestamps
│       │   │   ├── Role.java                      Short id (IDENTITY), code (unique)
│       │   │   ├── UserRole.java                  Composite key (@IdClass): userId, roleId, orgId
│       │   │   └── UserRoleId.java                Serializable composite key class
│       │   ├── repository/
│       │   │   ├── OrganizationRepository.java    JpaRepository<Organization, UUID>
│       │   │   ├── AppUserRepository.java         findByOrgIdAndEmailAndDeletedAtIsNull(UUID, String)
│       │   │   ├── RoleRepository.java            findByCode(String) → Role or null
│       │   │   └── UserRoleRepository.java        Custom @Repository with EntityManager, native SQL findRoleCodesByUserId
│       │   ├── security/
│       │   │   └── JwtService.java                HS512 JWT generation/parsing, access (15min) + refresh (7day) tokens
│       │   └── service/
│       │       └── AuthService.java               register(), login(), refresh() business logic
│       ├── main/resources/
│       │   ├── application.yml                    Port 8081, PostgreSQL, Redis, JWT config, Flyway
│       │   └── db/migration/
│       │       └── V1__init_identity_schema.sql   PostgreSQL DDL + role seed data + audit log triggers
│       └── test/
│           ├── java/ai/securecode/identity/
│           │   ├── AuthIntegrationTest.java       10 tests: register, login, refresh, validation, error cases
│           │   ├── config/Argon2PasswordEncoderTest.java   7 tests: encode, matches, edge cases
│           │   └── security/JwtServiceTest.java   7 tests: token generation, parsing, validation
│           └── resources/
│               └── application-test.yml           H2 in-memory, Flyway disabled, create-drop
│
├── api-gateway/                     [STUB] Spring Cloud Gateway
├── assessment-service/              [STUB] Assessment management
├── execution-service/               [STUB] Code execution sandboxing
├── proctoring-service/              [STUB] Exam proctoring/monitoring
├── reporting-service/               [STUB] Analytics and reports
└── notification-service/            [STUB] Email/push notifications
```

### 3.2 Identity Service — Deep Dive

#### SecurityConfig
```java
// Spring Security filter chain:
// 1. CORS enabled with allowedOriginPatterns("*"), all methods, credentials
// 2. CSRF disabled (stateless API)
// 3. Session: STATELESS (no server-side sessions)
// 4. Public endpoints: /api/v1/auth/**, /actuator/**
// 5. All other endpoints: require authentication
```

#### JwtService
- **Algorithm:** HS512 (HMAC-SHA512)
- **Secret:** Base64-encoded key from `securecode.jwt.secret` config
- **Access Token:** 15-minute TTL, contains `sub` (userId), `org_id`, `email`, `roles`, `type=access`
- **Refresh Token:** 7-day TTL, contains `sub` (userId), `org_id`, `type=refresh`
- **Validation:** Signature verification + expiration check + token type check

#### Argon2PasswordEncoder
- **Algorithm:** Argon2id (Bouncy Castle `Argon2BytesGenerator`)
- **Parameters:** 3 iterations, 65536 KB (64 MB) memory, 1 parallelism, 32-byte hash, 16-byte salt
- **Encoded format:** `$argon2id$v=19$m=65536,t=3,p=1$<base64-salt>$<base64-hash>`
- **Bug fixed:** Split by `$` produces 6 parts (including empty first element), not 5. Indices adjusted from [2,3,4] to [3,4,5].
- **Bug fixed:** `hash(password, salt)` convenience method was passing (MEMORY, ITERATIONS) as (iterations, memory) — swapped. Fixed to pass (ITERATIONS, MEMORY).

#### AuthService — Business Logic

**register(RegisterRequest):**
1. Create `Organization` entity with name + status="active", save to DB
2. Create `AppUser` with orgId, email, Argon2id-hashed password, status="active", save to DB
3. Look up `Role` by code (e.g., "ORG_ADMIN") — throws `ROLE_NOT_FOUND` if not found
4. Create `UserRole` mapping (userId, roleId, orgId), save to DB
5. Generate JWT access token (with userId, orgId, email, roles) + refresh token
6. Return `AuthResponse` with both tokens, user info, and roles

**login(LoginRequest):**
1. Find user by `(orgId, email)` where `deleted_at IS NULL` — throws `INVALID_CREDENTIALS` if not found
2. Verify password with `Argon2PasswordEncoder.matches(rawPassword, storedHash)` — throws `INVALID_CREDENTIALS` if mismatch
3. Check user status is "active" — throws `ACCOUNT_DISABLED` if not
4. Fetch user's role codes via native SQL: `SELECT r.code FROM user_role ur JOIN role r ON r.id = ur.role_id WHERE ur.user_id = :userId`
5. Generate new access + refresh tokens
6. Return `AuthResponse`

**refresh(RefreshTokenRequest):**
1. Parse and validate JWT signature — throws `INVALID_TOKEN` if invalid
2. Check token type is "refresh" (not "access") — throws `INVALID_TOKEN` if wrong type
3. Extract userId and orgId from claims
4. Look up user by userId — throws `USER_NOT_FOUND` if not found
5. Fetch current roles
6. Generate new access + refresh tokens (token rotation)
7. Return `AuthResponse`

#### RoleSeeder
- `ApplicationRunner` bean that runs on application startup
- Seeds 8 roles: SUPER_ADMIN, ORG_ADMIN, RECRUITER, FACULTY, INVIGILATOR, CANDIDATE, EVALUATOR, AUDITOR
- Checks if role already exists before inserting (idempotent)

#### Data Model (ERD)

```
┌──────────────────────┐       ┌──────────────────────┐
│    organization      │       │       app_user        │
├──────────────────────┤       ├──────────────────────┤
│ id (UUID, PK)        │◄──┐   │ id (UUID, PK)        │
│ parent_org_id (UUID) │   │   │ org_id (UUID, FK)────┘
│ name (VARCHAR)       │   │   │ email (VARCHAR)      │
│ tier (VARCHAR)       │   │   │ password_hash (TEXT)  │
│ data_residency       │   │   │ mfa_enabled (BOOL)    │
│ status (VARCHAR)     │   │   │ mfa_secret (TEXT)     │
│ created_at           │   │   │ status (VARCHAR)      │
│ updated_at           │   │   │ created_at            │
│ deleted_at           │   │   │ updated_at            │
└──────────────────────┘   │   │ deleted_at            │
                           │   └──────────────────────┘
                           │            │
                           │            │
┌──────────────────────┐   │   ┌──────────────────────┐
│       role           │   │   │      user_role        │
├──────────────────────┤   │   ├──────────────────────┤
│ id (SMALLINT, PK)    │◄──┼───│ role_id (SMALLINT)    │
│ code (VARCHAR, UNIQUE)│  │   │ user_id (UUID)────────┘
└──────────────────────┘   │   │ org_id (UUID)─────────┘
                           │   │ PK(user_id,role_id,   │
                           │   │    org_id)            │
                           │   └──────────────────────┘
                           │
┌──────────────────────┐   │
│     audit_log        │   │
├──────────────────────┤   │
│ id (BIGSERIAL, PK)   │   │
│ org_id (UUID)────────┘   │
│ actor_user_id (UUID)     │
│ action (VARCHAR)         │
│ entity_type (VARCHAR)    │
│ entity_id (UUID)         │
│ prev_hash (CHAR(64))     │
│ entry_hash (CHAR(64))    │
│ created_at (TIMESTAMPTZ) │
└──────────────────────┘
  Triggers: NO UPDATE, NO DELETE (append-only)
```

---

## 4. Frontend: securecode-web

### 4.1 File Structure

```
securecode-web/
├── package.json              React 18, Vite 5, Zustand 4, React Router 6, TailwindCSS 3
├── vite.config.ts            Port 5173, proxy /v1 → localhost:8080, Vitest config
├── tailwind.config.ts        Glassmorphism design tokens
├── tsconfig.json
└── src/
    ├── main.tsx              React entry point
    ├── App.tsx               Router with protected routes + Toaster
    ├── index.css             Global styles
    ├── pages/
    │   ├── LoginPage.tsx         Login form (orgId, email, password)
    │   ├── RegisterPage.tsx      Register form (email, password, orgName, role select)
    │   └── DashboardPage.tsx     Shows orgId, email, roles in glass cards
    ├── stores/
    │   └── useAuthStore.ts       Zustand store: login, register, refresh, logout, restore
    ├── lib/
    │   ├── api.ts                HTTP client with JWT bearer auth + error parsing
    │   └── cn.ts                 className utility (clsx + tailwind-merge)
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx      Sidebar + TopNav wrapper
    │   │   ├── Sidebar.tsx       Left nav with NavLink routing
    │   │   └── TopNav.tsx        Top bar with email + logout button
    │   └── ui/
    │       ├── GlassCard.tsx     Glassmorphism card container
    │       ├── GlassButton.tsx   Button with variants (primary, ghost)
    │       ├── GlassInput.tsx    Input with label
    │       ├── GlassSelect.tsx   Select dropdown with label
    │       ├── GlassBadge.tsx    Badge/pill component
    │       ├── GlassModal.tsx    Modal dialog
    │       ├── GlassTable.tsx    Data table
    │       ├── GlassTabs.tsx     Tab navigation
    │       ├── index.ts          Barrel export
    │       └── toast/
    │           ├── Toaster.tsx         Portal-based toast renderer (renders to document.body)
    │           └── useToastStore.ts    Zustand toast store: push, dismiss, toast.success/danger/warning/info
    ├── styles/
    │   └── tokens.css           CSS custom properties for design tokens
    └── test/
        ├── setup.ts             Vitest setup + toast cleanup after each test
        ├── lib/api.test.ts      API client tests (success, error parsing, auth header)
        ├── stores/useAuthStore.test.ts  Auth store tests (login, register, logout, refresh, restore)
        └── pages/
            ├── LoginPage.test.tsx     Login page tests (form submission, toast, navigation)
            └── RegisterPage.test.tsx   Register page tests (form submission, toast, navigation)
```

### 4.2 Frontend Flow — Deep Dive

#### App.tsx (Router)
```
Routes:
  /login     → LoginPage (public)
  /register  → RegisterPage (public)
  /app       → ProtectedRoute → AppShell(DashboardPage) (requires auth)
  *          → Redirect to /app

On mount: useAuthStore.restore() — checks localStorage for access token
ProtectedRoute: if !isAuthenticated → redirect to /login
```

#### useAuthStore (Zustand)
```
State:
  user: { userId, orgId, email, roles } | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

Actions:
  login(orgId, email, password):
    POST /api/v1/auth/login → store tokens in localStorage + state

  register(email, password, orgName, role):
    POST /api/v1/auth/register → store tokens in localStorage + state

  refresh():
    Read refresh token from localStorage
    POST /api/v1/auth/refresh → update tokens
    On failure → logout()

  logout():
    Remove tokens from localStorage, clear state

  restore():
    Check localStorage for access token → set isAuthenticated
```

#### api.ts (HTTP Client)
```
BASE_URL: http://localhost:8081 (from VITE_API_BASE_URL env or default)

request<T>(path, options):
  1. Read access token from localStorage
  2. Set Content-Type: application/json
  3. If token exists → set Authorization: Bearer <token>
  4. fetch(BASE_URL + path, options)
  5. If !res.ok → parse error body: { error: { code, message, field } }
     → throw new ApiError(status, code, message, field)
  6. If res.ok → return res.json()

Exported: api.post, api.get, api.put, api.delete
```

#### Toaster (Toast Notifications)
```
useToastStore (Zustand):
  toasts: Toast[] = []
  push({ title, description, tone }) → adds toast with random UUID
  dismiss(id) → removes toast

toast helper:
  toast.success(title, description?) → tone: "success"
  toast.danger(title, description?)  → tone: "danger"
  toast.warning(title, description?) → tone: "warning"
  toast.info(title, description?)    → tone: "info"

Toaster component:
  - Uses React portal to render to document.body
  - Subscribes to useToastStore for toast list
  - Each toast auto-dismisses after 5000ms
  - ToastItem renders title, description, dismiss button
```

---

## 5. Database & Infrastructure

### 5.1 PostgreSQL (Production)

- **Image:** `postgres:16-alpine`
- **Port:** 5432
- **Database:** `securecode_identity`
- **User:** `securecode` / **Password:** `securecode`
- **Migrations:** Flyway manages schema via `V1__init_identity_schema.sql`
  - Creates tables: `organization`, `app_user`, `role`, `user_role`, `audit_log`
  - Seeds 8 roles: SUPER_ADMIN, ORG_ADMIN, RECRUITER, FACULTY, INVIGILATOR, CANDIDATE, EVALUATOR, AUDITOR
  - Creates append-only triggers on `audit_log` (reject UPDATE/DELETE)
  - Uses PostgreSQL-specific features: `TIMESTAMPTZ`, `SMALLSERIAL`, `gen_random_uuid()`, `plpgsql` triggers

### 5.2 Redis

- **Image:** `redis:7-alpine`
- **Port:** 6379
- **Purpose:** Session/cache store (configured in `application.yml` via `spring.data.redis`)
- **Current usage:** Redis connection is mocked in tests (`@MockBean LettuceConnectionFactory`). Not actively used for token storage yet — planned for token blacklisting and session management.

### 5.3 H2 In-Memory Database (Test/Dev)

- **Used in:** `application-test.yml` (tests) and runtime override (dev server)
- **URL:** `jdbc:h2:mem:securecode_identity;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`
- **Mode:** PostgreSQL compatibility mode
- **Flyway:** Disabled (PostgreSQL-specific SQL incompatible with H2)
- **Schema:** Hibernate `ddl-auto=create-drop` (auto-creates tables from entity annotations)
- **Role seeding:** `RoleSeeder` (ApplicationRunner) for dev, `@BeforeEach` in tests

### 5.4 Docker Setup (Development)

```bash
# Start PostgreSQL
docker run -d --name securecode-postgres \
  -e POSTGRES_DB=securecode_identity \
  -e POSTGRES_USER=securecode \
  -e POSTGRES_PASSWORD=securecode \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5432:5432 postgres:16-alpine

# Start Redis
docker run -d --name securecode-redis \
  -p 6379:6379 redis:7-alpine
```

**Note:** `POSTGRES_HOST_AUTH_METHOD=trust` is used because Docker Desktop on Windows has a known issue with `scram-sha-256` authentication from JVM JDBC connections. The `trust` method bypasses password authentication for local connections.

---

## 6. Authentication & Security Flow

### 6.1 Registration Flow (End-to-End)

```
[Browser] RegisterPage
  │
  │ User fills: email, password (8+ chars), orgName, role (dropdown)
  │
  ▼
[Frontend] useAuthStore.register(email, password, orgName, role)
  │
  │ POST /api/v1/auth/register
  │ Body: { "email": "...", "password": "...", "orgName": "...", "role": "ORG_ADMIN" }
  │
  ▼
[Backend] AuthController.register(@Valid RegisterRequest)
  │
  │ Validation: @NotBlank email, @Email, @NotBlank @Size(min=8,max=128) password,
  │             @NotBlank orgName, @NotBlank role
  │
  ▼
[Backend] AuthService.register(req)
  │
  ├── 1. Create Organization
  │     org.name = req.orgName()
  │     org.status = "active"
  │     org = orgRepo.save(org)  → DB assigns UUID
  │
  ├── 2. Create AppUser
  │     user.orgId = org.getId()
  │     user.email = req.email()
  │     user.passwordHash = argon2Encoder.encode(req.password())
  │         → Generate 16-byte random salt
  │         → Argon2id hash: 3 iterations, 64MB memory, 1 parallelism, 32-byte output
  │         → Format: $argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>
  │     user.status = "active"
  │     user = userRepo.save(user)  → DB assigns UUID
  │
  ├── 3. Assign Role
  │     role = roleRepo.findByCode(req.role())  → e.g., "ORG_ADMIN"
  │     if role == null → throw ApiException("ROLE_NOT_FOUND", 400)
  │     userRole = new UserRole(userId, roleId, orgId)
  │     userRoleRepo.save(userRole)
  │
  ├── 4. Generate JWT Tokens
  │     accessToken = jwtService.generateAccessToken(userId, orgId, email, [role])
  │         → Header: { alg: HS512, typ: JWT }
  │         → Payload: { sub: userId, org_id: orgId, email: "...", roles: ["ORG_ADMIN"], type: "access", iat: ..., exp: +15min }
  │         → Signature: HMAC-SHA512(secret, base64(header) + "." + base64(payload))
  │     refreshToken = jwtService.generateRefreshToken(userId, orgId)
  │         → Payload: { sub: userId, org_id: orgId, type: "refresh", iat: ..., exp: +7days }
  │
  └── 5. Return AuthResponse
        { accessToken, refreshToken, tokenType: "Bearer", expiresIn: 900,
          userId, orgId, email, roles: ["ORG_ADMIN"] }
  │
  ▼
[Frontend] useAuthStore
  │
  ├── localStorage.setItem('securecode_access_token', res.accessToken)
  ├── localStorage.setItem('securecode_refresh_token', res.refreshToken)
  ├── set state: { user, accessToken, refreshToken, isAuthenticated: true }
  │
  ▼
[Frontend] RegisterPage
  │
  ├── toast.success('Account created successfully!')
  └── navigate('/app')  → DashboardPage renders
      │
      └── Shows: Organization ID, Email, Roles in glass cards
```

### 6.2 Login Flow (End-to-End)

```
[Browser] LoginPage
  │
  │ User fills: orgId (UUID), email, password
  │
  ▼
[Frontend] useAuthStore.login(orgId, email, password)
  │
  │ POST /api/v1/auth/login
  │ Body: { "orgId": "uuid-here", "email": "...", "password": "..." }
  │
  ▼
[Backend] AuthController.login(@Valid LoginRequest)
  │
  ▼
[Backend] AuthService.login(req)
  │
  ├── 1. Find user
  │     user = userRepo.findByOrgIdAndEmailAndDeletedAtIsNull(orgId, email)
  │     if not found → throw ApiException("INVALID_CREDENTIALS", 401)
  │
  ├── 2. Verify password
  │     argon2Encoder.matches(req.password(), user.getPasswordHash())
  │         → Parse encoded hash: split by $ → 6 parts
  │         → Extract params (m=65536, t=3, p=1), salt, expectedHash
  │         → Recompute hash with same params + salt
  │         → Compare byte arrays
  │     if mismatch → throw ApiException("INVALID_CREDENTIALS", 401)
  │
  ├── 3. Check account status
  │     if user.status != "active" → throw ApiException("ACCOUNT_DISABLED", 403)
  │
  ├── 4. Fetch roles
  │     roles = userRoleRepo.findRoleCodesByUserId(user.getId())
  │         → Native SQL: SELECT r.code FROM user_role ur JOIN role r ON r.id = ur.role_id WHERE ur.user_id = :userId
  │
  ├── 5. Generate new tokens (same as register)
  │
  └── 6. Return AuthResponse
  │
  ▼
[Frontend] useAuthStore
  │
  ├── Store tokens in localStorage
  ├── Set state: isAuthenticated = true
  │
  ▼
[Frontend] LoginPage
  │
  ├── toast.success('Welcome back!')
  └── navigate('/app')
```

### 6.3 Token Refresh Flow

```
[Frontend] useAuthStore.refresh()
  │
  │ Read refresh token from localStorage
  │ If no token → return (no-op)
  │
  │ POST /api/v1/auth/refresh
  │ Body: { "refreshToken": "eyJ..." }
  │
  ▼
[Backend] AuthService.refresh(req)
  │
  ├── 1. Parse JWT
  │     claims = jwtService.parseToken(req.refreshToken())
  │     → Verify HS512 signature
  │     → Check expiration
  │     if invalid → throw ApiException("INVALID_TOKEN", 401)
  │
  ├── 2. Verify token type
  │     if claims.type != "refresh" → throw ApiException("INVALID_TOKEN", 401)
  │     (prevents using access tokens for refresh)
  │
  ├── 3. Look up user
  │     userId = UUID.fromString(claims.subject)
  │     user = userRepo.findById(userId)
  │     if not found → throw ApiException("USER_NOT_FOUND", 404)
  │
  ├── 4. Fetch current roles (may have changed since token was issued)
  │
  ├── 5. Generate new access + refresh tokens (token rotation)
  │
  └── 6. Return AuthResponse
  │
  ▼
[Frontend] Update tokens in localStorage + state
  │
  └── On failure → logout() → clear tokens, redirect to /login
```

### 6.4 Auth Guard Flow

```
[Browser] Page load
  │
  ▼
[Frontend] App.tsx
  │
  ├── useEffect → useAuthStore.restore()
  │     → Check localStorage for 'securecode_access_token'
  │     → If exists → set isAuthenticated = true
  │
  └── Route matching
        │
        ├── /login, /register → public, always accessible
        │
        └── /app → ProtectedRoute
              │
              ├── if isAuthenticated → render AppShell + DashboardPage
              │     AppShell:
              │       Sidebar: Dashboard, Assessments, Sessions, Reports, Settings
              │       TopNav: user email + logout button
              │       Main: DashboardPage (shows orgId, email, roles)
              │
              └── if !isAuthenticated → <Navigate to="/login" />
                    → Redirect to login page
```

---

## 7. API Reference

### Base URL: `http://localhost:8081`

### POST /api/v1/auth/register
**Public endpoint — no auth required**

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "orgName": "Acme Corp",
  "role": "ORG_ADMIN"
}
```

Validation:
- `email`: @NotBlank, @Email
- `password`: @NotBlank, @Size(min=8, max=128)
- `orgName`: @NotBlank
- `role`: @NotBlank (must match a seeded role code)

Response (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "userId": "3c72a056-263b-4af8-8105-aec411d1e012",
  "orgId": "0ff87796-ac9a-4b7c-81c9-e293dcff8aa8",
  "email": "user@example.com",
  "roles": ["ORG_ADMIN"]
}
```

### POST /api/v1/auth/login
**Public endpoint — no auth required**

Request:
```json
{
  "orgId": "0ff87796-ac9a-4b7c-81c9-e293dcff8aa8",
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Validation:
- `orgId`: @NotNull (UUID)
- `email`: @NotBlank, @Email
- `password`: @NotBlank

Response (200 OK): Same as register response

### POST /api/v1/auth/refresh
**Public endpoint — no auth required**

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```

Validation:
- `refreshToken`: @NotBlank

Response (200 OK): Same as register response (with new rotated tokens)

### GET /actuator/health
**Public endpoint — no auth required**

Response (200 OK):
```json
{
  "status": "UP"
}
```

---

## 8. Error Handling

### Error Envelope Format (PRD D.4)
All errors return a standardized envelope:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "fieldName_or_null",
    "requestId": "req_uuid"
  }
}
```

### Error Codes

| HTTP Status | Code              | When                                           |
|-------------|-------------------|------------------------------------------------|
| 400         | ROLE_NOT_FOUND    | Register with non-existent role code           |
| 401         | INVALID_CREDENTIALS | Login with wrong email/password              |
| 401         | INVALID_TOKEN     | Refresh with invalid/expired/wrong-type token  |
| 403         | ACCOUNT_DISABLED  | Login when user status is not "active"         |
| 404         | USER_NOT_FOUND    | Refresh when user no longer exists             |
| 422         | VALIDATION_ERROR  | Request body fails bean validation             |
| 500         | INTERNAL_ERROR    | Unexpected server error (catch-all)            |

### Exception Handler Chain (AbstractApiExceptionHandler)
```
ApiException              → mapped to specific HTTP status + error code
MethodArgumentNotValidException → 422 VALIDATION_ERROR (first field error)
ConstraintViolationException    → 422 VALIDATION_ERROR
Exception (catch-all)           → 500 INTERNAL_ERROR
```

### Frontend Error Parsing (api.ts)
```typescript
// Backend sends: { error: { code, message, field, requestId } }
// Frontend parses:
const body = await res.json();
const err = body.error ?? body;  // handle both nested and flat
code = err.code ?? 'UNKNOWN';
message = err.message ?? 'An unexpected error occurred';
field = err.field;
throw new ApiError(res.status, code, message, field);
```

---

## 9. Testing

### 9.1 Backend Tests (24 tests — all passing)

#### AuthIntegrationTest (10 tests)
- `register_createsOrgUserAndRole_returnsTokens` — full register flow, verify org + user persisted
- `register_withInvalidRole_returns400` — non-existent role code
- `register_withBlankEmail_returns422` — validation: blank email
- `register_withShortPassword_returns422` — validation: password < 8 chars
- `login_afterRegistration_returnsTokens` — register then login, verify tokens + roles
- `login_withWrongPassword_returns401` — wrong password
- `login_withNonExistentUser_returns401` — random orgId + email
- `refresh_withValidRefreshToken_returnsNewTokens` — token rotation
- `refresh_withInvalidToken_returns401` — malformed token
- `refresh_withAccessTokenInsteadOfRefreshToken_returns401` — wrong token type

#### Argon2PasswordEncoderTest (7 tests)
- `encode_returnsArgon2idHash` — verify format: $argon2id$v=19$m=65536,t=3,p=1
- `encode_producesDifferentHashesForSamePassword` — salt randomization
- `matches_returnsTrueForCorrectPassword` — round-trip encode → matches
- `matches_returnsFalseForWrongPassword` — different password
- `matches_returnsFalseForNullPassword` — null safety
- `matches_returnsFalseForMalformedHash` — invalid hash string
- `matches_returnsFalseForEmptyHash` — empty string

#### JwtServiceTest (7 tests)
- Token generation with correct claims
- Token parsing and claim extraction
- Expired token rejection
- Invalid signature rejection
- Access token type verification
- Refresh token type verification
- TTL calculation

### 9.2 Frontend Tests (26 tests — all passing)

#### api.test.ts
- Successful response parsing
- Error response parsing (nested envelope)
- Auth header injection from localStorage
- Network error handling

#### useAuthStore.test.ts
- Login success — tokens stored, state updated
- Login failure — error thrown, state unchanged
- Register success — tokens stored, state updated
- Register failure — error thrown
- Logout — tokens cleared from localStorage + state
- Token refresh — new tokens stored
- Token refresh failure — logout triggered
- Restore from localStorage — isAuthenticated set

#### LoginPage.test.tsx
- Form rendering with all inputs
- Successful login — toast success, navigation to /app
- Login error — toast danger with error message
- Empty form submission — validation
- Toaster renders inside same render call (portal fix)

#### RegisterPage.test.tsx
- Form rendering with all inputs + role dropdown
- Successful registration — toast success, navigation to /app
- Registration error — toast danger with error message
- Role selection — all 7 roles available
- Toaster renders inside same render call (portal fix)

### 9.3 Test Configuration

**Backend (`application-test.yml`):**
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:test_identity;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop        # Auto-create schema from entities
    database-platform: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: false                  # Disabled — PostgreSQL-specific SQL
```

**Why H2 instead of Testcontainers PostgreSQL:**
- Testcontainers requires Docker daemon running
- Docker Desktop on Windows had connectivity issues with JVM
- H2 in PostgreSQL mode is sufficient for JPA/Hibernate tests
- Flyway migrations use PostgreSQL-specific syntax (TIMESTAMPTZ, SMALLSERIAL, plpgsql) incompatible with H2
- Role seeding in tests via `@BeforeEach` replaces Flyway's INSERT statements

---

## 10. All Changes Made (Changelog)

### Backend Changes

#### Bug Fixes

1. **`UserRole.java` — Missing `@Id` annotations**
   - **File:** `identity-service/src/main/java/ai/securecode/identity/entity/UserRole.java`
   - **Problem:** Composite key fields had `@Column` but not `@Id`. Hibernate threw `AnnotationException: Entity 'UserRole' has no identifier`.
   - **Fix:** Added `@Id` annotation to all three fields: `userId`, `roleId`, `orgId`.

2. **`Argon2PasswordEncoder.java` — Split index mismatch**
   - **File:** `identity-service/src/main/java/ai/securecode/identity/config/Argon2PasswordEncoder.java`
   - **Problem:** Encoded string `$argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>` split by `$` produces 6 parts (including empty first element), but code checked for `parts.length != 5` and used wrong indices [2,3,4].
   - **Fix:** Changed to `parts.length != 6` and adjusted indices to [3,4,5].

3. **`Argon2PasswordEncoder.java` — Swapped iterations/memory parameters**
   - **File:** Same as above
   - **Problem:** `hash(password, salt)` convenience method called `hash(password, salt, MEMORY, ITERATIONS, PARALLELISM)` but the 3-arg method signature is `(password, salt, iterations, memory, parallelism)`. So iterations=65536 and memory=3 (3KB — below Argon2's 8KB minimum). Similarly, `matches()` passed `(m, t, p)` as `(iterations, memory, parallelism)` — same swap.
   - **Fix:** Changed `hash(password, salt)` to call `hash(password, salt, ITERATIONS, MEMORY, PARALLELISM)`. Changed `matches()` to call `hash(rawPassword, salt, t, m, p)`.

4. **`SecurityConfig.java` — Missing CORS configuration**
   - **File:** `identity-service/src/main/java/ai/securecode/identity/config/SecurityConfig.java`
   - **Problem:** No CORS configuration — browser preview requests from different origin were blocked.
   - **Fix:** Added `CorsConfigurationSource` bean with `allowedOriginPatterns("*")`, all HTTP methods, `allowCredentials(true)`. Added `.cors(cors -> cors.configurationSource(corsConfigurationSource()))` to the security filter chain.

#### New Files

5. **`RoleSeeder.java` — Role seeding on startup**
   - **File:** `identity-service/src/main/java/ai/securecode/identity/config/RoleSeeder.java`
   - **Purpose:** `ApplicationRunner` bean that seeds all 8 roles on application startup. Needed because Flyway is disabled when running with H2, so roles must be seeded programmatically.
   - **Behavior:** Checks `roleRepo.findByCode(code) == null` before inserting (idempotent).

#### Configuration Changes

6. **`application-test.yml` — Switched from Testcontainers to H2**
   - **File:** `identity-service/src/test/resources/application-test.yml`
   - **Changes:**
     - Datasource: `jdbc:postgresql` → `jdbc:h2:mem:test_identity;MODE=PostgreSQL`
     - Driver: `org.postgresql.Driver` → `org.h2.Driver`
     - Username/password: `securecode` → `sa` / empty
     - Hibernate: `ddl-auto: validate` → `create-drop`
     - Flyway: `enabled: true` → `enabled: false`
     - Added: `database-platform: org.hibernate.dialect.H2Dialect`

7. **`pom.xml` — Added H2 dependency**
   - **File:** `identity-service/pom.xml`
   - **Change:** Added `com.h2database:h2` dependency with `<scope>runtime</scope>` (changed from `test` to `runtime` so it's available when running the app with H2 override).

#### Test Changes

8. **`AuthIntegrationTest.java` — Removed Testcontainers, added role seeding**
   - **File:** `identity-service/src/test/java/ai/securecode/identity/AuthIntegrationTest.java`
   - **Changes:**
     - Removed `@Testcontainers` annotation
     - Added `@Autowired RoleRepository roleRepo`
     - Added `@BeforeEach seedRoles()` method that seeds all 8 roles
     - Fixed null check: `roleRepo.findByCode(code).isEmpty()` → `roleRepo.findByCode(code) == null` (because `findByCode` returns `Role`, not `Optional<Role>`)

### Frontend Changes

#### Bug Fixes

9. **`api.ts` — Error response parsing for nested envelope**
   - **File:** `securecode-web/src/lib/api.ts`
   - **Problem:** API client assumed flat error structure `{ code, message, field }` but backend sends nested envelope `{ error: { code, message, field, requestId } }`.
   - **Fix:** Changed parsing to `const err = body.error ?? body;` then extract `err.code`, `err.message`, `err.field`.

10. **`LoginPage.test.tsx` — Toaster rendering inside render call**
    - **File:** `securecode-web/src/test/pages/LoginPage.test.tsx`
    - **Problem:** `Toaster` component uses `createPortal` to render to `document.body`. When rendered separately from the page, React Testing Library's `cleanup()` removed the portal container, causing toasts to not appear in tests.
    - **Fix:** Moved `<Toaster />` rendering inside the same `render()` call as `MemoryRouter` and `Routes`, ensuring proper cleanup and toast visibility.

11. **`RegisterPage.test.tsx` — Same Toaster fix**
    - **File:** `securecode-web/src/test/pages/RegisterPage.test.tsx`
    - **Fix:** Same as LoginPage — Toaster rendered inside same render call.

12. **`setup.ts` — Toast store cleanup between tests**
    - **File:** `securecode-web/src/test/setup.ts`
    - **Problem:** Toast notifications from one test leaked into subsequent tests.
    - **Fix:** Added `afterEach(() => { useToastStore.setState({ toasts: [] }); })` to clear toast state between tests.

#### Test File Updates

13. **`api.test.ts` — Updated error mock to nested envelope**
    - **File:** `securecode-web/src/test/lib/api.test.ts`
    - **Change:** Updated mock error responses from flat `{ code, message }` to nested `{ error: { code, message, field } }`.

14. **`useAuthStore.test.ts` — Updated error mocks + fixed mangled tests**
    - **File:** `securecode-web/src/test/stores/useAuthStore.test.ts`
    - **Changes:**
      - Updated error mock to use nested envelope structure
      - Fixed mangled test where `login throws` and `register` tests were incorrectly merged
      - Separated into distinct test cases

---

## 11. How to Run

### Prerequisites
- **Java 21** (Eclipse Adoptium / Temurin)
- **Maven 3.9+**
- **Node.js 18+** with npm
- **Docker Desktop** (for PostgreSQL + Redis)

### Start Infrastructure (Docker)

```bash
# Start PostgreSQL
docker run -d --name securecode-postgres \
  -e POSTGRES_DB=securecode_identity \
  -e POSTGRES_USER=securecode \
  -e POSTGRES_PASSWORD=securecode \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5432:5432 postgres:16-alpine

# Start Redis
docker run -d --name securecode-redis \
  -p 6379:6379 redis:7-alpine
```

### Start Backend (with PostgreSQL + Redis)

```bash
cd securecode-platform
mvn spring-boot:run -pl identity-service
# Backend runs on http://localhost:8081
```

### Start Backend (with H2 in-memory — no Docker needed)

```bash
cd securecode-platform
mvn spring-boot:run -pl identity-service ^
  "-Dspring-boot.run.arguments=--spring.datasource.url=jdbc:h2:mem:securecode_identity;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE --spring.datasource.driver-class-name=org.h2.Driver --spring.datasource.username=sa --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=create-drop --spring.jpa.database-platform=org.hibernate.dialect.H2Dialect --spring.flyway.enabled=false --spring.data.redis.host=localhost --spring.data.redis.port=6379"
# Backend runs on http://localhost:8081 with H2 (no PostgreSQL needed)
```

### Start Frontend

```bash
cd securecode-web
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Run Backend Tests

```bash
cd securecode-platform
mvn clean test -pl identity-service -am
# 24 tests, all passing
```

### Run Frontend Tests

```bash
cd securecode-web
npm test
# 26 tests, all passing
```

### Test the Full Flow (Browser)

1. Open `http://localhost:5173` → redirects to `/login`
2. Click "Register" link → go to `/register`
3. Fill in: Organization Name, Email, Password (8+ chars), select Role
4. Click "Create Account" → success toast → redirect to `/app` (Dashboard)
5. Dashboard shows your **Organization ID** (UUID), email, and roles
6. Click "Log out" → redirect to `/login`
7. Enter your **Organization ID**, email, and password
8. Click "Sign In" → success toast → redirect to `/app`

### Environment Variables

| Variable                    | Default                          | Description                    |
|-----------------------------|----------------------------------|--------------------------------|
| `SECURECODE_JWT_SECRET`     | (Base64 key in application.yml)  | JWT signing secret             |
| `VITE_API_BASE_URL`         | `http://localhost:8081`          | Frontend API base URL          |

### LocalStorage Keys

| Key                        | Value         | Description              |
|----------------------------|---------------|--------------------------|
| `securecode_access_token`  | JWT string    | 15-minute access token   |
| `securecode_refresh_token` | JWT string    | 7-day refresh token      |

---

## Summary

SecureCode AI is a multi-tenant coding assessment platform built with a microservices architecture. The **identity-service** handles authentication with JWT tokens (HS512), Argon2id password hashing, and role-based access control (8 roles). The **React frontend** provides login/register/dashboard pages with a glassmorphism UI, Zustand state management, and portal-based toast notifications. The backend uses PostgreSQL (with Flyway migrations) and Redis, with H2 as a test/dev alternative. All 50 tests (24 backend + 26 frontend) pass, and the full registration → login → token refresh flow works end-to-end.
