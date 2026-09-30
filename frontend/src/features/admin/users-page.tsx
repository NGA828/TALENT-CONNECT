'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useDebounce } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { formatDate, humanize, timeAgo } from '@/lib/format';
import type { AdminUser, Paginated, UserStatus } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { SearchInput, Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/modal';
import { useAuth } from '@/features/auth/auth-context';
import { ReasonModal } from './reason-modal';

export function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ user: AdminUser; status: UserStatus } | null>(null);
  const [busy, setBusy] = useState(false);
  const dq = useDebounce(q);
  const state = useApi<Paginated<AdminUser>>('/admin/users', { role, status, q: dq, page, pageSize: 12 });

  const apply = async (reason?: string) => {
    if (!target) return;
    setBusy(true);
    try {
      await api.patch(`/admin/users/${target.user.id}/status`, { status: target.status, reason: reason || undefined });
      toast.success(`${target.user.firstName} ${target.user.lastName} is now ${target.status.toLowerCase()}.`);
      setTarget(null);
      await state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Users" description="Every account on the platform. Suspend or deactivate accounts that break the rules; suspended users are signed out immediately." />
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput aria-label="Search users" className="min-w-56 flex-1" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select aria-label="Role" className="w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="TALENT">Talent</option><option value="PROMOTER">Promoter</option><option value="ADMIN">Admin</option></Select>
        <Select aria-label="Status" className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DEACTIVATED">Deactivated</option></Select>
      </div>
      <QueryState state={state} skeleton={<SkeletonRows rows={6} />}>
        {(d) =>
          d.items.length === 0 ? (
            <EmptyState filtered icon={<Users className="size-6" />} title="No users match" description="Adjust the search or filters." />
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-semibold">User</th><th className="px-4 py-2.5 font-semibold">Role</th><th className="px-4 py-2.5 font-semibold">Profile</th><th className="px-4 py-2.5 font-semibold">Joined</th><th className="px-4 py-2.5 font-semibold">Last sign-in</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5 text-right font-semibold">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.items.map((u) => {
                        const locked = u.role === 'ADMIN' || u.id === me?.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar firstName={u.firstName} lastName={u.lastName} src={u.avatarUrl} size={32} /><div className="min-w-0"><p className="truncate font-medium text-slate-900">{u.firstName} {u.lastName}</p><p className="truncate text-xs text-slate-500">{u.email}</p></div></div></td>
                            <td className="px-4 py-2.5"><Badge tone={u.role === 'ADMIN' ? 'amber' : u.role === 'PROMOTER' ? 'teal' : 'violet'}>{humanize(u.role)}</Badge></td>
                            <td className="px-4 py-2.5 text-slate-600">{u.talent?.specialization ?? u.promoter?.agencyName ?? '—'}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(u.createdAt)}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
                            <td className="px-4 py-2.5 text-right">
                              {locked ? <span className="text-xs text-slate-400">Protected</span> : u.status === 'ACTIVE' ? (
                                <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setTarget({ user: u, status: 'SUSPENDED' })}>Suspend</Button><Button size="sm" variant="ghost" onClick={() => setTarget({ user: u, status: 'DEACTIVATED' })}>Deactivate</Button></div>
                              ) : <Button size="sm" variant="outline" onClick={() => setTarget({ user: u, status: 'ACTIVE' })}>Reactivate</Button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Pagination page={d.page} totalPages={d.totalPages} total={d.total} pageSize={d.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>

      <ReasonModal open={!!target && target.status !== 'ACTIVE'} onClose={() => setTarget(null)} busy={busy} tone="danger" onSubmit={apply}
        title={`${target?.status === 'SUSPENDED' ? 'Suspend' : 'Deactivate'} ${target?.user.firstName ?? ''} ${target?.user.lastName ?? ''}`}
        description="The user will be signed out and blocked from signing in until reactivated." confirmLabel={target?.status === 'SUSPENDED' ? 'Suspend account' : 'Deactivate account'} />
      <ConfirmDialog open={!!target && target.status === 'ACTIVE'} onClose={() => setTarget(null)} onConfirm={() => apply()} tone="primary" confirmLabel="Reactivate" title="Reactivate this account?" description={`${target?.user.firstName ?? ''} ${target?.user.lastName ?? ''} will be able to sign in again.`} />
    </>
  );
}
