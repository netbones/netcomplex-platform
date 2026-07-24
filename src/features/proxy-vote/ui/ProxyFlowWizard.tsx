'use client';

import { useState } from 'react';

import type { MeetingProxyDTO } from '@/features/proxy-vote/model/proxy-vote.dto';
import type { ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';
import { isProxyEligible } from '@/features/proxy-vote/lib/constants';

import { MeetingAttendancePrompt } from './MeetingAttendancePrompt';
import { ProxySearchBox } from './ProxySearchBox';
import { ProxyUploadForm } from './ProxyUploadForm';
import { ProxyAcceptanceCard } from './ProxyAcceptanceCard';
import { SignatureCanvas } from './SignatureCanvas';
import { ProxyStatusCard } from './ProxyStatusCard';

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
  tenantId: string;
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

export function ProxyFlowWizard({ meeting, existingProxy, tenantId }: ProxyFlowWizardProps) {
  const isEligible = isProxyEligible(meeting.category);
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

  if (!isEligible) {
    return (
      <div className="mx-auto max-w-xl p-6 text-sm text-amber-700">
        This meeting does not accept proxy appointments.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-gray-900">Proxy appointment</h1>
        <p className="text-sm text-gray-500">
          Step {step + 1} of {STEP_LABELS.length} · {meeting.title}
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
        {step === 2 && (
          <ProxyUploadForm
            proxyId={existingProxy?.id ?? 'pending'}
            tenantId={tenantId}
            onUploadComplete={() => {
              next();
            }}
          />
        )}
        {step === 3 && existingProxy && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Notification sent to proxy. Waiting for acceptance.
            </p>
            <ProxyAcceptanceCard
              proxy={existingProxy}
              meetingTitle={meeting.title}
              onAccept={() => {
                next();
              }}
              onDecline={() => {
                setStep(1);
              }}
            />
          </div>
        )}
        {step === 4 && existingProxy && (
          <SignatureCanvas
            proxyOwnerName={existingProxy.proxyName ?? 'Proxy owner'}
            onSignatureChange={() => {
              next();
            }}
          />
        )}
        {step === 5 && existingProxy && (
          <ProxyStatusCard proxy={existingProxy} onWithdraw={() => undefined} />
        )}
        {!existingProxy && step >= 3 && (
          <p className="text-sm text-amber-700">Save the proxy appointment to continue.</p>
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
