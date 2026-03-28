'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isPublic: boolean;
  owner: { name: string | null };
  _count: { members: number };
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups')
      .then(res => res.json())
      .then(data => {
        setGroups(data);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setGroups(groups.filter(g => g.id !== id));
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interest Groups</h1>
        <Link
          href="/admin/groups/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>New Group
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                <span className="text-sm text-gray-500 capitalize">{group.category}</span>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${group.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
              >
                {group.isPublic ? 'Public' : 'Private'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {group.description || 'No description'}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>
                <i className="fas fa-users mr-1"></i> {group._count.members} members
              </span>
              <span>
                <i className="fas fa-user mr-1"></i> {group.owner.name}
              </span>
            </div>

            <div className="flex space-x-2">
              <Link
                href={`/admin/groups/${group.id}`}
                className="flex-1 text-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(group.id)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <i className="fas fa-users text-4xl mb-4"></i>
          <p>No groups yet. Create your first interest group!</p>
        </div>
      )}
    </div>
  );
}
