'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { PenSquare, Trash2 } from 'lucide-react';
interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(body => {
        setEvents(body?.data ?? body ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setEvents(events.filter(e => e.id !== id));
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading events...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organizer
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map(event => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{event.title}</div>
                  {!event.isPublic && (
                    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 mt-1">
                      Private
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(event.date).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{event.location}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{event.organizer}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PenSquare />
                  </Link>
                  {deleteId === event.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:text-red-900 text-xs font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(event.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No events yet. Create your first event!
          </div>
        )}
      </div>
    </>
  );
}
