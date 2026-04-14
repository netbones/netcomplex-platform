'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('external-surveys-page');

interface ExternalSurvey {
  id: string;
  name: string;
  provider: string;
  externalId: string;
  embedUrl: string;
  isActive: boolean;
  createdAt: string;
}

export default function ExternalSurveysPage() {
  const [surveys, setSurveys] = useState<ExternalSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    provider: 'bitlabs',
    externalId: '',
    embedUrl: '',
  });

  useEffect(() => {
    fetch('/api/external-surveys')
      .then(res => res.json())
      .then(data => {
        setSurveys(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/external-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const newSurvey = await res.json();
        setSurveys([newSurvey, ...surveys]);
        setShowForm(false);
        setForm({ name: '', provider: 'bitlabs', externalId: '', embedUrl: '' });
      }
    } catch (error) {
      log.error({}, 'Failed to create survey', error);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch('/api/external-surveys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !current }),
    });
    setSurveys(surveys.map(s => (s.id === id ? { ...s, isActive: !current } : s)));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'External Surveys' },
        ]}
      />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">External Surveys</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'Add External Survey'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Survey Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="bitlabs">BitLabs</option>
              <option value="cpx-research">CPX Research</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">External ID</label>
            <input
              type="text"
              value={form.externalId}
              onChange={e => setForm({ ...form, externalId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Embed URL</label>
            <input
              type="url"
              value={form.embedUrl}
              onChange={e => setForm({ ...form, embedUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Survey
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : surveys.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No external surveys configured</p>
          <p className="text-sm text-gray-400">
            Add BitLabs, CPX Research, or other survey providers
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {surveys.map(survey => (
                <tr key={survey.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{survey.name}</td>
                  <td className="px-6 py-4 text-gray-500">{survey.provider}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${survey.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {survey.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(survey.id, survey.isActive)}
                      className="text-indigo-600 hover:underline mr-4"
                    >
                      {survey.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
