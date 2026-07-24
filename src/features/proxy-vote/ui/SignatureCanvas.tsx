'use client';

import { useRef, useState } from 'react';
import type SignaturePad from 'react-signature-canvas';
import type { SignatureEvidence } from '@/features/proxy-vote/model/types';

type Mode = 'draw' | 'type';

interface SignatureCanvasProps {
  onSignatureChange: (evidence: SignatureEvidence) => void;
  proxyOwnerName: string;
}

function buildDrawEvidence(dataUrl: string): SignatureEvidence {
  return {
    provider: 'INTERNAL',
    mode: 'draw',
    signatureDataUrl: dataUrl,
    timestamp: new Date().toISOString(),
  };
}

function buildTypeEvidence(typedName: string): SignatureEvidence {
  return {
    provider: 'INTERNAL',
    mode: 'type',
    typedName,
    timestamp: new Date().toISOString(),
  };
}

export function SignatureCanvas({ onSignatureChange, proxyOwnerName }: SignatureCanvasProps) {
  const [mode, setMode] = useState<Mode>('draw');
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [PadComponent, setPadComponent] = useState<
    null | typeof import('react-signature-canvas').default
  >(null);
  const padRef = useRef<SignaturePad | null>(null);

  if (typeof window !== 'undefined' && mode === 'draw' && PadComponent === null) {
    import('react-signature-canvas').then(mod => setPadComponent(() => mod.default));
  }

  function clearDraw() {
    padRef.current?.clear();
    setHasInk(false);
  }

  function emit() {
    if (mode === 'draw') {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return;
      const dataUrl = pad.toDataURL('image/png');
      setHasInk(true);
      onSignatureChange(buildDrawEvidence(dataUrl));
      return;
    }
    if (!typedName.trim() || !agreed) return;
    onSignatureChange(buildTypeEvidence(typedName.trim()));
  }

  const canSubmit =
    (mode === 'draw' && hasInk) || (mode === 'type' && typedName.trim().length > 0 && agreed);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200">
        {(['draw', 'type'] as Mode[]).map(option => {
          const isActive = mode === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`min-h-[44px] px-4 text-sm transition ${
                isActive
                  ? 'border-b-2 border-soralia-primary font-medium text-soralia-primary'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {option === 'draw' ? 'Draw' : 'Type'}
            </button>
          );
        })}
      </div>

      {mode === 'draw' ? (
        <div className="space-y-2">
          <div className="min-h-[120px] rounded-lg border border-gray-300 bg-white p-2">
            {PadComponent ? (
              <PadComponent
                ref={(instance: SignaturePad | null) => {
                  padRef.current = instance;
                }}
                onEnd={() => {
                  if (!padRef.current?.isEmpty()) {
                    setHasInk(true);
                    emit();
                  }
                }}
                canvasProps={{ className: 'w-full h-28' }}
                penColor="#000"
              />
            ) : (
              <div className="flex h-28 items-center justify-center text-sm text-gray-400">
                Loading signature pad…
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={clearDraw}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3"
            placeholder="Type your full name"
            value={typedName}
            onChange={event => setTypedName(event.target.value)}
          />
          <label className="flex min-h-[44px] items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={event => setAgreed(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300"
            />
            <span>I agree to act as proxy for {proxyOwnerName}</span>
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={emit}
        disabled={!canSubmit}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-soralia-primary px-6 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sign & Submit
      </button>
    </div>
  );
}
