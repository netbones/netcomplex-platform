'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
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

interface ResourceVersion {
  id: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  version: string | null;
  notes: string | null;
  createdAt: string;
}

interface Resource {
  id: string;
  title: string;
  category: string;
  visibility: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSize?: number | null;
  version: string | null;
  downloadCount?: number;
  versions?: ResourceVersion[];
  createdAt: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(1)} ${units[unitIdx]}`;
}

export function ResourceList() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, Resource>>({});

  const fetchResources = useCallback(async () => {
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
  }, [categoryFilter, visibilityFilter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleRowClick = async (resource: Resource) => {
    if (expandedId === resource.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(resource.id);
    if (!expandedDetails[resource.id]) {
      try {
        const res = await fetch(`/api/resources/${resource.id}`);
        if (res.ok) {
          const body = await res.json();
          setExpandedDetails(prev => ({ ...prev, [resource.id]: body?.data ?? body }));
        }
      } catch {
        toast.error('Failed to load resource details');
      }
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      await fetch(`/api/resources/${resource.id}/download`, { method: 'POST' });
      setExpandedDetails(prev => {
        const current = prev[resource.id];
        if (!current) return prev;
        return {
          ...prev,
          [resource.id]: {
            ...current,
            downloadCount: (current.downloadCount ?? 0) + 1,
          },
        };
      });
      setResources(prev =>
        prev.map(r =>
          r.id === resource.id
            ? { ...r, downloadCount: (r.downloadCount ?? 0) + 1 }
            : r
        )
      );
    } catch {
      // silent
    }
  };

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resources.map(resource => (
                <React.Fragment key={resource.id}>
                  <tr
                    key={resource.id}
                    onClick={() => handleRowClick(resource)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <i className={`fas fa-chevron-${expandedId === resource.id ? 'down' : 'right'} text-xs text-gray-400`}></i>
                        {resource.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                        {RESOURCE_CATEGORIES.find(c => c.value === resource.category)?.label || resource.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${VISIBILITY_COLORS[resource.visibility] || 'bg-gray-100 text-gray-800'}`}>
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
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(resource.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-right space-x-2" onClick={e => e.stopPropagation()}>
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
                  {expandedId === resource.id && (
                    <tr key={`${resource.id}-detail`}>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                        <ExpandedResourceDetails
                          resource={resource}
                          details={expandedDetails[resource.id]}
                          onDownload={() => handleDownload(resource)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function ExpandedResourceDetails({
  resource,
  details,
  onDownload,
}: {
  resource: Resource;
  details?: Resource;
  onDownload: () => void;
}) {
  const data = details || resource;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">File Location</h4>
        {data.fileUrl ? (
          <div className="space-y-1">
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDownload}
              className="text-sm text-indigo-600 hover:text-indigo-800 break-all flex items-center gap-1"
            >
              <i className="fas fa-external-link-alt text-xs"></i>
              {data.fileUrl}
            </a>
            {data.fileSize != null && (
              <p className="text-xs text-gray-500">{formatFileSize(data.fileSize)}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No file attached</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Download Statistics</h4>
        <div className="flex items-center gap-2">
          <i className="fas fa-download text-indigo-500"></i>
          <span className="text-2xl font-bold text-gray-900">{data.downloadCount ?? 0}</span>
          <span className="text-sm text-gray-500">downloads</span>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Version History</h4>
        {data.versions && data.versions.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.versions.map(v => (
              <div key={v.id} className="text-xs bg-white rounded p-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">v{v.version || '—'}</span>
                  <span className="text-gray-400">{new Date(v.createdAt).toLocaleDateString('en-ZA')}</span>
                </div>
                {v.notes && <p className="text-gray-500 mt-0.5">{v.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No previous versions</p>
        )}
      </div>
    </div>
  );
}
