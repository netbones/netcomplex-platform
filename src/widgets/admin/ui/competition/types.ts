export interface Competition {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  entryCount: number;
  image: string | null;
  type: string;
  winnersCount: number;
  maxParticipants: number | null;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const TYPE_BADGE_COLORS: Record<string, string> = {
  RAFFLE: 'bg-purple-100 text-purple-700',
  PHOTO: 'bg-blue-100 text-blue-700',
  SCORE: 'bg-green-100 text-green-700',
};

export const TYPE_LABELS: Record<string, string> = {
  RAFFLE: 'Raffle',
  PHOTO: 'Photo',
  SCORE: 'Score',
};

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
