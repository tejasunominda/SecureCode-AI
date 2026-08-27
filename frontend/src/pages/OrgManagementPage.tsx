import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { GlassCard, GlassButton, GlassInput, GlassBadge, GlassModal, GlassSelect } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { Building2, Users, Plus, Trash2, Shield, ChevronRight } from 'lucide-react';

interface OrgUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
  mfaEnabled: boolean;
}

interface SubOrg {
  id: string;
  name: string;
  tier: string;
  status: string;
  dataResidency: string;
  userCount?: number;
}

export default function OrgManagementPage() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId;
  const [subOrgs, setSubOrgs] = useState<SubOrg[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [newOrg, setNewOrg] = useState({ name: '', tier: 'starter', dataResidency: 'us' });
  const [newUser, setNewUser] = useState({ email: '', role: 'HR' });

  useEffect(() => {
    if (orgId) {
      loadSubOrgs();
      loadUsers();
    }
  }, [orgId]);

  const loadSubOrgs = async () => {
    if (!orgId) return;
    try {
      const data = await api.get<SubOrg[]>(`/api/v1/orgs/${orgId}/sub-orgs`);
      setSubOrgs(data);
    } catch {
      setSubOrgs([]);
    }
  };

  const loadUsers = async () => {
    if (!orgId) return;
    try {
      const data = await api.get<OrgUser[]>(`/api/v1/orgs/${orgId}/users`);
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  const handleCreateOrg = async () => {
    if (!orgId) return;
    try {
      await api.post(`/api/v1/orgs/${orgId}/sub-orgs`, { ...newOrg, parentOrgId: orgId });
      toast.success('Sub-organization created');
      setShowCreateOrg(false);
      setNewOrg({ name: '', tier: 'starter', dataResidency: 'us' });
      loadSubOrgs();
    } catch (e: any) {
      toast.danger('Failed to create sub-organization', e.message);
    }
  };

  const handleInviteUser = async () => {
    if (!orgId) return;
    try {
      await api.post(`/api/v1/orgs/${orgId}/users`, {
        email: newUser.email,
        roles: [newUser.role],
      });
      toast.success('User invited successfully');
      setShowInviteUser(false);
      setNewUser({ email: '', role: 'HR' });
      loadUsers();
    } catch (e: any) {
      toast.danger('Failed to invite user', e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!orgId) return;
    try {
      await api.patch(`/api/v1/orgs/${orgId}/users/${userId}`, { status: 'inactive' });
      toast.success('User removed');
      loadUsers();
    } catch (e: any) {
      toast.danger('Failed to remove user', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Organization Management</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage sub-organizations, users, and permissions</p>
        </div>
        <div className="flex gap-2">
          <GlassButton variant="secondary" size="sm" onClick={() => setShowInviteUser(true)}>
            <Users className="h-4 w-4" /> Invite User
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={() => setShowCreateOrg(true)}>
            <Plus className="h-4 w-4" /> New Sub-Org
          </GlassButton>
        </div>
      </div>

      {/* Sub-Organizations */}
      <GlassCard static className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Sub-Organizations</h2>
        </div>
        {subOrgs.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No sub-organizations yet. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {subOrgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-3 cursor-pointer hover:border-border-default"
                onClick={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{org.name}</p>
                    <p className="text-xs text-text-muted">{org.tier} · {org.dataResidency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GlassBadge tone={org.status === 'active' ? 'success' : 'neutral'}>{org.status}</GlassBadge>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Users */}
      <GlassCard static className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Users</h2>
        </div>
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No users found. Invite users to your organization.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-muted">
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Roles</th>
                  <th className="pb-2 pr-4">MFA</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border-subtle last:border-0">
                    <td className="py-3 pr-4 text-text-primary">{user.email}</td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1">
                        {user.roles.map((r) => (
                          <GlassBadge key={r} tone="info">{r}</GlassBadge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {user.mfaEnabled ? (
                        <GlassBadge tone="success"><Shield className="mr-1 h-3 w-3" />Enabled</GlassBadge>
                      ) : (
                        <GlassBadge tone="neutral">Disabled</GlassBadge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <GlassBadge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</GlassBadge>
                    </td>
                    <td className="py-3">
                      <GlassButton variant="danger" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="h-3 w-3" />
                      </GlassButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Create Sub-Org Modal */}
      <GlassModal open={showCreateOrg} onClose={() => setShowCreateOrg(false)} title="Create Sub-Organization">
        <div className="space-y-4">
          <GlassInput
            label="Organization Name"
            name="orgName"
            value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
            placeholder="Acme Subsidiary"
          />
          <GlassSelect
            label="Tier"
            name="tier"
            value={newOrg.tier}
            onChange={(e) => setNewOrg({ ...newOrg, tier: e.target.value })}
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'growth', label: 'Growth' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
          <GlassSelect
            label="Data Residency"
            name="dataResidency"
            value={newOrg.dataResidency}
            onChange={(e) => setNewOrg({ ...newOrg, dataResidency: e.target.value })}
            options={[
              { value: 'us', label: 'United States' },
              { value: 'eu', label: 'European Union' },
              { value: 'apac', label: 'Asia Pacific' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" size="sm" onClick={() => setShowCreateOrg(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" size="sm" onClick={handleCreateOrg}>Create</GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Invite User Modal */}
      <GlassModal open={showInviteUser} onClose={() => setShowInviteUser(false)} title="Invite User">
        <div className="space-y-4">
          <GlassInput
            label="Email Address"
            name="email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="user@company.com"
          />
          <GlassSelect
            label="Role"
            name="role"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            options={[
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
              { value: 'HR', label: 'HR' },
              { value: 'TECHNICAL_MANAGER', label: 'Technical Manager' },
              { value: 'CANDIDATE', label: 'Candidate' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" size="sm" onClick={() => setShowInviteUser(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" size="sm" onClick={handleInviteUser}>Send Invite</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
