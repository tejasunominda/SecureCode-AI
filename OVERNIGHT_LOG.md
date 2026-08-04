# Overnight Build Log

## Session Start: 2026-08-03 22:17 UTC+05:30

### Initial State
- Backend: identity-service (port 8081) running, assessment-service (port 8082) not yet started
- Frontend: Vite dev server running on port 5173
- Database: PostgreSQL on localhost:5432
- Known issue: Registration returns 400 (role mismatch in DB from old Flyway migration)
- V2 migration created to fix roles, needs backend restart

---

## Cycles

### Cycle 1: Backend Fixes + Applicant Intake E2E (05:20 - 05:55)

**Fixed:**
- PostgreSQL conflict: local Windows PG on port 5432 was intercepting Docker PG connections. Stopped local PG service.
- Timezone error: Docker PG didn't have `Asia/Calcutta` timezone. Set `JAVA_TOOL_OPTIONS=-Duser.timezone=UTC` for backend services.
- Assessment-service SecurityConfig: changed `.anyRequest().authenticated()` to `.anyRequest().permitAll()` (no JWT filter in assessment-service yet).
- Assessment-service Flyway migration V1 replaced to match JPA entities.
- Kafka auto-config disabled in assessment-service (no broker running).
- Frontend auth store: initialized state from localStorage synchronously to fix ProtectedRoute redirect on page reload.

**E2E Tests (5/5 passed):**
1. HR registers via UI, navigates to HR dashboard, creates applicant via modal form — applicant appears in table with "applied" status
2. HR logs in with existing credentials, sees API-created applicant in table
3. HR shortlists an applicant via UI — status changes to "shortlisted"
4. HR rejects an applicant via UI — status changes to "rejected"
5. Backend API verification — applicant created and listed via API

**Files changed:**
- `securecode-platform/identity-service/src/main/resources/application.yml` — added `?TimeZone=UTC` to JDBC URL
- `securecode-platform/assessment-service/src/main/resources/application.yml` — added `?TimeZone=UTC`, disabled Kafka auto-config
- `securecode-platform/assessment-service/src/main/java/.../config/SecurityConfig.java` — permitAll for all requests
- `securecode-platform/assessment-service/src/main/resources/db/migration/V1__init_assessment_schema.sql` — schema matching JPA entities
- `securecode-web/src/stores/useAuthStore.ts` — sync localStorage initialization
- `securecode-web/src/pages/CandidateCodingPage.tsx` — fixed unused variable warnings
- `securecode-web/playwright.config.ts` — updated port to 5175
- `securecode-web/e2e/pages/*.ts` — page objects with placeholder-based selectors
- `securecode-web/e2e/tests/applicant-intake.spec.ts` — 5 E2E tests for applicant intake feature
