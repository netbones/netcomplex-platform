'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

const RESOURCE_CATEGORIES = [
  { value: 'ARCHITECTURAL', label: 'Architectural' },
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'GOVERNANCE', label: 'Governance' },
  { value: 'BOARD_REPORT', label: 'Board Report' },
  { value: 'DIY', label: 'DIY' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'OTHER', label: 'Other' },
];

const VISIBILITY_LABELS: Record<string, string> = {
  ALL_RESIDENTS: 'All Residents',
  OWNERS_ONLY: 'Owners Only',
  BOARD_ONLY: 'Board Only',
  COMMITTEE_ONLY: 'Committee Only',
};

const VISIBILITY_COLORS: Record<string, string> = {
  ALL_RESIDENTS: 'bg-green-100 text-green-800',
  OWNERS_ONLY: 'bg-blue-100 text-blue-800',
  BOARD_ONLY: 'bg-red-100 text-red-800',
  COMMITTEE_ONLY: 'bg-yellow-100 text-yellow-800',
};

const FILE_ICONS: Record<string, string> = {
  pdf: 'fas fa-file-pdf text-red-500',
  docx: 'fas fa-file-word text-blue-500',
  doc: 'fas fa-file-word text-blue-500',
  dwg: 'fas fa-file-alt text-gray-500',
  xlsx: 'fas fa-file-excel text-green-500',
  xls: 'fas fa-file-excel text-green-500',
};

interface Resource {
  id: string;
  title: string;
  category: string;
  visibility: string;
  fileUrl: string | null;
  fileType: string | null;
  version: string | null;
  createdAt: string;
}

export function ResourceList() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (visibilityFilter) params.set('visibility', visibilityFilter);

      const res = await fetch(`/api/resources?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setResources(body?.data ?? body);
      }
    } catch {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [categoryFilter, visibilityFilter]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Resource deleted');
        setResources(prev => prev.filter(r => r.id !== id));
      } else {
        toast.error('Failed to delete resource');
      }
    } catch {
      toast.error('Failed to delete resource');
    }
    setDeleteId(null);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return 'fas fa-file text-gray-400';
    const ext = fileType.toLowerCase().replace('.', '');
    return FILE_ICONS[ext] || 'fas fa-file text-gray-400';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Categories</option>
          {RESOURCE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={visibilityFilter}
          onChange={e => setVisibilityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Visibility</option>
          {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Resource Table */}
      {resources.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-folder-open text-4xl mb-3 text-gray-300"></i>
          <p>No resources found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Visibility
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Version
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resources.map(resource => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{resource.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                      {RESOURCE_CATEGORIES.find(c => c.value === resource.category)?.label ||
                        resource.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${VISIBILITY_COLORS[resource.visibility] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {VISIBILITY_LABELS[resource.visibility] || resource.visibility}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {resource.fileUrl ? (
                      <i className={getFileIcon(resource.fileType)}></i>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{resource.version || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(resource.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <Link
                      href={`/admin/resources/${resource.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <i className="fas fa-edit"></i>
                    </Link>
                    <button
                      onClick={() => setDeleteId(resource.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Resource</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this resource? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
