'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiDeleteWithBody } from '@/shared/api/http-client';
import type { AdminUser, AllocateSeatFormData } from '@entities/user';
import { resolveSeatInfo } from './helpers/resolve-user-helpers';
import { AllocateSeatModal } from './AllocateSeatModal';
import { RemoveSeatModal } from './RemoveSeatModal';

interface PlanSeatsSectionProps {
  canManageBilling: boolean;
}

type Billing = 'complimentary' | 'paid' | 'none';

function seatView(u: AdminUser): { label: string; billing: Billing } {
  if (u.soloSeats?.some(s => s.isComplimentary))
    return { label: 'Solo seat', billing: 'complimentary' };
  if (u.soloSeats?.length) return { label: 'Solo seat', billing: 'paid' };
  if (u.premiumSeat) return { label: 'Premium seat', billing: 'paid' };
  if (u.standardSeats?.length) return { label: 'Standard seat', billing: 'paid' };
  return { label: '—', billing: 'none' };
}

export function PlanSeatsSection({ canManageBilling }: PlanSeatsSectionProps) {
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [allocatingUser, setAllocatingUser] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState<{ user: AdminUser; address: string | null } | null>(
    null
  );

  const refresh = async () => {
    try {
      const { data } = await apiGet<{ users: AdminUser[] }>('/api/users');
      setUsers(data?.users ?? []);
    } catch {
      toast.error(t('inviteFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const seated = users.filter(u => seatView(u).billing !== 'none');

  const handleAllocateConfirm = async (form: AllocateSeatFormData) => {
    const u = allocatingUser;
    if (!u) return;
    try {
      await apiPost('/api/seats', {
        userId: u.id,
        seatType: 'solo',
        platformAddress: form.platformAddress,
        soloSeatType: form.soloSeatType,
        isComplimentary: true,
      });
      toast.success('Complimentary seat granted');
      setAllocatingUser(null);
      setGrantUser(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to grant seat');
    }
  };

  const handleRemoveConfirm = async () => {
    const r = removing;
    if (!r) return;
    const si = resolveSeatInfo(r.user);
    const seatType = si.label.toLowerCase().startsWith('vanity')
      ? 'solo'
      : si.label.toLowerCase() === 'premium'
        ? 'premium'
        : null;
    if (!seatType) {
      toast.error('Cannot remove a standard seat from here');
      setRemoving(null);
      return;
    }
    try {
      await apiDeleteWithBody('/api/seats', {
        userId: r.user.id,
        seatType,
        platformAddress: seatType === 'solo' ? r.address : undefined,
      });
      toast.success('Seat removed');
      setRemoving(null);
      await refresh();
    } catch {
      toast.error('Failed to remove seat');
    }
  };

  if (loading) {
    return <p className="text-center py-8 text-gray-500">{t('loading')}</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-600 mb-4">
        Seat type and billing status. Complimentary grants are logged separately from paid
        allocations.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Seat', 'Billing', ''].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {seated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  No seats allocated
                </td>
              </tr>
            ) : (
              seated.map(u => {
                const { label, billing } = seatView(u);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm">{u.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          billing === 'complimentary'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {billing === 'complimentary' ? 'Complimentary · board' : 'Paid'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {billing === 'paid' && (
                          <a
                            href="/tenant/billing"
                            className="text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                          >
                            Manage in billing
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {canManageBilling && (
                          <button
                            onClick={() =>
                              setRemoving({
                                user: u,
                                address: u.soloSeats?.[0]?.platformAddress ?? null,
                              })
                            }
                            className="text-red-600 hover:text-red-800"
                            type="button"
                            title="Remove seat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {canManageBilling && (
        <div className="mt-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Grant to user</label>
            <select
              value={grantUser?.id ?? ''}
              onChange={e => setGrantUser(users.find(x => x.id === e.target.value) ?? null)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a user…</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => grantUser && setAllocatingUser(grantUser)}
            disabled={!grantUser}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
            type="button"
          >
            <Plus className="w-4 h-4" />
            Grant complimentary seat
          </button>
        </div>
      )}

      <AllocateSeatModal
        user={allocatingUser}
        seatType="solo"
        onClose={() => setAllocatingUser(null)}
        onConfirm={handleAllocateConfirm}
      />
      <RemoveSeatModal
        user={removing?.user ?? null}
        seatAddress={removing?.address ?? null}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
