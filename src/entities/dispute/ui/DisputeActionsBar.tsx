'use client';

import { useState } from 'react';
import type { DisputeCaseDTO, DisputeStatus } from '../model/types';
import { CSOSExportButton } from './CSOSExportButton';
import { toast } from 'sonner';
import { apiPost, apiPatch, apiDelete, ApiClientError } from '@/shared/api/http-client';

interface DisputeActionsBarProps {
  dispute: DisputeCaseDTO;
  userRole: string;
  userId: string;
}

type ModalState = null | 'assign' | 'ruling' | 'withdraw' | 'delete';

export function DisputeActionsBar({ dispute, userRole, userId }: DisputeActionsBarProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState('');
  const [moderatorId, setModeratorId] = useState('');
  const [rulingDescription, setRulingDescription] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const isAdmin = userRole === 'BOARD' || userRole === 'ADMIN' || userRole === 'COMMITTEE';
  const isComplainant = userId === dispute.complainantId;
  const status = dispute.status as DisputeStatus;

  const canSubmit = isComplainant && status === 'DRAFT';
  const canWithdraw =
    isComplainant &&
    ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MEDIATION_OFFERED', 'MEDIATION_ACTIVE'].includes(
      status
    );
  const canAssign = isAdmin && (status === 'SUBMITTED' || status === 'UNDER_REVIEW');
  const canRule = isAdmin;
  const canDelete = userRole === 'ADMIN';
  const canExport = isComplainant || isAdmin;

  const closeModal = () => {
    setModal(null);
    setModeratorId('');
    setRulingDescription('');
    setConfirmText('');
  };

  const handleSubmit = async () => {
    setLoading('submit');
    try {
      await apiPost(`/api/disputes/${dispute.id}/submit`);
      toast.success('Dispute submitted successfully');
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 423) {
        toast.error(err.message || 'Cooling-off period has not elapsed.');
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setLoading('');
    }
  };

  const handleAssign = async () => {
    if (!moderatorId) return;
    setLoading('assign');
    try {
      await apiPost(`/api/disputes/${dispute.id}/assign`, { moderatorId });
      toast.success('Moderator assigned');
      closeModal();
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setLoading('');
    }
  };

  const handleRuling = async () => {
    if (!rulingDescription.trim()) return;
    setLoading('ruling');
    try {
      await apiPost(`/api/disputes/${dispute.id}/ruling`, { rulingDescription });
      toast.success('Ruling issued');
      closeModal();
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue ruling');
    } finally {
      setLoading('');
    }
  };

  const handleWithdraw = async () => {
    setLoading('withdraw');
    try {
      await apiPatch(`/api/disputes/${dispute.id}`, { status: 'WITHDRAWN' });
      toast.success('Dispute withdrawn');
      closeModal();
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setLoading('');
    }
  };

  const handleDelete = async () => {
    setLoading('delete');
    try {
      await apiDelete(`/api/disputes/${dispute.id}`);
      toast.success('Dispute deleted');
      window.location.assign('/admin/disputes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading('');
    }
  };

  const ActionButton = ({
    label,
    onClick,
    isLoading,
    variant = 'default',
    className = '',
    disabled = false,
  }: {
    label: string;
    onClick: () => void;
    isLoading: boolean;
    variant?: 'default' | 'destructive' | 'outline';
    className?: string;
    disabled?: boolean;
  }) => {
    const baseClasses =
      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = {
      default: 'bg-soralia-primary text-white hover:bg-indigo-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    };

    return (
      <button
        onClick={onClick}
        disabled={isLoading || disabled}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        {isLoading ? 'Processing...' : label}
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <ActionButton
            label="Submit Dispute"
            onClick={handleSubmit}
            isLoading={loading === 'submit'}
          />
        )}

        {canAssign && (
          <ActionButton
            label="Assign Moderator"
            onClick={() => setModal('assign')}
            isLoading={false}
            variant="outline"
          />
        )}

        {canRule && (
          <ActionButton
            label="Issue Ruling"
            onClick={() => setModal('ruling')}
            isLoading={false}
            variant="outline"
          />
        )}

        {canExport && <CSOSExportButton disputeId={dispute.id} userId={userId} />}

        {canWithdraw && (
          <ActionButton
            label="Withdraw"
            onClick={() => setModal('withdraw')}
            isLoading={false}
            variant="destructive"
          />
        )}

        {canDelete && (
          <ActionButton
            label="Delete"
            onClick={() => setModal('delete')}
            isLoading={false}
            variant="destructive"
          />
        )}
      </div>

      {/* ── Assign Modal ────────────────────────────────── */}
      {modal === 'assign' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
          role="dialog"
          aria-label="Assign moderator"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Assign Moderator</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moderator ID</label>
            <input
              type="text"
              value={moderatorId}
              onChange={e => setModeratorId(e.target.value)}
              placeholder="Enter moderator user ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            />
            <div className="flex justify-end gap-2 mt-4">
              <ActionButton
                label="Cancel"
                onClick={closeModal}
                isLoading={false}
                variant="outline"
              />
              <ActionButton
                label="Assign"
                onClick={handleAssign}
                isLoading={loading === 'assign'}
                disabled={!moderatorId.trim()}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Ruling Modal ────────────────────────────────── */}
      {modal === 'ruling' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
          role="dialog"
          aria-label="Issue ruling"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Issue Formal Ruling</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ruling Description
            </label>
            <textarea
              value={rulingDescription}
              onChange={e => setRulingDescription(e.target.value)}
              rows={4}
              placeholder="Describe the ruling..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-soralia-primary resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <ActionButton
                label="Cancel"
                onClick={closeModal}
                isLoading={false}
                variant="outline"
              />
              <ActionButton
                label="Issue Ruling"
                onClick={handleRuling}
                isLoading={loading === 'ruling'}
                disabled={!rulingDescription.trim()}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Withdraw Confirmation ───────────────────────── */}
      {modal === 'withdraw' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
          role="alertdialog"
          aria-label="Withdraw dispute"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-red-700 mb-2">Withdraw Dispute?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. The dispute will be permanently closed.
            </p>
            <div className="flex justify-end gap-2">
              <ActionButton
                label="Cancel"
                onClick={closeModal}
                isLoading={false}
                variant="outline"
              />
              <ActionButton
                label="Withdraw"
                onClick={handleWithdraw}
                isLoading={loading === 'withdraw'}
                variant="destructive"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ─────────────────────────── */}
      {modal === 'delete' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}
          role="alertdialog"
          aria-label="Delete dispute"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-red-700 mb-2">Delete Dispute?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently remove the dispute and all associated messages, evidence, and
              events. This action cannot be undone.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type &quot;delete&quot; to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder='Type "delete" to confirm'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <ActionButton
                label="Cancel"
                onClick={closeModal}
                isLoading={false}
                variant="outline"
              />
              <ActionButton
                label="Delete"
                onClick={handleDelete}
                isLoading={loading === 'delete'}
                variant="destructive"
                disabled={confirmText !== 'delete'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
