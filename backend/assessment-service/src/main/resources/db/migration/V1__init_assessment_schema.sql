-- Assessment Service baseline schema matching JPA entities.
-- Tables: applicant, assessment_template, assessment_link, assessment_session,
-- question, section_response, coding_submission, proctoring_event, hiring_decision.

CREATE TABLE applicant (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(320) NOT NULL,
    resume_url      TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'applied',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_applicant_org ON applicant(org_id);

CREATE TABLE assessment_template (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    aptitude_duration_min   INT NOT NULL DEFAULT 20,
    reasoning_duration_min  INT NOT NULL DEFAULT 20,
    coding_duration_min     INT NOT NULL DEFAULT 50,
    created_by              UUID NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_template_org ON assessment_template(org_id);

CREATE TABLE assessment_link (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id    UUID NOT NULL,
    template_id     UUID NOT NULL,
    org_id          UUID NOT NULL,
    token           VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    expires_at      TIMESTAMPTZ NOT NULL,
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_link_applicant ON assessment_link(applicant_id);
CREATE INDEX idx_link_token ON assessment_link(token);

CREATE TABLE assessment_session (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id         UUID NOT NULL,
    applicant_id    UUID NOT NULL,
    template_id     UUID NOT NULL,
    org_id          UUID NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'not_started',
    current_section VARCHAR(30),
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_org ON assessment_session(org_id);
CREATE INDEX idx_session_applicant ON assessment_session(applicant_id);

CREATE TABLE question (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    type            VARCHAR(30) NOT NULL,
    body            TEXT NOT NULL,
    option_a        TEXT,
    option_b        TEXT,
    option_c        TEXT,
    option_d        TEXT,
    correct_option  VARCHAR(1),
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'easy',
    tags            VARCHAR(255),
    test_cases      TEXT,
    created_by      UUID NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_question_org_status ON question(org_id, status);

CREATE TABLE section_response (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    question_id     UUID NOT NULL,
    selected_option VARCHAR(1),
    is_correct      BOOLEAN,
    answered_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_section_response_session ON section_response(session_id);

CREATE TABLE coding_submission (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL,
    question_id         UUID NOT NULL,
    language            VARCHAR(30) NOT NULL,
    code                TEXT NOT NULL,
    visible_tests_passed INT NOT NULL DEFAULT 0,
    hidden_tests_passed  INT NOT NULL DEFAULT 0,
    hidden_tests_total   INT NOT NULL DEFAULT 0,
    runtime_ms          BIGINT NOT NULL DEFAULT 0,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coding_submission_session ON coding_submission(session_id);

CREATE TABLE proctoring_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    warning_number  INT NOT NULL DEFAULT 0,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proctoring_session ON proctoring_event(session_id);

CREATE TABLE hiring_decision (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL,
    decision                VARCHAR(30) NOT NULL,
    decided_by              UUID NOT NULL,
    technical_manager_notes TEXT,
    decided_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hiring_decision_session ON hiring_decision(session_id);
