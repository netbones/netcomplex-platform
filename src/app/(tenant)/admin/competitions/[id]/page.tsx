'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumbs } from '@shared/ui';
import { CompetitionForm } from '@/widgets/admin/ui/CompetitionForm';

interface Competition {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prizeInfo: string | null;
  startDate: string;
  endDate: string;
  status: string;
  entryCount: number;
  image: string | null;
}

export default function EditCompetitionPage() {
  const params = useParams();
  const id = params.id as string;
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/competitions/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setCompetition(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading competition...</div>;
  }

  if (!competition) {
    return <div className="p-8 text-center text-gray-500">Competition not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Competitions', href: '/admin/competitions' },
          { label: 'Edit' },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit: {competition.title}</h1>
      </div>

      <CompetitionForm
        initialData={{
          id: competition.id,
          title: competition.title,
          description: competition.description,
          rules: competition.rules,
          prizeInfo: competition.prizeInfo,
          startDate: competition.startDate,
          endDate: competition.endDate,
          status: competition.status,
          image: competition.image,
        }}
      />
    </div>
  );
}
