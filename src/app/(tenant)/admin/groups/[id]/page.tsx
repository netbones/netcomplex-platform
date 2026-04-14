'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GroupForm } from '@/components/admin/GroupForm';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('edit-group-page');

interface Group {
  name: string;
  description: string | null;
  category: string;
  isPublic: boolean;
}

export default function EditGroupPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/groups/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          log.error({}, 'Failed to fetch group', data.error);
          return;
        }
        setGroup({
          name: data.name,
          description: data.description,
          category: data.category,
          isPublic: data.isPublic,
        });
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!group) {
    return <div className="p-8 text-center">Group not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Interest Group</h1>
      <GroupForm
        initialData={{
          id: id,
          name: group.name,
          description: group.description || '',
          category: group.category,
          isPublic: group.isPublic,
        }}
      />
    </div>
  );
}
