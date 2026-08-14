import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { GlassCard, GlassButton, GlassInput, GlassBadge, GlassSelect, GlassCheckbox, GlassModal } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { Lock, Plus, FileText, Settings } from 'lucide-react';

interface AssessmentTemplate {
  id: string;
  name: string;
  aptitudeDurationMin: number;
  reasoningDurationMin: number;
  codingDurationMin: number;
}

interface AssessmentItem {
  id: string;
  name: string;
  templateId: string;
  proctoringLevel: string;
  lockedAt: string | null;
  version: number;
}

export default function AssessmentCreationPage() {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    templateId: '',
    proctoringLevel: 'standard',
    passThreshold: 60,
    negativeMarking: false,
    randomizeQuestions: false,
    scheduleDate: '',
    scheduleTime: '',
  });

  useEffect(() => {
    loadTemplates();
    loadAssessments();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.get<AssessmentTemplate[]>('/api/v1/assessment/templates');
      setTemplates(data);
    } catch {
      setTemplates([]);
    }
  };

  const loadAssessments = async () => {
    try {
      const data = await api.get<AssessmentItem[]>('/api/v1/assessment/assessments');
      setAssessments(data);
    } catch {
      setAssessments([]);
    }
  };

  const handleCreate = async () => {
    const scoringConfig = JSON.stringify({
      passThreshold: form.passThreshold,
      negativeMarking: form.negativeMarking,
      randomizeQuestions: form.randomizeQuestions,
      scheduleDate: form.scheduleDate ? `${form.scheduleDate}T${form.scheduleTime || '09:00'}` : null,
    });

    try {
      await api.post('/api/v1/assessment/assessments', {
        name: form.name,
        templateId: form.templateId,
        scoringConfig,
        proctoringLevel: form.proctoringLevel,
      });
      toast.success('Assessment created successfully');
      setShowCreate(false);
      setForm({
        name: '', templateId: '', proctoringLevel: 'standard',
        passThreshold: 60, negativeMarking: false, randomizeQuestions: false,
        scheduleDate: '', scheduleTime: '',
      });
      loadAssessments();
    } catch (e: any) {
      toast.danger('Failed to create assessment', e.message);
    }
  };

  const handleLock = async (id: string) => {
    try {
      await api.put(`/api/v1/assessment/assessments/${id}/lock`, {});
      toast.success('Assessment locked — scoring config is now immutable');
      loadAssessments();
    } catch (e: any) {
      toast.danger('Failed to lock assessment', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Assessments</h1>
          <p className="mt-1 text-sm text-text-secondary">Create and schedule assessments with scoring configuration</p>
        </div>
        <GlassButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Assessment
        </GlassButton>
      </div>

      {/* Existing Assessments */}
      <GlassCard static className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Configured Assessments</h2>
        </div>
        {assessments.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No assessments configured yet.</p>
        ) : (
          <div className="space-y-2">
            {assessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{a.name}</p>
                    <p className="text-xs text-text-muted">
                      Proctoring: {a.proctoringLevel} · v{a.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GlassBadge tone={a.lockedAt ? 'success' : 'neutral'}>
                    {a.lockedAt ? <><Lock className="mr-1 h-3 w-3" />Locked</> : 'Draft'}
                  </GlassBadge>
                  {!a.lockedAt && (
                    <GlassButton variant="secondary" size="sm" onClick={() => handleLock(a.id)}>
                      <Lock className="h-3 w-3" /> Lock
                    </GlassButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Create Assessment Modal */}
      <GlassModal open={showCreate} onClose={() => setShowCreate(false)} title="Create Assessment">
        <div className="space-y-4">
          <GlassInput
            label="Assessment Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Senior Backend Engineer Assessment"
          />
          <GlassSelect
            label="Template"
            name="templateId"
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value })}
            options={[
              { value: '', label: 'Select a template...' },
              ...templates.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          <GlassSelect
            label="Proctoring Level"
            name="proctoringLevel"
            value={form.proctoringLevel}
            onChange={(e) => setForm({ ...form, proctoringLevel: e.target.value })}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'strict', label: 'Strict' },
              { value: 'relaxed', label: 'Relaxed' },
            ]}
          />
          <GlassInput
            label="Pass Threshold (%)"
            name="passThreshold"
            type="number"
            value={form.passThreshold}
            onChange={(e) => setForm({ ...form, passThreshold: parseInt(e.target.value) || 60 })}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-text-secondary" />
                <span className="text-sm text-text-primary">Negative Marking</span>
              </div>
              <GlassCheckbox
                checked={form.negativeMarking}
                onChange={(v) => setForm({ ...form, negativeMarking: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-text-secondary" />
                <span className="text-sm text-text-primary">Randomize Questions per Candidate</span>
              </div>
              <GlassCheckbox
                checked={form.randomizeQuestions}
                onChange={(v) => setForm({ ...form, randomizeQuestions: v })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Schedule Date"
              name="scheduleDate"
              type="date"
              value={form.scheduleDate}
              onChange={(e) => setForm({ ...form, scheduleDate: e.target.value })}
            />
            <GlassInput
              label="Schedule Time"
              name="scheduleTime"
              type="time"
              value={form.scheduleTime}
              onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" size="sm" onClick={handleCreate}>Create Assessment</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
