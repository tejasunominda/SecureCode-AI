import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/lib/api';
import { assessmentApi, type ApplicantDTO, type SessionReportDTO, type CodingResultDTO } from '@/lib/assessment-api';
import { GlassButton, GlassInput, GlassBadge, GlassTable, GlassModal, GlassSelect, GlassPagination } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import type { GlassTableColumn } from '@/components/ui';
import { useDebounce } from '@/hooks/useUtils';
import { exportToCSV, downloadReport } from '@/lib/export-utils';
import { UserPlus, Check, X, Send, Users, FileText, Eye, ThumbsUp, ThumbsDown, Code2, AlertTriangle, Search, Download, Monitor } from 'lucide-react';
import { MonitoringGrid } from '@/components/proctoring/MonitoringGrid';

const DEFAULT_TEMPLATE_ID = 'a0000000-0000-0000-0000-000000000001';

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
    applied: "neutral",
    shortlisted: "info",
    test_sent: "warning",
    in_progress: "warning",
    submitted: "success",
    passed: "success",
    failed: "danger",
    rejected: "danger",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HRDashboardPage() {
    const user = useAuthStore((s) => s.user);
    const [applicants, setApplicants] = useState<ApplicantDTO[]>([]);
    const [sessions, setSessions] = useState<SessionReportDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicantDTO | null>(null);
    const [selectedSession, setSelectedSession] = useState<SessionReportDTO | null>(null);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newResumeUrl, setNewResumeUrl] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeFileName, setResumeFileName] = useState('');
    const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
    const [expiryDays, setExpiryDays] = useState('5');
    const [activeTab, setActiveTab] = useState('applicants');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [addingApplicant, setAddingApplicant] = useState(false);
    const [decisionNotes, setDecisionNotes] = useState('');
    const [decisionType, setDecisionType] = useState<'pass' | 'fail'>('pass');
    const [submittingDecision, setSubmittingDecision] = useState(false);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [sessionSearch, setSessionSearch] = useState('');
    const debouncedSessionSearch = useDebounce(sessionSearch, 300);
    const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
    const [sessionPage, setSessionPage] = useState(1);
    const PAGE_SIZE = 8;

    const fetchData = useCallback(async () => {
        if (!user?.orgId) return;
        try {
            const [apps, sess] = await Promise.all([
                assessmentApi.listApplicants(user.orgId),
                assessmentApi.listSessions(user.orgId),
            ]);
            setApplicants(apps);
            setSessions(sess);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load data';
            toast.danger(message);
        } finally {
            setLoading(false);
        }
    }, [user?.orgId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddApplicant = async () => {
        if (!user?.orgId) return;
        if (!newName.trim() || !newEmail.trim()) {
            toast.danger('Please fill in all required fields');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            toast.danger('Please enter a valid email address');
            return;
        }
        if (resumeFile) {
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            const maxSize = 5 * 1024 * 1024;
            if (!allowedTypes.includes(resumeFile.type) && !/\.(pdf|doc|docx|txt)$/i.test(resumeFile.name)) {
                toast.danger('Invalid file type', 'Only PDF, DOC, DOCX, and TXT files are allowed.');
                return;
            }
            if (resumeFile.size > maxSize) {
                toast.danger('File too large', 'Resume file must be under 5 MB.');
                return;
            }
        }
        setAddingApplicant(true);
        try {
            let resumeUrl = newResumeUrl || undefined;
            if (resumeFile) {
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(resumeFile);
                });
                resumeUrl = dataUrl;
            }
            await assessmentApi.createApplicant(user.orgId, newName, newEmail, resumeUrl);
            toast.success('Applicant added');
            setShowAddModal(false);
            setNewName('');
            setNewEmail('');
            setNewResumeUrl('');
            setResumeFile(null);
            setResumeFileName('');
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add applicant';
            toast.danger(message);
        } finally {
            setAddingApplicant(false);
        }
    };

    const handleShortlist = async (id: string) => {
        try {
            await assessmentApi.shortlistApplicant(id);
            toast.success('Applicant shortlisted');
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to shortlist';
            toast.danger(message);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await assessmentApi.rejectApplicant(id);
            toast.success('Applicant rejected');
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reject';
            toast.danger(message);
        }
    };

    const handleGenerateLink = async () => {
        if (!user?.orgId || !user?.userId || !selectedApplicant || !templateId) {
            toast.danger('Missing required information to generate link');
            return;
        }
        setGeneratingLink(true);
        try {
            const link = await assessmentApi.generateLink(
                user.orgId, user.userId,
                selectedApplicant.id, templateId, parseInt(expiryDays) || 5
            );
            const fullUrl = `${window.location.origin}${link.testUrl}`;
            try {
                await navigator.clipboard.writeText(fullUrl);
                toast.success('Assessment link generated and copied to clipboard');
            } catch {
                toast.success('Assessment link generated (clipboard not available)');
            }
            setShowLinkModal(false);
            setTemplateId(DEFAULT_TEMPLATE_ID);
            setExpiryDays('5');
            setSelectedApplicant(null);
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate link';
            toast.danger(message);
        } finally {
            setGeneratingLink(false);
        }
    };

    const handleViewReport = async (sessionId: string) => {
        try {
            const report = await assessmentApi.getSessionReport(sessionId);
            setSelectedSession(report);
            setShowReportModal(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load report';
            toast.danger(message);
        }
    };

    const handleHiringDecision = async () => {
        if (!user?.userId || !selectedSession) return;
        setSubmittingDecision(true);
        try {
            await assessmentApi.makeHiringDecision(
                selectedSession.sessionId,
                user.userId,
                decisionType,
                decisionNotes || undefined
            );
            toast.success(`Candidate marked as ${decisionType}`);
            setShowDecisionModal(false);
            setShowReportModal(false);
            setDecisionNotes('');
            setSelectedSession(null);
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit decision';
            toast.danger(message);
        } finally {
            setSubmittingDecision(false);
        }
    };

    const openDecisionModal = (session: SessionReportDTO, type: 'pass' | 'fail') => {
        setSelectedSession(session);
        setDecisionType(type);
        setDecisionNotes('');
        setShowDecisionModal(true);
    };

    // Filtered & sorted applicants
    const filteredApplicants = useMemo(() => {
        let result = applicants;
        if (statusFilter !== 'all') result = result.filter((a) => a.status === statusFilter);
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            result = result.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
        }
        if (sortBy === 'newest') result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        else if (sortBy === 'oldest') result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        else if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }, [applicants, statusFilter, debouncedSearch, sortBy]);

    const applicantTotalPages = Math.ceil(filteredApplicants.length / PAGE_SIZE);
    const pagedApplicants = filteredApplicants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Filtered & sorted sessions
    const filteredSessions = useMemo(() => {
        let result = sessions;
        if (sessionStatusFilter !== 'all') result = result.filter((s) => s.status === sessionStatusFilter);
        if (debouncedSessionSearch) {
            const q = debouncedSessionSearch.toLowerCase();
            result = result.filter((s) => s.applicantName.toLowerCase().includes(q) || s.applicantEmail.toLowerCase().includes(q));
        }
        return result;
    }, [sessions, sessionStatusFilter, debouncedSessionSearch]);

    const sessionTotalPages = Math.ceil(filteredSessions.length / PAGE_SIZE);
    const pagedSessions = filteredSessions.slice((sessionPage - 1) * PAGE_SIZE, sessionPage * PAGE_SIZE);

    const handleExportApplicants = () => {
        const headers = ['Name', 'Email', 'Status', 'Resume URL', 'Created At'];
        const rows = filteredApplicants.map((a) => [a.name, a.email, a.status, a.resumeUrl ?? '', a.createdAt]);
        exportToCSV(`applicants-${Date.now()}.csv`, headers, rows);
        toast.success('Applicants exported to CSV');
    };

    const handleResendInvite = async (row: SessionReportDTO) => {
        if (!user?.orgId || !user?.userId) return;
        setResendingId(row.sessionId);
        try {
            const link = await assessmentApi.generateLink(
                user.orgId,
                user.userId,
                row.applicantId,
                DEFAULT_TEMPLATE_ID,
                5
            );
            const fullUrl = `${window.location.origin}${link.testUrl}`;
            const params = new URLSearchParams({
                to: row.applicantEmail,
                candidateName: row.applicantName,
                assessmentLink: fullUrl,
                orgName: 'SecureCode AI',
            });
            await api.post<void>(`/api/v1/notifications/email/invite?${params.toString()}`, {});
            toast.success('Invite email resent', `A fresh link was sent to ${row.applicantEmail}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to resend invite';
            toast.danger(message);
        } finally {
            setResendingId(null);
        }
    };

    const handleExportSessions = () => {
        const headers = ['Candidate', 'Email', 'Status', 'Aptitude', 'Reasoning', 'Coding Submissions', 'Decision', 'Started', 'Submitted'];
        const rows = filteredSessions.map((s) => [s.applicantName, s.applicantEmail, s.status, `${s.aptitudeCorrect}/${s.aptitudeTotal}`, `${s.reasoningCorrect}/${s.reasoningTotal}`, s.codingResults.length, s.hiringDecision ?? 'pending', s.startedAt ?? '', s.submittedAt ?? '']);
        exportToCSV(`sessions-${Date.now()}.csv`, headers, rows);
        toast.success('Sessions exported to CSV');
    };

    const handleExportOrgAnalytics = async () => {
        if (!user?.orgId) return;
        try {
            await downloadReport(`/api/v1/reporting/orgs/${user.orgId}/cheating-insights/export`, 'pdf', `cheating-insights-${Date.now()}.pdf`);
            toast.success('PDF report downloaded');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to download PDF';
            toast.danger(message);
        }
    };

    const applicantColumns: GlassTableColumn<ApplicantDTO>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (row) => <span className="font-medium text-text-primary">{row.name}</span>,
        },
        {
            key: 'email',
            header: 'Email',
            render: (row) => <span className="text-text-secondary">{row.email}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
                <GlassBadge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                    {row.status}
                </GlassBadge>
            ),
        },
        {
            key: 'createdAt',
            header: 'Applied',
            render: (row) => <span className="text-text-muted">{formatDate(row.createdAt)}</span>,
        },
        {
            key: 'actions',
            header: '',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    {row.status === 'applied' && (
                        <>
                            <GlassButton size="sm" variant="secondary" onClick={() => handleShortlist(row.id)}>
                                <Check className="h-3.5 w-3.5" />
                                Shortlist
                            </GlassButton>
                            <GlassButton size="sm" variant="ghost" onClick={() => handleReject(row.id)}>
                                <X className="h-3.5 w-3.5" />
                                Reject
                            </GlassButton>
                        </>
                    )}
                    {(row.status === 'shortlisted' || row.status === 'test_sent') && (
                        <GlassButton
                            size="sm"
                            variant="primary"
                            onClick={() => {
                                setSelectedApplicant(row);
                                setTemplateId(DEFAULT_TEMPLATE_ID);
                                setExpiryDays('5');
                                setShowLinkModal(true);
                            }}
                        >
                            <Send className="h-3.5 w-3.5" />
                            Send Test
                        </GlassButton>
                    )}
                </div>
            ),
        },
    ];

    const sessionColumns: GlassTableColumn<SessionReportDTO>[] = [
        {
            key: 'applicant',
            header: 'Candidate',
            render: (row) => <span className="font-medium text-text-primary">{row.applicantName}</span>,
        },
        {
            key: 'email',
            header: 'Email',
            render: (row) => <span className="text-text-secondary">{row.applicantEmail}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
                <GlassBadge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                    {row.status}
                </GlassBadge>
            ),
        },
        {
            key: 'aptitude',
            header: 'Aptitude',
            render: (row) => (
                <span className="text-text-secondary">
                    {row.aptitudeCorrect}/{row.aptitudeTotal}
                </span>
            ),
        },
        {
            key: 'reasoning',
            header: 'Reasoning',
            render: (row) => (
                <span className="text-text-secondary">
                    {row.reasoningCorrect}/{row.reasoningTotal}
                </span>
            ),
        },
        {
            key: 'coding',
            header: 'Coding',
            render: (row) => (
                <span className="text-text-secondary">
                    {row.codingResults.length} submission{row.codingResults.length !== 1 ? 's' : ''}
                </span>
            ),
        },
        {
            key: 'decision',
            header: 'Decision',
            render: (row) =>
                row.hiringDecision ? (
                    <GlassBadge tone={row.hiringDecision === 'pass' ? 'success' : 'danger'}>
                        {row.hiringDecision}
                    </GlassBadge>
                ) : (
                    <span className="text-text-muted">Pending</span>
                ),
        },
        {
            key: 'actions',
            header: '',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <GlassButton size="sm" variant="ghost" onClick={() => handleViewReport(row.sessionId)}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                    </GlassButton>
                    <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResendInvite(row)}
                        isLoading={resendingId === row.sessionId}
                        disabled={resendingId === row.sessionId}
                    >
                        <Send className="h-3.5 w-3.5" />
                        Resend
                    </GlassButton>
                    {row.status === 'submitted' && !row.hiringDecision && (
                        <>
                            <GlassButton size="sm" variant="secondary" onClick={() => openDecisionModal(row, 'pass')}>
                                <ThumbsUp className="h-3.5 w-3.5" />
                                Pass
                            </GlassButton>
                            <GlassButton size="sm" variant="ghost" onClick={() => openDecisionModal(row, 'fail')}>
                                <ThumbsDown className="h-3.5 w-3.5" />
                                Fail
                            </GlassButton>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">HR Dashboard</h1>
                    <p className="mt-1 text-sm text-text-secondary">Manage applicants and assessment sessions</p>
                </div>
                <GlassButton variant="primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus className="h-4 w-4" />
                    Add Applicant
                </GlassButton>
            </div>

            <div className="flex gap-1 border-b border-border-subtle">
                <button
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === 'applicants'
                            ? 'border-b-2 border-accent text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('applicants')}
                >
                    <Users className="h-4 w-4" />
                    Applicants ({applicants.length})
                </button>
                <button
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === 'sessions'
                            ? 'border-b-2 border-accent text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('sessions')}
                >
                    <FileText className="h-4 w-4" />
                    Sessions ({sessions.length})
                </button>
                <button
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === 'monitoring'
                            ? 'border-b-2 border-accent text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('monitoring')}
                >
                    <Monitor className="h-4 w-4" />
                    Live Monitor
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
            ) : activeTab === 'applicants' ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                            <input
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                placeholder="Search by name or email..."
                                className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                            />
                        </div>
                        <GlassSelect value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            options={[{ value: 'all', label: 'All statuses' }, { value: 'applied', label: 'Applied' }, { value: 'shortlisted', label: 'Shortlisted' }, { value: 'test_sent', label: 'Test Sent' }, { value: 'rejected', label: 'Rejected' }]}
                            className="w-40" />
                        <GlassSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'name', label: 'Name A-Z' }]}
                            className="w-36" />
                        <GlassButton variant="secondary" size="sm" onClick={handleExportApplicants}><Download className="h-4 w-4" /> Export</GlassButton>
                    </div>
                    <GlassTable
                        columns={applicantColumns}
                        rows={pagedApplicants}
                        rowKey={(row) => row.id}
                        emptyMessage="No applicants found."
                    />
                    <GlassPagination page={page} totalPages={applicantTotalPages} onPageChange={setPage} totalItems={filteredApplicants.length} pageSize={PAGE_SIZE} />
                </div>
            ) : activeTab === 'sessions' ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                            <input
                                value={sessionSearch}
                                onChange={(e) => { setSessionSearch(e.target.value); setSessionPage(1); }}
                                placeholder="Search sessions..."
                                className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                            />
                        </div>
                        <GlassSelect value={sessionStatusFilter} onChange={(e) => { setSessionStatusFilter(e.target.value); setSessionPage(1); }}
                            options={[{ value: 'all', label: 'All statuses' }, { value: 'in_progress', label: 'In Progress' }, { value: 'submitted', label: 'Submitted' }]}
                            className="w-40" />
                        <GlassButton variant="secondary" size="sm" onClick={handleExportSessions}><Download className="h-4 w-4" /> Export</GlassButton>
                        <GlassButton variant="secondary" size="sm" onClick={handleExportOrgAnalytics}><FileText className="h-4 w-4" /> PDF Report</GlassButton>
                    </div>
                    <GlassTable
                        columns={sessionColumns}
                        rows={pagedSessions}
                        rowKey={(row) => row.sessionId}
                        emptyMessage="No assessment sessions found."
                    />
                    <GlassPagination page={sessionPage} totalPages={sessionTotalPages} onPageChange={setSessionPage} totalItems={filteredSessions.length} pageSize={PAGE_SIZE} />
                </div>
            ) : activeTab === 'monitoring' ? (
                <MonitoringGrid />
            ) : null}

            {/* Add Applicant Modal */}
            <GlassModal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Applicant">
                <div className="space-y-4">
                    <GlassInput
                        label="Full Name"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                    />
                    <GlassInput
                        label="Email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="jane@example.com"
                        required
                    />
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-text-secondary">Resume (optional)</label>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setResumeFile(file);
                                        setResumeFileName(file ? file.name : '');
                                    }}
                                    className="hidden"
                                    id="resume-upload"
                                />
                                <label
                                    htmlFor="resume-upload"
                                    className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-text-secondary hover:bg-surface-hover"
                                >
                                    <FileText className="h-4 w-4" />
                                    {resumeFileName || 'Choose file...'}
                                </label>
                                {resumeFile && (
                                    <button
                                        type="button"
                                        onClick={() => { setResumeFile(null); setResumeFileName(''); }}
                                        className="text-xs text-danger hover:text-danger"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">Or paste a resume URL:</p>
                            <GlassInput
                                type="url"
                                value={newResumeUrl}
                                onChange={(e) => setNewResumeUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <GlassButton variant="secondary" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </GlassButton>
                        <GlassButton variant="primary" onClick={handleAddApplicant} disabled={!newName || !newEmail} isLoading={addingApplicant}>
                            Add Applicant
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>

            {/* Generate Link Modal */}
            <GlassModal open={showLinkModal} onClose={() => setShowLinkModal(false)} title="Send Assessment Link">
                <div className="space-y-4">
                    <div className="rounded-md bg-surface-2 p-3">
                        <p className="text-sm text-text-secondary">
                            Sending assessment to: <span className="font-medium text-text-primary">{selectedApplicant?.name}</span>
                        </p>
                        <p className="text-sm text-text-muted">{selectedApplicant?.email}</p>
                    </div>
                    <GlassInput
                        label="Template ID"
                        type="text"
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        placeholder="Assessment template UUID"
                        hint="Default template is pre-filled — change only if you have a custom template"
                        required
                    />
                    <GlassSelect
                        label="Expiry (days)"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(e.target.value)}
                        options={[
                            { value: '1', label: '1 day' },
                            { value: '3', label: '3 days' },
                            { value: '5', label: '5 days (default)' },
                            { value: '7', label: '7 days' },
                        ]}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <GlassButton variant="secondary" onClick={() => setShowLinkModal(false)}>
                            Cancel
                        </GlassButton>
                        <GlassButton variant="primary" onClick={handleGenerateLink} disabled={!templateId} isLoading={generatingLink}>
                            Generate & Copy Link
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>

            {/* Session Report Modal */}
            <GlassModal open={showReportModal} onClose={() => setShowReportModal(false)} title="Session Report">
                {selectedSession && (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Candidate Info */}
                        <div className="rounded-md bg-surface-2 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-text-primary">{selectedSession.applicantName}</p>
                                    <p className="text-sm text-text-muted">{selectedSession.applicantEmail}</p>
                                </div>
                                <GlassBadge tone={STATUS_TONE[selectedSession.status] ?? 'neutral'}>
                                    {selectedSession.status}
                                </GlassBadge>
                            </div>
                            <div className="mt-3 flex gap-6 text-xs text-text-muted">
                                <span>Started: {formatDateTime(selectedSession.startedAt)}</span>
                                <span>Submitted: {formatDateTime(selectedSession.submittedAt)}</span>
                            </div>
                        </div>

                        {/* Scores */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md border border-border-subtle bg-surface-2 p-3">
                                <p className="text-xs font-medium text-text-muted">Aptitude</p>
                                <p className="mt-1 text-lg font-bold text-text-primary">
                                    {selectedSession.aptitudeCorrect}/{selectedSession.aptitudeTotal}
                                </p>
                            </div>
                            <div className="rounded-md border border-border-subtle bg-surface-2 p-3">
                                <p className="text-xs font-medium text-text-muted">Reasoning</p>
                                <p className="mt-1 text-lg font-bold text-text-primary">
                                    {selectedSession.reasoningCorrect}/{selectedSession.reasoningTotal}
                                </p>
                            </div>
                        </div>

                        {/* Coding Submissions */}
                        <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                                Coding Submissions ({selectedSession.codingResults.length})
                            </p>
                            {selectedSession.codingResults.length === 0 ? (
                                <p className="text-sm text-text-muted">No coding submissions.</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedSession.codingResults.map((cs: CodingResultDTO, i: number) => (
                                        <div key={i} className="rounded-md border border-border-subtle bg-surface-2 p-3">
                                            <div className="flex items-center gap-2">
                                                <Code2 className="h-4 w-4 text-text-muted" />
                                                <span className="text-sm font-medium text-text-primary">{cs.language}</span>
                                                <span className="ml-auto text-xs text-text-muted">
                                                    {cs.visibleTestsPassed + cs.hiddenTestsPassed}/{cs.visibleTestsPassed + cs.hiddenTestsTotal} tests passed
                                                </span>
                                            </div>
                                            <div className="mt-2 flex gap-4 text-xs">
                                                <span className="text-text-secondary">Visible: {cs.visibleTestsPassed} passed</span>
                                                <span className="text-text-secondary">Hidden: {cs.hiddenTestsPassed}/{cs.hiddenTestsTotal} passed</span>
                                                <span className="text-text-muted">{cs.runtimeMs}ms</span>
                                            </div>
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-xs text-accent hover:text-accent-hover">View code</summary>
                                                <pre className="mt-2 max-h-48 overflow-auto rounded bg-canvas p-3 text-xs text-text-secondary">
                                                    <code>{cs.code}</code>
                                                </pre>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Proctoring Events */}
                        <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                                Proctoring Events ({selectedSession.proctoringEvents.length})
                            </p>
                            {selectedSession.proctoringEvents.length === 0 ? (
                                <p className="text-sm text-text-muted">No proctoring issues detected.</p>
                            ) : (
                                <div className="space-y-1">
                                    {selectedSession.proctoringEvents.map((ev, i) => (
                                        <div key={i} className="flex items-center gap-2 rounded bg-surface-2 px-3 py-2 text-xs">
                                            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                            <span className="text-text-secondary">{ev.eventType}</span>
                                            <span className="ml-auto text-text-muted">
                                                Warning #{ev.warningNumber} — {formatDateTime(ev.occurredAt)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hiring Decision */}
                        {selectedSession.hiringDecision && (
                            <div className="rounded-md border border-border-subtle bg-surface-2 p-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-muted">Hiring Decision:</span>
                                    <GlassBadge tone={selectedSession.hiringDecision === 'pass' ? 'success' : 'danger'}>
                                        {selectedSession.hiringDecision}
                                    </GlassBadge>
                                </div>
                                {selectedSession.technicalManagerNotes && (
                                    <p className="mt-2 text-sm text-text-secondary">{selectedSession.technicalManagerNotes}</p>
                                )}
                            </div>
                        )}

                        {/* Decision Actions */}
                        {selectedSession.status === 'submitted' && !selectedSession.hiringDecision && (
                            <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
                                <GlassButton
                                    variant="secondary"
                                    onClick={() => {
                                        setShowReportModal(false);
                                        openDecisionModal(selectedSession, 'pass');
                                    }}
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                    Mark as Pass
                                </GlassButton>
                                <GlassButton
                                    variant="danger"
                                    onClick={() => {
                                        setShowReportModal(false);
                                        openDecisionModal(selectedSession, 'fail');
                                    }}
                                >
                                    <ThumbsDown className="h-4 w-4" />
                                    Mark as Fail
                                </GlassButton>
                            </div>
                        )}
                    </div>
                )}
            </GlassModal>

            {/* Hiring Decision Modal */}
            <GlassModal
                open={showDecisionModal}
                onClose={() => setShowDecisionModal(false)}
                title={`Mark as ${decisionType === 'pass' ? 'Pass' : 'Fail'}`}
            >
                <div className="space-y-4">
                    <div className="rounded-md bg-surface-2 p-3">
                        <p className="text-sm text-text-secondary">
                            Candidate: <span className="font-medium text-text-primary">{selectedSession?.applicantName}</span>
                        </p>
                        <p className="text-sm text-text-muted">{selectedSession?.applicantEmail}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                decisionType === 'pass'
                                    ? 'border-success bg-success-bg text-success'
                                    : 'border-border-subtle text-text-secondary hover:bg-surface-2'
                            }`}
                            onClick={() => setDecisionType('pass')}
                        >
                            <ThumbsUp className="mr-1.5 inline h-4 w-4" />
                            Pass
                        </button>
                        <button
                            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                decisionType === 'fail'
                                    ? 'border-danger bg-danger-bg text-danger'
                                    : 'border-border-subtle text-text-secondary hover:bg-surface-2'
                            }`}
                            onClick={() => setDecisionType('fail')}
                        >
                            <ThumbsDown className="mr-1.5 inline h-4 w-4" />
                            Fail
                        </button>
                    </div>
                    <GlassInput
                        label="Notes (optional)"
                        type="text"
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Add any notes about this decision..."
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <GlassButton variant="secondary" onClick={() => setShowDecisionModal(false)}>
                            Cancel
                        </GlassButton>
                        <GlassButton
                            variant={decisionType === 'pass' ? 'primary' : 'danger'}
                            onClick={handleHiringDecision}
                            isLoading={submittingDecision}
                        >
                            Submit Decision
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
}
