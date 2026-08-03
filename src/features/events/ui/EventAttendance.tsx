'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { UserCheck, UserPlus, Loader2, Users } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/shared/api/http-client';

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
  try {
    const { data } = await apiGet<AttendanceData>(`/api/events/${eventId}/register`);
    return { attendees: data?.attendees ?? [], registered: data?.registered ?? false };
  } catch {
    return { attendees: [], registered: false };
  }
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
      if (currentlyRegistered) {
        await apiDelete(`/api/events/${eventId}/register`);
      } else {
        await apiPost(`/api/events/${eventId}/register`);
      }
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
