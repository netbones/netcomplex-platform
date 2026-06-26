'use client';

import { useState } from 'react';
import { cn } from '@shared/lib';

interface ConflictTipsPanelProps {
  /** The selected emotion value from Stage 1 */
  emotionScore: string;
}

const TIP_SECTIONS = [
  {
    id: 'heated_disputes',
    title: 'Heated Disputes (Noise, Pets, Parking)',
    defaultOpen: true,
    content: (
      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
        <li>
          <strong>Document the issue.</strong> Keep a simple log of dates, times, and what happened.
          Photos or short videos can help, but avoid recording people without their knowledge.
        </li>
        <li>
          <strong>Speak directly, if safe.</strong> Many disputes are misunderstandings. A calm
          face-to-face conversation often resolves things faster than a formal complaint.
        </li>
        <li>
          <strong>Know the rules.</strong> Check your community rules and by-laws before filing —
          what you consider a violation may be permitted.
        </li>
        <li>
          <strong>Try mediation first.</strong> The HOA may offer informal mediation before a formal
          dispute process begins.
        </li>
      </ul>
    ),
  },
  {
    id: 'hoa_rules',
    title: 'HOA Rule Disputes',
    defaultOpen: false,
    content: (
      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
        <li>
          <strong>Request clarification.</strong> Ask the HOA board or property manager to explain
          the rule and its purpose before disputing it.
        </li>
        <li>
          <strong>Propose alternatives.</strong> If a rule feels unfair, suggest a specific
          modification. Boards are more receptive to solutions than complaints.
        </li>
        <li>
          <strong>Attend board meetings.</strong> Many rule changes are discussed in open meetings —
          your presence and input matter.
        </li>
        <li>
          <strong>Gather community support.</strong> If other residents share your concern, a
          collective approach carries more weight than an individual dispute.
        </li>
      </ul>
    ),
  },
  {
    id: 'escalation_ready',
    title: 'Escalation-Ready Situations',
    defaultOpen: false,
    content: (
      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
        <li>
          <strong>Safety first.</strong> If you feel threatened or unsafe, contact local authorities
          immediately. Dispute resolution is for community matters, not emergencies.
        </li>
        <li>
          <strong>Gather all evidence.</strong> For formal disputes, compile all documentation:
          correspondence, photos, witness statements, and any prior resolution attempts.
        </li>
        <li>
          <strong>Consider the CSOS.</strong> The Community Schemes Ombud Service (CSOS) is the
          formal adjudication body for community disputes. Filing internally first is recommended
          but not required.
        </li>
        <li>
          <strong>Know your timeline.</strong> Formal disputes take time — typically 7–14 days for
          initial review, longer for mediation or formal rulings. Plan accordingly.
        </li>
      </ul>
    ),
  },
] as const;

export function ConflictTipsPanel({ emotionScore }: ConflictTipsPanelProps) {
  const isHeated = emotionScore === 'very_angry' || emotionScore === 'upset';

  // Compute default open state: if heated, open the "heated disputes" section by default
  const initialOpen = TIP_SECTIONS.map(section => {
    if (isHeated && section.id === 'heated_disputes') return section.id;
    if (!isHeated && section.defaultOpen) return section.id;
    return '';
  }).filter(Boolean);

  const [openSections, setOpenSections] = useState<string[]>(initialOpen);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Before You File</h3>
        <p className="text-sm text-gray-500 mt-1">
          Here are some tips and resources that may help resolve your situation before escalating to
          a formal dispute.
        </p>
      </div>

      <div className="space-y-3">
        {TIP_SECTIONS.map(section => {
          const isOpen = openSections.includes(section.id);
          const isHeatedSection = section.id === 'heated_disputes';

          return (
            <details
              key={section.id}
              open={isOpen}
              onToggle={e => {
                if (e.currentTarget.open) {
                  setOpenSections(prev => [...prev, section.id]);
                } else {
                  setOpenSections(prev => prev.filter(s => s !== section.id));
                }
              }}
              className={cn(
                'rounded-lg border bg-white transition-colors',
                isHeated && isHeatedSection && isOpen
                  ? 'border-l-4 border-l-amber-400 border-gray-200'
                  : 'border-gray-200'
              )}
            >
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg select-none">
                {section.title}
              </summary>
              <div className="px-4 pb-4">{section.content}</div>
            </details>
          );
        })}
      </div>

      {/* CTA */}
      <div className="pt-2">
        <p className="text-sm text-gray-500 mb-3">
          Once you&apos;re ready, continue to the dispute form to file your case.
        </p>
        <button
          type="button"
          className="rounded-md bg-soralia-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Continue to Dispute Form
        </button>
      </div>
    </div>
  );
}
