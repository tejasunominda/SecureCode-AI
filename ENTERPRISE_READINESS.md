# SecureCode AI — Enterprise Readiness & Security Hardening Summary

**Scope:** This document captures the security, CI/CD, and infrastructure
hardening changes completed to bring the SecureCode AI platform to an
enterprise-ready posture for VAPT, SAST/DAST, and production deployment.

---

## 1. Critical security vulnerabilities addressed

| # | Vulnerability | Fix |
|---|---------------|-----|
| 1 | **RCE / sandbox bypass** in `execution-service` | `/run/sync` now routes through `DockerCodeExecutor` only; `ExecutionWorkerPool` no longer falls back to unsandboxed `CodeExecutor`; custom judge `ScriptEngine.eval` disabled. |
| 2 | **Unsafe custom judge evaluation** | `CodeExecutor` and `DockerCodeExecutor` reject `judge: custom` instead of evaluating arbitrary JavaScript/Groovy. |
| 3 | **Weak container hardening** | Docker `HostConfig` now drops all capabilities, sets `no-new-privileges`, read-only rootfs, PID limits, and dedicated CPU/memory limits. |
| 4 | **Wildcard CORS with credentials** | Replaced `setAllowedOriginPatterns(List.of("*"))` with a configurable allowlist (`securecode.cors.allowed-origins` / `SECURECODE_CORS_ALLOWED_ORIGINS`) across all backend services. |
| 5 | **Gateway-only trust boundary** | Added `JwtAuthenticationFilter` to `proctoring`, `reporting`, `execution`, and `notification` services so each service re-validates the JWT; downstream `permitAll()` gaps closed. |
| 6 | **Direct intra-cluster access** | K8s default-deny NetworkPolicy plus `allow-gateway-to-backend` policy restricts non-gateway ingress to backend services. |
| 7 | **Hardcoded JWT secret** | Removed from `ConfigMap`; K8s now references the `securecode-jwt-secret` Secret, populated out-of-band. |
| 8 | **Writable docker.sock mount** | Set `readOnly: true` on the `docker-sock` hostPath volume mount in the `execution-service` Deployment. |

## 2. CI/CD hardening

- **OpenTelemetry dependency mismatch** — `backend/pom.xml` now uses a
  published, compatible pair: `opentelemetry.version=1.60.1` and
  `opentelemetry-spring.version=2.26.1`.
- **POM comment parse fix** — Replaced an XML-illegal double dash (`--`)
  inside a comment that broke the Maven parser.
- **DAST target** — Made the OWASP ZAP DAST job non-blocking (`continue-on-error: true`)
  because the workflow did not start a target; should be re-pointed to a
  deployed staging URL for production DAST.
- **JJWT transitive dependency** — Added `jjwt-api`, `jjwt-impl`, `jjwt-jackson`
  to the `common` module so all services compile the new `JwtAuthenticationFilter`.

## 3. Kubernetes hardening

- Added `securityContext` to every container:
  - `allowPrivilegeEscalation: false`
  - `capabilities: drop: [ALL]`
  - `readOnlyRootFilesystem: false` (can be tightened further with `emptyDir`)
- Added `resources.requests/limits` (100m CPU / 256Mi memory request; 1 CPU / 1Gi
  memory limit) to every container to prevent noisy-neighbor issues.
- Added default-deny and gateway-allow `NetworkPolicy` manifests.
- Added placeholder `securecode-db-secret` and `securecode-jwt-secret` manifests
  with explicit instructions to inject real values via a KMS-backed secret
  manager before applying to production.

## 4. Test status

- **Frontend unit tests** — `npm test` passes: 50 tests across 7 test files.
- **Backend tests / build** — Pending CI because the most recent fixes need to
  be pushed to GitHub. Local Maven is not installed.

## 5. Next steps for full production readiness

1. **Push the latest commits** once the network/git connection to GitHub is
   stable (the last commit is currently blocked by a TLS `schannel` disconnect).
2. **Re-run CI** and address any `Backend CI`, `SAST/DAST`, or `CD - Deploy`
   failures that surface.
3. **Tighten `readOnlyRootFilesystem: true`** for Java services by mounting an
   `emptyDir` for `/tmp` so Spring Boot can still write ephemeral files.
4. **Run DAST against staging** after the `CD - Deploy` workflow succeeds, then
   re-enable `continue-on-error: false` or keep it as an informational, scheduled
   scan.
5. **Replace the K8s Secret placeholders** with External Secrets Operator /
   Sealed Secrets / cloud-provider CSI driver integration.
6. **Move the `JwtAuthenticationFilter` copies** to the `common` module to avoid
   duplication and make secret-key derivation logic a single source of truth.
7. **Add `livenessProbe` and `startupProbe`** alongside the existing
   `readinessProbe` for higher availability in production.
8. **Add container non-root users** (`runAsUser`, `runAsGroup`, `fsGroup`) once
   the Spring Boot images are rebuilt to run under a non-root UID.
9. **Run `npm run build` and a backend `mvn verify` locally** when Maven is
   installed to shorten the local CI feedback loop.

## 6. Files with major changes

- `backend/pom.xml`
- `backend/common/pom.xml`
- `backend/execution-service/.../ExecutionController.java`
- `backend/execution-service/.../ExecutionWorkerPool.java`
- `backend/execution-service/.../CodeExecutor.java`
- `backend/execution-service/.../DockerCodeExecutor.java`
- `backend/*/config/SecurityConfig.java` and new `JwtAuthenticationFilter.java`
- `backend/*/resources/application.yml`
- `backend/k8s/manifests.yaml`
- `.github/workflows/security-scan.yml`
