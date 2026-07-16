'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { UserCheck, UserPlus, Loader2, Users } from 'lucide-react';

interface Attendee {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

interface AttendanceData {
  attendees: Attendee[];
  registered: boolean;
}

interface EventAttendanceProps {
  eventId: string;
}

async function fetchAttendance(eventId: string): Promise<AttendanceData> {
  const res = await fetch(`/api/events/${eventId}/register`);
  if (!res.ok) return { attendees: [], registered: false };
  const body = await res.json();
  const data = body?.data ?? body;
  return { attendees: data?.attendees ?? [], registered: data?.registered ?? false };
}

export function EventAttendance({ eventId }: EventAttendanceProps) {
  const queryClient = useQueryClient();
  const queryKey = ['events', eventId, 'attendance'];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchAttendance(eventId),
  });

  const toggleMutation = useMutation({
    mutationFn: async (currentlyRegistered: boolean) => {
      const method = currentlyRegistered ? 'DELETE' : 'POST';
      const res = await fetch(`/api/events/${eventId}/register`, { method });
      if (!res.ok) throw new Error('Failed to toggle registration');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const attendees = data?.attendees ?? [];
  const registered = data?.registered ?? false;
  const toggling = toggleMutation.isPending;

  if (isLoading) {
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
          onClick={() => toggleMutation.mutate(registered)}
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
              <div className="relative w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {attendee.avatar ? (
                  <Image
                    src={attendee.avatar}
                    alt={attendee.name}
                    fill
                    className="object-cover"
                    unoptimized
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
