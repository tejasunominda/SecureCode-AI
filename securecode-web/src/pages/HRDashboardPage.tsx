import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { assessmentApi, type ApplicantDTO, type SessionReportDTO } from '@/lib/assessment-api';
import { GlassButton, GlassInput, GlassBadge, GlassTable, GlassModal, GlassSelect } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import type { GlassTableColumn } from '@/components/ui';

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

export default function HRDashboardPage() {
    const user = useAuthStore((s) => s.user);
    const [applicants, setApplicants] = useState<ApplicantDTO[]>([]);
    const [sessions, setSessions] = useState<SessionReportDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicantDTO | null>(null);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newResumeUrl, setNewResumeUrl] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [activeTab, setActiveTab] = useState('applicants');

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
        try {
            await assessmentApi.createApplicant(user.orgId, newName, newEmail, newResumeUrl || undefined);
            toast.success('Applicant added');
            setShowAddModal(false);
            setNewName('');
            setNewEmail('');
            setNewResumeUrl('');
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add applicant';
            toast.danger(message);
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
        if (!user?.orgId || !user?.userId || !selectedApplicant || !templateId) return;
        try {
            const link = await assessmentApi.generateLink(
                user.orgId, user.userId,
                selectedApplicant.id, templateId
            );
            await navigator.clipboard.writeText(`${window.location.origin}${link.testUrl}`);
            toast.success('Assessment link generated and copied to clipboard');
            setShowLinkModal(false);
            setTemplateId('');
            setSelectedApplicant(null);
            fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate link';
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
                                Shortlist
                            </GlassButton>
                            <GlassButton size="sm" variant="ghost" onClick={() => handleReject(row.id)}>
                                Reject
                            </GlassButton>
                        </>
                    )}
                    {row.status === 'shortlisted' && (
                        <GlassButton
                            size="sm"
                            variant="primary"
                            onClick={() => {
                                setSelectedApplicant(row);
                                setShowLinkModal(true);
                            }}
                        >
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
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-text-primary">HR Dashboard</h1>
                    <p className="mt-1 text-sm text-text-secondary">Manage applicants and assessment sessions</p>
                </div>
                <GlassButton variant="primary" onClick={() => setShowAddModal(true)}>
                    Add Applicant
                </GlassButton>
            </div>

            <div className="flex gap-2 border-b border-border-subtle pb-px">
                <button
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'applicants'
                            ? 'border-b-2 border-accent text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('applicants')}
                >
                    Applicants ({applicants.length})
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'sessions'
                            ? 'border-b-2 border-accent text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('sessions')}
                >
                    Sessions ({sessions.length})
                </button>
            </div>

            {loading ? (
                <div className="py-12 text-center text-text-muted">Loading...</div>
            ) : activeTab === 'applicants' ? (
                <GlassTable
                    columns={applicantColumns}
                    rows={applicants}
                    rowKey={(row) => row.id}
                    emptyMessage="No applicants yet. Click 'Add Applicant' to get started."
                />
            ) : (
                <GlassTable
                    columns={sessionColumns}
                    rows={sessions}
                    rowKey={(row) => row.sessionId}
                    emptyMessage="No assessment sessions yet."
                />
            )}

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
                    <GlassInput
                        label="Resume URL (optional)"
                        type="url"
                        value={newResumeUrl}
                        onChange={(e) => setNewResumeUrl(e.target.value)}
                        placeholder="https://..."
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <GlassButton variant="secondary" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </GlassButton>
                        <GlassButton variant="primary" onClick={handleAddApplicant} disabled={!newName || !newEmail}>
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
                        placeholder="Enter assessment template UUID"
                        hint="The template determines test duration and sections"
                        required
                    />
                    <GlassSelect
                        label="Expiry (days)"
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
                        <GlassButton variant="primary" onClick={handleGenerateLink} disabled={!templateId}>
                            Generate & Copy Link
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
}
