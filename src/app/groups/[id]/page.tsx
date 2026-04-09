'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('group-detail-page');

interface Content {
  id: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  author: { name: string | null };
}

interface Member {
  role: string;
  user: { id: string; name: string };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isPublic: boolean;
  owner: { id: string; name: string };
  members: Member[];
  contents: Content[];
}

export default function GroupDetailPage() {
  const params = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/groups/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          log.error({}, 'Failed to fetch group', data.error);
          return;
        }
        setGroup(data);
        setLoading(false);
      });
  }, [params.id]);

  const handleJoin = async () => {
    const res = await fetch('/api/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user', groupId: params.id }),
    });
    if (res.ok) {
      setIsMember(true);
    }
  };

  const handleLeave = async () => {
    const res = await fetch(`/api/groups/members?userId=demo-user&groupId=${params.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setIsMember(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!group) {
    return <div className="p-8 text-center">Group not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full capitalize">
            {group.category.replace('-', ' ')}
          </span>
          <button
            onClick={isMember ? handleLeave : handleJoin}
            className={`px-6 py-2 rounded-lg font-medium ${
              isMember
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isMember ? 'Leave Group' : 'Join Group'}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{group.name}</h1>
        <p className="text-gray-600 mb-6">{group.description || 'No description'}</p>

        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <span>
            <i className="fas fa-users mr-2"></i>
            {group.members.length} members
          </span>
          <span>
            <i className="fas fa-user mr-2"></i>Led by {group.owner.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Group Posts</h2>
              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                <i className="fas fa-plus mr-1"></i>New Post
              </button>
            </div>

            {group.contents.length > 0 ? (
              <div className="space-y-4">
                {group.contents.map(post => (
                  <div key={post.id} className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-900">{post.title}</h3>
                    {post.excerpt && <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>}
                    <div className="text-xs text-gray-500 mt-2">
                      by {post.author?.name} •{' '}
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No posts yet. Be the first to share!</p>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Members</h2>
            <div className="space-y-3">
              {group.members.map(m => (
                <div key={m.user.id} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium mr-3">
                    {m.user.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{m.role.toLowerCase()}</p>
                  </div>
                </div>
              ))}
            </div>
            {group.members.length === 0 && <p className="text-gray-500 text-sm">No members yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
