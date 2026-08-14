# SecureCode AI Platform

Enterprise-grade AI-powered coding assessment platform with automated proctoring, real-time risk scoring, and comprehensive analytics.

## Project Structure

```
SecureCode-AI/
├── backend/                 # Spring Boot microservices (Java 21)
│   ├── common/              # Shared DTOs, exceptions, utils
│   ├── api-gateway/         # Spring Cloud Gateway
│   ├── identity-service/    # Auth, SSO, MFA, device fingerprinting
│   ├── assessment-service/  # Question bank, test creation, bulk import
│   ├── execution-service/   # Docker-based code execution (Java, C++, Python, SQL)
│   ├── proctoring-service/  # Real-time proctoring, risk scoring, WebSocket
│   ├── reporting-service/   # Analytics, PDF/CSV export
│   ├── notification-service/# Webhooks, email notifications
│   ├── docker/              # Docker configs
│   ├── k8s/                 # Kubernetes manifests
│   ├── docker-compose.yml   # Full stack orchestration
│   └── pom.xml              # Parent POM
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand stores
│   │   └── lib/             # Utilities, API clients
│   ├── e2e/                 # Playwright E2E tests
│   ├── package.json
│   └── vite.config.ts
├── infra/                   # Infrastructure configs
├── docker-compose.yml       # Root orchestration
└── .gitignore
```

## Tech Stack

### Backend
- **Java 21**, Spring Boot 3.3.4, Spring Cloud 2023.0.3
- PostgreSQL, Redis, Kafka, MinIO
- Flyway migrations, JPA/Hibernate
- JWT auth, SSO (Google, Azure AD), TOTP MFA
- Docker-based code execution
- WebSocket real-time proctoring

### Frontend
- React 18, TypeScript, Vite
- TailwindCSS, Zustand, React Router
- Playwright E2E testing
- Face detection (pico.js), code editor (Monaco)

## Getting Started

### Backend
```bash
cd backend
mvn clean compile
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend Unit Tests
```bash
cd backend
mvn test -pl identity-service -Dtest="DeviceFingerprintServiceTest,SsoServiceStateTest"
mvn test -pl proctoring-service -Dtest="AlertThresholdServiceTest,CodeSimilarityServiceTest"
```

### Frontend E2E Tests
```bash
cd frontend
npx playwright test
```
