'use client';

interface MeetingAttendancePromptProps {
  meetingTitle: string;
  meetingDate: string;
  onChoice: (attending: boolean) => void;
}

export function MeetingAttendancePrompt({
  meetingTitle,
  meetingDate,
  onChoice,
}: MeetingAttendancePromptProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">{meetingTitle}</h2>
        <p className="text-sm text-gray-500">{meetingDate}</p>
      </header>

      <fieldset className="space-y-3">
        <legend className="block text-sm font-medium text-gray-700">Will you attend?</legend>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 transition hover:border-emerald-300">
          <input
            type="radio"
            name="attendance"
            value="attend"
            className="mt-1 h-5 w-5 border-gray-300 text-emerald-600"
            onChange={() => onChoice(true)}
          />
          <span>
            <span className="block font-medium text-gray-900">I will attend</span>
            <span className="block text-sm text-gray-500">
              Registers your attendance and exits this flow.
            </span>
          </span>
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 transition hover:border-amber-300">
          <input
            type="radio"
            name="attendance"
            value="absent"
            className="mt-1 h-5 w-5 border-gray-300 text-amber-600"
            onChange={() => onChoice(false)}
          />
          <span>
            <span className="block font-medium text-gray-900">I cannot attend</span>
            <span className="block text-sm text-gray-500">Starts the proxy appointment flow.</span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
