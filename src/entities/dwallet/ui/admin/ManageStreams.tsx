'use client';

import React, { useState, useCallback } from 'react';
import { Plus, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react';
import type { StreamConfig } from '../../model/types';
import type { StreamConfigInput, StreamUpdateInput } from '../../schema';
import { createStream, updateStream } from './api';
import { AdminEmptyState } from './shared';
import type { TxFn } from './shared';

interface ManageStreamsProps {
  streams: StreamConfig[];
  onStreamCreated: () => void;
  onStreamUpdated: () => void;
  tx: TxFn;
}

export function ManageStreams({
  streams,
  onStreamCreated,
  onStreamUpdated,
  tx,
}: ManageStreamsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPct, setNewPct] = useState('20');

  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPct, setEditPct] = useState('');

  const beginEdit = useCallback((s: StreamConfig) => {
    setEditId(s.id);
    setEditLabel(s.label);
    setEditDescription(s.description ?? '');
    setEditPct(s.residentSharePct);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditId(null);
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        const data: StreamConfigInput = {
          key: newKey,
          label: newLabel,
          description: newDescription || undefined,
          residentSharePct: parseFloat(newPct),
          isActive: true,
        };
        await createStream(data);
        setShowAddForm(false);
        setNewKey('');
        setNewLabel('');
        setNewDescription('');
        setNewPct('20');
        onStreamCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create stream');
      } finally {
        setIsSubmitting(false);
      }
    },
    [newKey, newLabel, newDescription, newPct, onStreamCreated]
  );

  const handleUpdate = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const data: StreamUpdateInput = {
          label: editLabel,
          description: editDescription || undefined,
          residentSharePct: parseFloat(editPct),
        };
        await updateStream(id, data);
        cancelEdit();
        onStreamUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update stream');
      }
    },
    [editLabel, editDescription, editPct, cancelEdit, onStreamUpdated]
  );

  const handleToggleActive = useCallback(
    async (s: StreamConfig) => {
      setError(null);
      try {
        await updateStream(s.id, { isActive: !s.isActive });
        onStreamUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle stream');
      }
    },
    [onStreamUpdated]
  );

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="border border-red-200 rounded-lg p-3 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">
          {tx('dwalletAdmin.streams.heading', 'Revenue Streams')}
        </h4>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {tx('dwalletAdmin.streams.addStream', 'Add Stream')}
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/50"
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {tx('dwalletAdmin.streams.key', 'Key')}
              </label>
              <input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder={tx('dwalletAdmin.streams.keyPlaceholder', 'e.g. survey_participation')}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {tx('dwalletAdmin.streams.label', 'Label')}
              </label>
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder={tx(
                  'dwalletAdmin.streams.labelPlaceholder',
                  'e.g. Survey Participation'
                )}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {tx('dwalletAdmin.streams.description', 'Description (optional)')}
              </label>
              <input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder={tx(
                  'dwalletAdmin.streams.descPlaceholder',
                  'What this stream controls'
                )}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {tx('dwalletAdmin.streams.residentShare', 'Resident Share %')}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={newPct}
                onChange={e => setNewPct(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? tx('dwalletAdmin.streams.creating', 'Creating...')
                : tx('dwalletAdmin.streams.createStream', 'Create Stream')}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-white transition-colors"
            >
              {tx('dwalletAdmin.streams.cancel', 'Cancel')}
            </button>
          </div>
        </form>
      )}

      {streams.length === 0 ? (
        <AdminEmptyState
          message={tx('dwalletAdmin.streams.empty', 'No revenue streams configured')}
        />
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwalletAdmin.streams.key', 'Key')}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwalletAdmin.streams.label', 'Label')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwalletAdmin.streams.shareCol', 'Share %')}
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwalletAdmin.streams.activeCol', 'Active')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                    {tx('dwalletAdmin.streams.actionsCol', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {streams.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {editId === s.id ? (
                      <>
                        <td className="py-2 px-3 text-slate-500 font-mono text-xs">{s.key}</td>
                        <td className="py-2 px-3">
                          <input
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editPct}
                            onChange={e => setEditPct(e.target.value)}
                            className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs rounded-full ${s.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {s.isActive
                              ? tx('dwalletAdmin.streams.active', 'Active')
                              : tx('dwalletAdmin.streams.inactive', 'Inactive')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdate(s.id)}
                              className="px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              {tx('dwalletAdmin.streams.save', 'Save')}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors"
                            >
                              {tx('dwalletAdmin.streams.cancel', 'Cancel')}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-slate-500 font-mono text-xs">{s.key}</td>
                        <td className="py-2 px-3 text-slate-700">{s.label}</td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {s.residentSharePct}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(s)}
                            className="inline-flex items-center"
                            aria-label={
                              s.isActive
                                ? tx('dwalletAdmin.streams.deactivateLabel', 'Deactivate stream')
                                : tx('dwalletAdmin.streams.activateLabel', 'Activate stream')
                            }
                          >
                            {s.isActive ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => beginEdit(s)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            {tx('dwalletAdmin.streams.edit', 'Edit')}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
