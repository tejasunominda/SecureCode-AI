import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const ASSESSMENT_URL = __ENV.ASSESSMENT_URL || 'http://localhost:8082';
const EXECUTION_URL = __ENV.EXECUTION_URL || 'http://localhost:8083';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const loginDuration = new Trend('login_duration');
const executionDuration = new Trend('execution_duration');
const successRate = new Rate('success_rate');

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@securecode.ai',
    password: 'password123',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login successful': (r) => r.status === 200 });

  return {
    token: loginRes.json('accessToken') || '',
    orgId: loginRes.json('orgId') || '',
  };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
    'X-Org-Id': data.orgId,
  };

  group('Identity - Get Profile', function () {
    const res = http.get(`${BASE_URL}/api/v1/auth/me`, { headers });
    check(res, { 'profile ok': (r) => r.status === 200 });
    successRate.add(res.status === 200);
    sleep(0.5);
  });

  group('Assessment - List Questions', function () {
    const res = http.get(`${ASSESSMENT_URL}/api/v1/assessment/questions`, { headers });
    check(res, { 'questions list ok': (r) => r.status === 200 });
    successRate.add(res.status === 200);
    sleep(0.5);
  });

  group('Execution - Run Code', function () {
    const res = http.post(`${EXECUTION_URL}/api/v1/execution/run`, JSON.stringify({
      language: 'python',
      code: 'print("hello world")',
      stdin: '',
    }), { headers });
    check(res, { 'execution ok': (r) => r.status === 200 });
    executionDuration.add(res.timings.duration);
    successRate.add(res.status === 200);
    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  return JSON.stringify(data.metrics, null, 2);
}
