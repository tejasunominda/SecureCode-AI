# SecureCode AI — Remaining Product Gaps

Validated: full Docker Compose stack starts; API Gateway, Identity Service and Assessment Service are healthy; end-to-end registration and login through the gateway return valid JWT tokens.

## Outstanding Gaps

### 1. Docker build reproducibility
`Dockerfile.service` was updated to run `mvn ... clean install` and `mvn ... clean package spring-boot:repackage`. While this now produces working executable JARs, the two-step build still relies on a shared Maven cache. A single-pass `mvn -pl <service> -am clean package` (with `spring-boot:repackage` bound to the `package` phase in each service POM) would be more robust and faster.

## What Is Working
- Docker Compose stack comes up without build errors.
- API Gateway starts and routes `/api/v1/auth/**` to `identity-service`.
- API Gateway Spring Security CSRF is disabled; custom `JwtAuthFilter` (GlobalFilter) enforces auth.
- `identity-service`, `assessment-service`, `execution-service`, `proctoring-service`, `reporting-service` and `notification-service` all start and stay `Up`.
- `SECURECODE_JWT_SECRET` and `OTEL_*_EXPORTER=none` are provided to all backend services, eliminating placeholder and OpenTelemetry startup failures.
- Frontend is reachable on `http://localhost:5173` and `api.ts` uses relative `/api` paths through the Nginx proxy.
- Registration and login return a valid `AuthResponse` with `accessToken`, `refreshToken`, `userId`, `orgId` and `roles`.
- Playwright smoke tests (`e2e/tests/smoke.spec.ts`) pass: login and register pages load correctly.
