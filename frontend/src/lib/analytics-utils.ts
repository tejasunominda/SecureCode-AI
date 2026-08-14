import type { SessionReportDTO } from './assessment-api';

export interface AnalyticsSummary {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  passedCount: number;
  failedCount: number;
  pendingDecisions: number;
  avgAptitudeScore: number;
  avgReasoningScore: number;
  totalCodingSubmissions: number;
  passRate: number;
  completionRate: number;
}

export function computeAnalytics(sessions: SessionReportDTO[]): AnalyticsSummary {
  const total = sessions.length;
  const completed = sessions.filter((s) => s.status === 'submitted').length;
  const inProgress = sessions.filter((s) => s.status === 'in_progress').length;
  const passed = sessions.filter((s) => s.hiringDecision === 'pass').length;
  const failed = sessions.filter((s) => s.hiringDecision === 'fail').length;
  const pending = completed - passed - failed;

  const aptitudeScores = sessions.filter((s) => s.aptitudeTotal > 0).map((s) => s.aptitudeCorrect / s.aptitudeTotal);
  const reasoningScores = sessions.filter((s) => s.reasoningTotal > 0).map((s) => s.reasoningCorrect / s.reasoningTotal);
  const codingSubs = sessions.reduce((sum, s) => sum + s.codingResults.length, 0);

  return {
    totalSessions: total,
    completedSessions: completed,
    inProgressSessions: inProgress,
    passedCount: passed,
    failedCount: failed,
    pendingDecisions: pending,
    avgAptitudeScore: aptitudeScores.length ? Math.round((aptitudeScores.reduce((a, b) => a + b, 0) / aptitudeScores.length) * 100) : 0,
    avgReasoningScore: reasoningScores.length ? Math.round((reasoningScores.reduce((a, b) => a + b, 0) / reasoningScores.length) * 100) : 0,
    totalCodingSubmissions: codingSubs,
    passRate: completed ? Math.round((passed / completed) * 100) : 0,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function getScoreDistribution(sessions: SessionReportDTO[]) {
  const ranges = [
    { label: '0-20%', min: 0, max: 20, count: 0 },
    { label: '21-40%', min: 21, max: 40, count: 0 },
    { label: '41-60%', min: 41, max: 60, count: 0 },
    { label: '61-80%', min: 61, max: 80, count: 0 },
    { label: '81-100%', min: 81, max: 100, count: 0 },
  ];
  for (const s of sessions) {
    if (s.aptitudeTotal === 0 && s.reasoningTotal === 0) continue;
    const total = s.aptitudeTotal + s.reasoningTotal;
    const correct = s.aptitudeCorrect + s.reasoningCorrect;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const range = ranges.find((r) => pct >= r.min && pct <= r.max);
    if (range) range.count++;
  }
  return ranges.map((r) => ({ label: r.label, value: r.count }));
}

export function getHiringFunnel(sessions: SessionReportDTO[]) {
  return [
    { label: 'Total', value: sessions.length },
    { label: 'Started', value: sessions.filter((s) => s.startedAt).length },
    { label: 'Submitted', value: sessions.filter((s) => s.status === 'submitted').length },
    { label: 'Passed', value: sessions.filter((s) => s.hiringDecision === 'pass').length },
  ];
}

export function getStatusBreakdown(sessions: SessionReportDTO[]) {
  const statuses = new Map<string, number>();
  for (const s of sessions) {
    statuses.set(s.status, (statuses.get(s.status) ?? 0) + 1);
  }
  return Array.from(statuses.entries()).map(([label, value]) => ({ label, value }));
}

export function getTopPerformers(sessions: SessionReportDTO[], limit = 5) {
  return sessions
    .filter((s) => s.status === 'submitted')
    .map((s) => ({
      ...s,
      totalPct: s.aptitudeTotal + s.reasoningTotal > 0
        ? Math.round(((s.aptitudeCorrect + s.reasoningCorrect) / (s.aptitudeTotal + s.reasoningTotal)) * 100)
        : 0,
    }))
    .sort((a, b) => b.totalPct - a.totalPct)
    .slice(0, limit);
}

export function getProctoringAlerts(sessions: SessionReportDTO[]) {
  return sessions
    .map((s) => ({ name: s.applicantName, events: s.proctoringEvents.length, sessionId: s.sessionId }))
    .filter((s) => s.events > 0)
    .sort((a, b) => b.events - a.events);
}
