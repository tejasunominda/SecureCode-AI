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

### Cycle 2: Assessment Link Generation + Candidate Test Start (05:55 - 06:05)

**Added:**
- Flyway V2 migration seeding default assessment template (`a0000000-0000-0000-0000-000000000001`)
- E2E tests for link generation UI flow and candidate test start

**E2E Tests (4/4 passed, 9/9 total):**
1. HR shortlists applicant, generates link via UI, candidate opens link and starts test via UI
2. Candidate sees error for invalid token
3. Backend API: generate link and start test via API
4. Cannot start test with already-used link

**Files changed:**
- `securecode-platform/assessment-service/src/main/resources/db/migration/V2__seed_default_template.sql` — default template seed
- `securecode-web/e2e/tests/assessment-link.spec.ts` — 4 E2E tests for link generation + candidate start
- `securecode-web/e2e/pages/CandidateInstructionsPage.ts` — fixed strict mode violation in expectError

### Cycle 3: Candidate Test Taking (MCQ + Coding) (06:05 - 06:15)

**Added:**
- API helpers: createQuestion, publishQuestion, submitAnswer, submitCode, submitTest
- E2E tests for full candidate test flow through all 3 sections

**E2E Tests (3/3 passed, 12/12 total):**
1. Candidate completes full test: aptitude → reasoning → coding via UI (answers MCQs, writes code, submits)
2. Backend API: submit answers and code via API, verify session report
3. Candidate sees "No questions available" when no questions published

**Files changed:**
- `securecode-web/e2e/helpers/api.ts` — added createQuestion, publishQuestion, submitAnswer, submitCode, submitTest
- `securecode-web/e2e/tests/candidate-test.spec.ts` — 3 E2E tests for candidate test taking
- `securecode-web/e2e/pages/CandidateTestPage.ts` — fixed expectSubmitted to use heading role

### Cycle 4: Session Report + Hiring Decision (06:15 - 06:25)

**Added:**
- E2E tests for session report viewing and hiring decision making

**E2E Tests (4/4 passed, 16/16 total):**
1. Technical Manager views session report and makes hiring decision (pass) via API
2. HR views sessions tab and sees completed session via UI
3. Hiring decision "reject" works via API
4. List sessions returns all org sessions via API

**Files changed:**
- `securecode-web/e2e/tests/session-report.spec.ts` — 4 E2E tests for session report + hiring decision

---

## Summary

**Total E2E tests: 16 (all passing)**
- Feature 1 (Applicant Intake): 5 tests
- Feature 2 (Assessment Link + Test Start): 4 tests
- Feature 3 (Candidate Test Taking): 3 tests
- Feature 4 (Session Report + Hiring Decision): 4 tests

**Key fixes made during cycles:**
- Auth store: sync localStorage initialization (fixed ProtectedRoute redirect on reload)
- Assessment-service: SecurityConfig permitAll, Kafka disabled, timezone UTC, Flyway migrations V1+V2
- Frontend: unused variable warnings fixed, Playwright config updated
- Page objects: placeholder-based selectors, strict mode violation fixes

### Cycle 5: Security Fix + UI Overhaul (06:25 - 06:55)

**Security:**
- Added JwtAuthenticationFilter to assessment-service
- SecurityConfig now requires authentication for HR/TM endpoints
- Candidate endpoints (start, answer, code, submit, proctoring, GET questions) remain public
- Added jjwt dependencies to assessment-service pom.xml
- Added JWT secret config to assessment-service application.yml

**UI Overhaul (professional design):**
- Installed lucide-react for icons
- index.html: added Inter font, meta description, professional title
- tokens.css: added weight-bold, radius-xl, shadow-xl, transition-slow
- tailwind.config.ts: added xl radius and shadow
- GlassInput: auto-generated id for label association
- Sidebar: logo with icon, section labels, help card at bottom, nav icons
- TopNav: user avatar, logout icon, page title
- AppShell: bg-canvas on main, wider padding
- LoginPage: split-screen with branding panel (features list), professional form
- RegisterPage: split-screen with branding panel, loading state, role labels
- DashboardPage: stat cards with icons, account info cards with icons
- HRDashboardPage: icon buttons, loading spinner, tab icons
- CandidateInstructionsPage: header with branding, rule icons, system check icons, loading state
- Updated E2E page objects (LoginPage, RegisterPage) to match new placeholders

**E2E Tests: 16/16 passed (40.6s)**

**Files changed:**
- `securecode-platform/assessment-service/src/main/java/ai/securecode/assessment/config/JwtAuthenticationFilter.java` — new JWT filter
- `securecode-platform/assessment-service/src/main/java/ai/securecode/assessment/config/SecurityConfig.java` — JWT auth + public candidate endpoints
- `securecode-platform/assessment-service/pom.xml` — added jjwt dependencies
- `securecode-platform/assessment-service/src/main/resources/application.yml` — JWT secret
- `securecode-web/index.html` — font, meta, title
- `securecode-web/src/styles/tokens.css` — new tokens
- `securecode-web/tailwind.config.ts` — xl radius/shadow
- `securecode-web/src/components/ui/GlassInput.tsx` — auto id
- `securecode-web/src/components/layout/Sidebar.tsx` — icons, branding, help card
- `securecode-web/src/components/layout/TopNav.tsx` — avatar, logout icon
- `securecode-web/src/components/layout/AppShell.tsx` — simplified
- `securecode-web/src/pages/LoginPage.tsx` — split-screen professional design
- `securecode-web/src/pages/RegisterPage.tsx` — split-screen professional design
- `securecode-web/src/pages/DashboardPage.tsx` — stat cards, icon cards
- `securecode-web/src/pages/HRDashboardPage.tsx` — icon buttons, spinner, tab icons
- `securecode-web/src/pages/CandidateInstructionsPage.tsx` — header, rule icons, system check
- `securecode-web/e2e/pages/LoginPage.ts` — updated password placeholder
- `securecode-web/e2e/pages/RegisterPage.ts` — updated org name + password placeholders
