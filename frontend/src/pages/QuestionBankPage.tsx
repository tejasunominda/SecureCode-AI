import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { assessmentApi, type QuestionDTO } from '@/lib/assessment-api';
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassTextarea, GlassModal, GlassTable, GlassPagination, GlassCheckbox } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { exportToCSV, exportToJSON, parseCSV } from '@/lib/export-utils';
import { useDebounce } from '@/hooks/useUtils';
import { Plus, Search, Edit2, Upload, Download, Copy, CheckCircle, Filter, Send, ThumbsUp, ThumbsDown } from 'lucide-react';

const PAGE_SIZE = 10;

export default function QuestionBankPage() {
  const user = useAuthStore((s) => s.user);
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDTO | null>(null);
  const [cloning, setCloning] = useState(false);

  // Form state
  const [formType, setFormType] = useState('aptitude');
  const [formBody, setFormBody] = useState('');
  const [formOptionA, setFormOptionA] = useState('');
  const [formOptionB, setFormOptionB] = useState('');
  const [formOptionC, setFormOptionC] = useState('');
  const [formOptionD, setFormOptionD] = useState('');
  const [formCorrect, setFormCorrect] = useState('A');
  const [formDifficulty, setFormDifficulty] = useState('easy');
  const [formTags, setFormTags] = useState('');
  const [formTestCases, setFormTestCases] = useState('');
  const [formHiddenTestCases, setFormHiddenTestCases] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (!user?.orgId) return;
    try {
      const qs = await assessmentApi.listQuestions(user.orgId);
      setQuestions(qs);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const filtered = useMemo(() => {
    let result = questions;
    if (statusFilter !== 'all') result = result.filter((q) => q.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter((q) => q.type === typeFilter);
    if (difficultyFilter !== 'all') result = result.filter((q) => q.difficulty === difficultyFilter);
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((q) => q.body.toLowerCase().includes(lower) || (q.tags ?? '').toLowerCase().includes(lower));
    }
    if (tagFilter) {
      const tags = tagFilter.toLowerCase().split(',').map((t) => t.trim());
      result = result.filter((q) => (q.tags ?? '').toLowerCase().split(',').some((t) => tags.includes(t.trim())));
    }
    if (sortBy === 'newest') result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === 'oldest') result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sortBy === 'difficulty') {
      const order = { easy: 0, medium: 1, hard: 2 };
      result = [...result].sort((a, b) => (order[a.difficulty as keyof typeof order] ?? 3) - (order[b.difficulty as keyof typeof order] ?? 3));
    }
    return result;
  }, [questions, typeFilter, difficultyFilter, debouncedSearch, tagFilter, sortBy, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetForm = () => {
    setFormType('aptitude'); setFormBody(''); setFormOptionA(''); setFormOptionB('');
    setFormOptionC(''); setFormOptionD(''); setFormCorrect('A'); setFormDifficulty('easy');
    setFormTags(''); setFormTestCases(''); setFormHiddenTestCases(''); setFormPublished(true);
    setEditingQuestion(null);
  };

  const handleSave = async () => {
    if (!user?.orgId || !user?.userId || !formBody.trim()) {
      toast.danger('Question body is required');
      return;
    }
    setSaving(true);
    try {
      const created = await assessmentApi.createQuestion(user.orgId, user.userId, {
        type: formType,
        body: formBody,
        optionA: formType !== 'coding' ? formOptionA : undefined,
        optionB: formType !== 'coding' ? formOptionB : undefined,
        optionC: formType !== 'coding' ? formOptionC : undefined,
        optionD: formType !== 'coding' ? formOptionD : undefined,
        correctOption: formType !== 'coding' ? formCorrect : undefined,
        difficulty: formDifficulty,
        tags: formTags || undefined,
        testCases: formType === 'coding' ? formTestCases : undefined,
        hiddenTestCases: formType === 'coding' ? formHiddenTestCases : undefined,
      });
      if (formPublished && created.id) {
        await assessmentApi.submitQuestionForReview(created.id);
      }
      toast.success(editingQuestion ? 'Question updated' : 'Question created');
      setShowCreateModal(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async (q: QuestionDTO) => {
    if (!user?.orgId || !user?.userId) return;
    setCloning(true);
    try {
      await assessmentApi.createQuestion(user.orgId, user.userId, {
        type: q.type,
        body: `${q.body} (Clone)`,
        optionA: q.optionA ?? undefined,
        optionB: q.optionB ?? undefined,
        optionC: q.optionC ?? undefined,
        optionD: q.optionD ?? undefined,
        correctOption: q.correctOption ?? undefined,
        difficulty: q.difficulty,
        tags: q.tags ?? undefined,
        testCases: q.testCases ?? undefined,
        hiddenTestCases: q.hiddenTestCases ?? undefined,
      });
      toast.success('Question cloned');
      fetchQuestions();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to clone');
    } finally {
      setCloning(false);
    }
  };

  const handlePublish = async (q: QuestionDTO) => {
    try {
      await assessmentApi.publishQuestion(q.id);
      toast.success('Question published');
      fetchQuestions();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleSubmitReview = async (q: QuestionDTO) => {
    try {
      await assessmentApi.submitQuestionForReview(q.id);
      toast.success('Question submitted for review');
      fetchQuestions();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to submit for review');
    }
  };

  const handleApprove = async (q: QuestionDTO) => {
    try {
      await assessmentApi.approveQuestion(q.id);
      toast.success('Question approved');
      fetchQuestions();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (q: QuestionDTO) => {
    try {
      await assessmentApi.rejectQuestion(q.id);
      toast.warning('Question rejected');
      fetchQuestions();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Body', 'Difficulty', 'Tags', 'Status', 'Version', 'Created'];
    const rows = filtered.map((q) => [q.id, q.type, q.body, q.difficulty, q.tags ?? '', q.status, q.version, q.createdAt]);
    exportToCSV(`questions-${Date.now()}.csv`, headers, rows);
    toast.success('Questions exported to CSV');
  };

  const handleExportJSON = () => {
    exportToJSON(`questions-${Date.now()}.json`, filtered);
    toast.success('Questions exported to JSON');
  };

  const handleImport = async () => {
    const rows = parseCSV(importText);
    if (rows.length < 2) {
      toast.danger('CSV must have a header row and at least one data row');
      return;
    }
    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const typeIdx = headers.indexOf('type');
    const bodyIdx = headers.indexOf('body');
    const diffIdx = headers.indexOf('difficulty');
    const tagsIdx = headers.indexOf('tags');
    if (bodyIdx < 0) {
      toast.danger('CSV must include at least a "body" column');
      return;
    }
    if (!user?.orgId || !user?.userId) return;
    setImporting(true);
    let successCount = 0;
    let failCount = 0;
    const promises: Promise<void>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[bodyIdx]?.trim()) continue;
      const q = {
        type: typeIdx >= 0 ? row[typeIdx] || 'aptitude' : 'aptitude',
        body: row[bodyIdx],
        difficulty: diffIdx >= 0 ? row[diffIdx] || 'easy' : 'easy',
        tags: tagsIdx >= 0 ? row[tagsIdx] : undefined,
      };
      promises.push(
        assessmentApi.createQuestion(user.orgId, user.userId, q)
          .then(() => { successCount++; })
          .catch(() => { failCount++; })
      );
    }
    await Promise.all(promises);
    setImporting(false);
    setShowImportModal(false);
    setImportText('');
    if (failCount === 0) {
      toast.success(`${successCount} questions imported`);
    } else {
      toast.warning(`${successCount} imported, ${failCount} failed`, 'Some rows could not be imported. Check the CSV format.');
    }
    fetchQuestions();
  };

  const openEdit = (q: QuestionDTO) => {
    setEditingQuestion(q);
    setFormType(q.type);
    setFormBody(q.body);
    setFormOptionA(q.optionA ?? '');
    setFormOptionB(q.optionB ?? '');
    setFormOptionC(q.optionC ?? '');
    setFormOptionD(q.optionD ?? '');
    setFormCorrect(q.correctOption ?? 'A');
    setFormDifficulty(q.difficulty);
    setFormTags(q.tags ?? '');
    setFormTestCases(q.testCases ?? '');
    setFormHiddenTestCases(q.hiddenTestCases ?? '');
    setShowCreateModal(true);
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    questions.forEach((q) => (q.tags ?? '').split(',').forEach((t) => t.trim() && tagSet.add(t.trim())));
    return Array.from(tagSet);
  }, [questions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Question Bank</h1>
          <p className="mt-1 text-sm text-text-secondary">Create, manage, and import assessment questions</p>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton variant="secondary" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4" /> CSV</GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={handleExportJSON}><Download className="h-4 w-4" /> JSON</GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => setShowImportModal(true)}><Upload className="h-4 w-4" /> Import</GlassButton>
          <GlassButton variant="primary" size="sm" onClick={() => { resetForm(); setShowCreateModal(true); }}><Plus className="h-4 w-4" /> New Question</GlassButton>
        </div>
      </div>

      {/* Filters */}
      <GlassCard static className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search questions..."
              className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
          <GlassSelect value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[{ value: 'all', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'review', label: 'In Review' }, { value: 'approved', label: 'Approved' }, { value: 'published', label: 'Published' }, { value: 'rejected', label: 'Rejected' }]} />
          <GlassSelect value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            options={[{ value: 'all', label: 'All types' }, { value: 'aptitude', label: 'Aptitude' }, { value: 'reasoning', label: 'Reasoning' }, { value: 'coding', label: 'Coding' }]} />
          <GlassSelect value={difficultyFilter} onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
            options={[{ value: 'all', label: 'All difficulties' }, { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
          <GlassSelect value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All tags' }, ...allTags.map((t) => ({ value: t, label: t }))]} />
          <GlassSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'difficulty', label: 'By difficulty' }]} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
          <Filter className="h-3.5 w-3.5" />
          {filtered.length} question{filtered.length !== 1 ? 's' : ''} found
        </div>
      </GlassCard>

      {/* Questions Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : (
        <>
          <GlassTable
            columns={[
              { key: 'body', header: 'Question', render: (q) => (
                <div className="max-w-md">
                  <p className="truncate text-sm text-text-primary">{q.body}</p>
                  {q.tags && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.tags.split(',').slice(0, 3).map((t) => (
                        <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-muted">{t.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              )},
              { key: 'type', header: 'Type', render: (q) => <GlassBadge tone="info">{q.type}</GlassBadge> },
              { key: 'difficulty', header: 'Difficulty', render: (q) => (
                <GlassBadge tone={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'}>{q.difficulty}</GlassBadge>
              )},
              { key: 'status', header: 'Status', render: (q) => {
                const tone = q.status === 'published' ? 'success' : q.status === 'approved' ? 'info' : q.status === 'review' ? 'warning' : q.status === 'rejected' ? 'danger' : 'neutral';
                return <GlassBadge tone={tone}>{q.status}</GlassBadge>;
              } },
              { key: 'version', header: 'Ver', render: (q) => <span className="text-xs text-text-muted">v{q.version}</span> },
              { key: 'actions', header: 'Actions', render: (q) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(q)} className="rounded p-1.5 text-text-secondary hover:bg-surface-hover" title="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleClone(q)} disabled={cloning} className="rounded p-1.5 text-text-secondary hover:bg-surface-hover" title="Clone"><Copy className="h-3.5 w-3.5" /></button>
                  {(q.status === 'draft' || q.status === 'rejected') && (
                    <button onClick={() => handleSubmitReview(q)} className="rounded p-1.5 text-blue-400 hover:bg-surface-hover" title="Submit for Review"><Send className="h-3.5 w-3.5" /></button>
                  )}
                  {q.status === 'review' && (
                    <>
                      <button onClick={() => handleApprove(q)} className="rounded p-1.5 text-success hover:bg-surface-hover" title="Approve"><ThumbsUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleReject(q)} className="rounded p-1.5 text-danger hover:bg-surface-hover" title="Reject"><ThumbsDown className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  {q.status === 'approved' && (
                    <button onClick={() => handlePublish(q)} className="rounded p-1.5 text-success hover:bg-surface-hover" title="Publish"><CheckCircle className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              )},
            ]}
            rows={paged}
            rowKey={(q) => q.id}
            emptyMessage="No questions found. Create your first question!"
          />
          <GlassPagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
        </>
      )}

      {/* Create/Edit Modal */}
      <GlassModal open={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title={editingQuestion ? 'Edit Question' : 'Create Question'} className="max-w-2xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <GlassSelect label="Type" value={formType} onChange={(e) => setFormType(e.target.value)}
              options={[{ value: 'aptitude', label: 'Aptitude (MCQ)' }, { value: 'reasoning', label: 'Reasoning (MCQ)' }, { value: 'coding', label: 'Coding' }]} />
            <GlassSelect label="Difficulty" value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)}
              options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
          </div>
          <GlassTextarea label="Question Body" value={formBody} onChange={(e) => setFormBody(e.target.value)} placeholder="Enter the question..." rows={3} />
          <GlassInput label="Tags (comma-separated)" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="arrays, sorting, dynamic-programming" />
          {formType !== 'coding' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <GlassInput label="Option A" value={formOptionA} onChange={(e) => setFormOptionA(e.target.value)} />
                <GlassInput label="Option B" value={formOptionB} onChange={(e) => setFormOptionB(e.target.value)} />
                <GlassInput label="Option C" value={formOptionC} onChange={(e) => setFormOptionC(e.target.value)} />
                <GlassInput label="Option D" value={formOptionD} onChange={(e) => setFormOptionD(e.target.value)} />
              </div>
              <GlassSelect label="Correct Option" value={formCorrect} onChange={(e) => setFormCorrect(e.target.value)}
                options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'D', label: 'D' }]} />
            </>
          ) : (
            <>
              <GlassTextarea label="Visible Test Cases" value={formTestCases} onChange={(e) => setFormTestCases(e.target.value)}
                placeholder="input: [1,2,3] => output: 6&#10;input: [1,1,1] => output: 3" rows={4} />
              <GlassTextarea label="Hidden Test Cases" value={formHiddenTestCases} onChange={(e) => setFormHiddenTestCases(e.target.value)}
                placeholder="input: [10,20,30] => output: 60&#10;input: [5,5,5] => output: 15" rows={4} />
            </>
          )}
          <GlassCheckbox checked={formPublished} onChange={setFormPublished} label="Submit for review immediately" description="Question will be created as draft and submitted for review" />
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>Cancel</GlassButton>
            <GlassButton variant="primary" onClick={handleSave} disabled={!formBody.trim()} isLoading={saving}>
              {editingQuestion ? 'Update' : 'Create'} Question
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Import Modal */}
      <GlassModal open={showImportModal} onClose={() => setShowImportModal(false)} title="Import Questions from CSV" className="max-w-2xl">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            CSV format: <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">type,body,difficulty,tags,optionA,optionB,optionC,optionD,correctOption</code>
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Upload CSV File</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setImportText(reader.result as string);
                    reader.readAsText(file);
                }
              }}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-text hover:file:bg-accent-hover"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border-subtle" />
            <span>or paste CSV below</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
          <GlassTextarea label="CSV Content" value={importText} onChange={(e) => setImportText(e.target.value)}
            placeholder="type,body,difficulty,tags&#10;aptitude,What is 2+2?,easy,math&#10;reasoning,Find the pattern...,medium,patterns"
            rows={8} />
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" onClick={() => setShowImportModal(false)} disabled={importing}>Cancel</GlassButton>
            <GlassButton variant="primary" onClick={handleImport} disabled={!importText.trim() || importing} isLoading={importing}>Import</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
