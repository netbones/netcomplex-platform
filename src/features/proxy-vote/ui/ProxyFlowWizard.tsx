'use client';

import { useState } from 'react';
import type { MeetingProxyDTO } from '@/features/proxy-vote/model/proxy-vote.dto';
import type { ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';
import { STATUS_META } from '@/features/proxy-vote/lib/constants';

import { MeetingAttendancePrompt } from './MeetingAttendancePrompt';
import { ProxySearchBox } from './ProxySearchBox';

interface MeetingLite {
  id: string;
  title: string;
  date: string;
  category: string;
}

interface ProxyFlowWizardProps {
  meeting: MeetingLite;
  existingProxy: MeetingProxyDTO | null;
  userId: string;
}

const STEP_LABELS = [
  'Attendance',
  'Appoint Proxy',
  'Upload Form',
  'Proxy Acceptance',
  'Digital Signature',
  'Complete',
] as const;

function deriveStartStep(status: ProxyStatus | undefined): number {
  if (!status) return 0;
  switch (status) {
    case 'Draft':
      return 1;
    case 'WaitingForUpload':
      return 2;
    case 'WaitingForProxy':
      return 3;
    case 'PendingHoaReview':
      return 4;
    case 'Approved':
    case 'Rejected':
    case 'Withdrawn':
      return 5;
    default:
      return 0;
  }
}

export function ProxyFlowWizard({ meeting, existingProxy, userId }: ProxyFlowWizardProps) {
  const [step, setStep] = useState(() =>
    deriveStartStep(existingProxy?.status as ProxyStatus | undefined)
  );
  const [attendingChoice, setAttendingChoice] = useState<boolean | null>(null);

  function previous() {
    setStep(current => Math.max(0, current - 1));
  }
  function next() {
    setStep(current => Math.min(STEP_LABELS.length - 1, current + 1));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-gray-900">Proxy appointment</h1>
        <p className="text-sm text-gray-500">
          Step {step + 1} of {STEP_LABELS.length}
        </p>
      </header>

      <ol className="flex items-center justify-between gap-2">
        {STEP_LABELS.map((label, index) => {
          const isCompleted = index < step;
          const isActive = index === step;
          const indicatorClasses = isActive
            ? 'bg-soralia-primary'
            : isCompleted
              ? 'bg-emerald-500'
              : 'border border-gray-300 bg-white';
          return (
            <li key={label} className="flex flex-1 flex-col items-center gap-2">
              <span
                className={`flex h-3 w-3 items-center justify-center rounded-full ${indicatorClasses}`}
                aria-current={isActive ? 'step' : undefined}
              />
              <span className="text-sm text-gray-500">{label}</span>
            </li>
          );
        })}
      </ol>

      <section className="min-h-[400px] rounded-lg bg-white p-6 shadow-sm">
        {step === 0 && (
          <MeetingAttendancePrompt
            meetingTitle={meeting.title}
            meetingDate={meeting.date}
            onChoice={attending => {
              setAttendingChoice(attending);
              if (attending) return;
              next();
            }}
          />
        )}
        {step === 1 && (
          <ProxySearchBox onSelect={() => undefined} onNonResident={() => undefined} />
        )}
        {step >= 2 && step <= 4 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900">
              Status: {STATUS_META[(existingProxy?.status as ProxyStatus) ?? 'Draft'].label}
            </p>
            <p className="text-sm text-gray-500">
              {STATUS_META[(existingProxy?.status as ProxyStatus) ?? 'Draft'].description}
            </p>
            {step === 5 && (
              <p className="text-sm font-medium text-emerald-700">
                Wizard complete. Owner: {userId}
              </p>
            )}
          </div>
        )}
        {attendingChoice !== null && step === 1 && (
          <p className="text-xs text-gray-500">
            You chose: {attendingChoice ? 'I will attend' : 'I cannot attend'}
          </p>
        )}
      </section>

      {!attendingChoice && (
        <footer className="flex items-center justify-between">
          <button
            type="button"
            onClick={previous}
            disabled={step === 0}
            className="min-h-[44px] rounded-lg border border-gray-300 px-6 text-sm text-gray-700 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={step === STEP_LABELS.length - 1}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-soralia-primary px-6 text-sm font-medium text-white disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      )}
    </div>
  );
}
