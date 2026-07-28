const STATUS_COLORS: Record<string, string> = {
  JOINED: 'bg-gray-100 text-gray-600',
  WITHDRAWN: 'bg-red-100 text-red-600',
  WINNER: 'bg-amber-100 text-amber-700',
  RUNNER_UP: 'bg-blue-100 text-blue-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}
    >
      {status}
    </span>
  );
}
