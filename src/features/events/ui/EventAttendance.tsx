'use client';

import { useState, useEffect } from 'react';
import { UserCheck, UserPlus, Loader2, Users } from 'lucide-react';

interface Attendee {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

interface EventAttendanceProps {
  eventId: string;
}

export function EventAttendance({ eventId }: EventAttendanceProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  async function loadAttendance() {
    try {
      const res = await fetch(`/api/events/${eventId}/register`);
      if (!res.ok) return;
      const body = await res.json();
      const data = body?.data ?? body;
      setAttendees(data?.attendees ?? []);
      setRegistered(data?.registered ?? false);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [eventId]);

  async function toggleRegistration() {
    setToggling(true);
    try {
      if (registered) {
        await fetch(`/api/events/${eventId}/register`, { method: 'DELETE' });
      } else {
        await fetch(`/api/events/${eventId}/register`, { method: 'POST' });
      }
      await loadAttendance();
    } catch {
      /* silent */
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">
            {attendees.length} {attendees.length === 1 ? 'Attendee' : 'Attendees'}
          </h3>
        </div>

        <button
          onClick={toggleRegistration}
          disabled={toggling}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
            registered
              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          } disabled:opacity-50`}
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : registered ? (
            <UserCheck className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {registered ? 'Registered' : 'Register'}
        </button>
      </div>

      {attendees.length > 0 ? (
        <div className="space-y-2">
          {attendees.map(attendee => (
            <div key={attendee.id} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {attendee.avatar ? (
                  <img
                    src={attendee.avatar}
                    alt={attendee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-indigo-600">
                    {attendee.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-700 truncate">{attendee.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">No attendees yet — be the first!</p>
      )}
    </div>
  );
}
