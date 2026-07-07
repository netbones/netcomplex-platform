'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SetupMission } from '@/entities/setup';

interface SetupSectionProps {
  section: string;
  title: string;
  isRequired: boolean;
  missions: SetupMission[];
  completedCount: number;
  totalCount: number;
}

export default function SetupSection({
  section: _section,
  title,
  isRequired,
  missions,
  completedCount,
  totalCount,
}: SetupSectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Expand/collapse chevron */}
          <svg
            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {/* Title */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {isRequired && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('setup.required', 'Required')}
              </span>
            )}
          </div>
        </div>

        {/* Completion badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAllComplete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {completedCount}/{totalCount}
          </span>
          {isAllComplete && (
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </button>

      {/* Mission list */}
      {expanded && (
        <div className="border-t border-gray-100">
          {missions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              {t('setup.noMissions', 'No missions in this section yet.')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {missions.map(mission => (
                <li
                  key={mission.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Completion indicator */}
                  <span className="flex-shrink-0">
                    {mission.isCompleted ? (
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                    )}
                  </span>

                  {/* Mission title + description */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        mission.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}
                    >
                      {mission.title}
                    </p>
                    {mission.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {mission.description}
                      </p>
                    )}
                  </div>

                  {/* Required badge */}
                  {mission.isRequired && (
                    <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                      {t('setup.required', 'Required')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
