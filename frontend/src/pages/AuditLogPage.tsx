import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { GlassCard, GlassInput, GlassBadge, GlassSelect, GlassButton } from '@/components/ui';
import { Search, Shield, Link2, Filter } from 'lucide-react';

interface AuditEntry {
  orgId: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  prevHash: string | null;
  entryHash: string;
  createdAt: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [orgId, setOrgId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const loadEntries = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (fromDate) params.append('from', new Date(fromDate).toISOString());
      if (toDate) params.append('to', new Date(toDate).toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<AuditEntry[]>(`/api/v1/audit/orgs/${orgId}${query}`);
      setEntries(data);
    } catch (e: any) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedOrg = localStorage.getItem('securecode_org_id');
    if (storedOrg) {
      setOrgId(storedOrg);
    }
  }, []);

  useEffect(() => {
    if (orgId) loadEntries();
  }, [orgId]);

  const actionTone = (action: string): 'success' | 'danger' | 'info' | 'warning' | 'neutral' => {
    if (action.includes('LOGIN') || action.includes('VERIFIED')) return 'success';
    if (action.includes('DELETE') || action.includes('DISABLE') || action.includes('REJECT')) return 'danger';
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'info';
    if (action.includes('PASSWORD') || action.includes('MFA')) return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Audit Log</h1>
        <p className="mt-1 text-sm text-text-secondary">Immutable, hash-chained record of all security-relevant actions</p>
      </div>

      {/* Filters */}
      <GlassCard static className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <GlassInput
            label="Organization ID"
            name="orgId"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="UUID"
          />
          <GlassSelect
            label="Entity Type"
            name="entityType"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            options={[
              { value: '', label: 'All types' },
              { value: 'app_user', label: 'User' },
              { value: 'organization', label: 'Organization' },
              { value: 'assessment', label: 'Assessment' },
              { value: 'question', label: 'Question' },
            ]}
          />
          <GlassInput
            label="From Date"
            name="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <GlassInput
            label="To Date"
            name="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <GlassButton variant="primary" size="sm" onClick={loadEntries}>
            <Search className="h-4 w-4" /> Search
          </GlassButton>
        </div>
      </GlassCard>

      {/* Hash Chain Integrity */}
      <GlassCard static className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-success" />
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Hash-chain integrity:</span>{' '}
            Each entry's <code className="text-xs">entryHash</code> incorporates the previous entry's hash,
            making tampering detectable. The first entry uses a genesis hash of all zeros.
          </p>
        </div>
      </GlassCard>

      {/* Audit Entries */}
      <GlassCard static className="p-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-text-muted">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No audit entries found. Adjust filters and search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-muted">
                  <th className="pb-2 pr-4">Timestamp</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Entity</th>
                  <th className="pb-2 pr-4">Actor</th>
                  <th className="pb-2 pr-4">Hash</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle last:border-0 cursor-pointer hover:bg-surface-2"
                    onClick={() => setSelectedEntry(selectedEntry === entry ? null : entry)}
                  >
                    <td className="py-3 pr-4 text-text-muted text-xs">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <GlassBadge tone={actionTone(entry.action)}>{entry.action}</GlassBadge>
                    </td>
                    <td className="py-3 pr-4 text-text-secondary text-xs">
                      {entry.entityType ? `${entry.entityType}:${entry.entityId?.substring(0, 8)}...` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-text-muted text-xs">
                      {entry.actorUserId ? entry.actorUserId.substring(0, 8) + '...' : 'system'}
                    </td>
                    <td className="py-3 pr-4 text-text-muted text-xs font-mono">
                      {entry.entryHash.substring(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Detail View */}
      {selectedEntry && (
        <GlassCard static className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-text-secondary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Entry Detail</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Action</p>
              <p className="text-text-primary">{selectedEntry.action}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Entity Type</p>
              <p className="text-text-primary">{selectedEntry.entityType || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Entity ID</p>
              <p className="text-text-primary font-mono text-xs">{selectedEntry.entityId || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Actor User ID</p>
              <p className="text-text-primary font-mono text-xs">{selectedEntry.actorUserId || 'system'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Previous Hash</p>
              <p className="text-text-primary font-mono text-xs break-all">{selectedEntry.prevHash || 'genesis'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Entry Hash</p>
              <p className="text-text-primary font-mono text-xs break-all">{selectedEntry.entryHash}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-text-muted">Created At</p>
              <p className="text-text-primary">{new Date(selectedEntry.createdAt).toISOString()}</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
