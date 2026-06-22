'use client';

interface Participant {
  name: string;
  avatar: string | null;
}

interface ParticipantAvatarStackProps {
  participants: Participant[];
  max?: number;
}

export function ParticipantAvatarStack({ participants, max = 3 }: ParticipantAvatarStackProps) {
  const visible = participants.slice(0, max);
  const overflow = participants.length - max;

  return (
    <div className="flex items-center shrink-0">
      {visible.map((p, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-indigo-100 flex items-center justify-center -ml-2 first:ml-0"
          title={p.name}
        >
          {p.avatar ? (
            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-indigo-600 font-semibold">
              {p.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center -ml-2 text-[10px] text-gray-600 font-semibold">
          +{overflow}
        </div>
      )}
    </div>
  );
}
