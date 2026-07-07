'use client';

import { useSafeTranslation } from '@shared/lib';
import Image from 'next/image';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { EducationPortal } from '@widgets/education';

export default function EducationPage() {
  const { tx } = useSafeTranslation('education');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: tx('title', 'Education Portal'), href: '/education' },
          ]}
        />

        <div className="flex items-center gap-3 mt-6 mb-6">
          <div className="flex-shrink-0 w-10 h-10 relative">
            <Image src="/platform/education-red.svg" alt="" fill className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tx('title', 'Education Portal')}</h1>
            <p className="text-sm text-gray-500">
              {tx('subtitle', 'Scholarships, bursaries, and free learning resources')}
            </p>
          </div>
        </div>

        <style>{`
          .edu-root { padding: 1rem 0; font-family: var(--font-sans); }
          .edu-tabs { display: flex; gap: 0; border-bottom: 0.5px solid var(--border); margin-bottom: 1.5rem; }
          .edu-tab { padding: 0.5rem 1.1rem; font-size: 14px; font-weight: 400; color: var(--text-secondary); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s; }
          .edu-tab:hover { color: var(--text-primary); }
          .edu-tab.active { color: var(--text-accent); border-bottom-color: var(--border-accent); font-weight: 500; }
          .edu-tab svg { margin-right: 6px; }
          .edu-search { display: flex; gap: 8px; margin-bottom: 1.25rem; }
          .edu-search input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; outline: none; }
          .edu-search input:focus { border-color: var(--border-accent); }
          .edu-search select { width: 160px; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; outline: none; }
          .edu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
          .edu-card { background: white; border: 0.5px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.125rem; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .edu-card:hover { border-color: #d1d5db; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .edu-card-header { display: flex; align-items: flex-start; gap: 10px; }
          .edu-card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
          .edu-card-icon.bursary { background: var(--bg-accent); color: var(--text-accent); }
          .edu-card-icon.resource { background: var(--bg-success); color: var(--text-success); }
          .edu-card-title { font-size: 14px; font-weight: 500; color: var(--text-primary); line-height: 1.4; }
          .edu-card-org { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
          .edu-card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.55; }
          .edu-card-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 0.25rem; }
          .edu-pill { font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 0.5px solid #e5e7eb; color: var(--text-secondary); background: #f9fafb; }
          .edu-pill.deadline { border-color: var(--border-warning); color: var(--text-warning); background: var(--bg-warning); }
          .edu-pill.open { border-color: var(--border-success); color: var(--text-success); background: var(--bg-success); }
          .edu-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 0.5rem; border-top: 0.5px solid var(--border); }
          .edu-card-amount { font-size: 13px; font-weight: 500; color: var(--text-primary); }
          .edu-card-amount span { font-size: 11px; font-weight: 400; color: var(--text-muted); margin-left: 3px; }
          .edu-btn-small { font-size: 12px; padding: 4px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; border: 0.5px solid #e5e7eb; border-radius: var(--radius); background: #f9fafb; color: var(--text-primary); text-decoration: none; }
          .edu-btn-small:hover { background: #f3f4f6; }
          .edu-btn-small i { font-size: 13px; }
          .edu-section-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); margin: 1.5rem 0 0.75rem; }
          .edu-empty { text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 14px; }
          .edu-empty i { font-size: 32px; display: block; margin-bottom: 8px; }
          .edu-featured { background: white; border: 0.5px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .edu-featured-badge { font-size: 11px; background: var(--bg-pro); color: var(--text-pro); border-radius: 4px; padding: 2px 7px; font-weight: 500; flex-shrink: 0; }
          .edu-featured-body { flex: 1; min-width: 0; }
          .edu-featured-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
          .edu-featured-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
          .edu-featured-action { flex-shrink: 0; }
          .edu-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 1.25rem; }
          .edu-stat { background: white; border-radius: var(--radius); padding: 0.75rem 1rem; border: 0.5px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .edu-stat-num { font-size: 22px; font-weight: 500; color: var(--text-primary); }
          .edu-stat-lbl { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
          .edu-shelf { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 1.25rem; scrollbar-width: none; }
          .edu-shelf::-webkit-scrollbar { display: none; }
          .edu-spine { min-width: 100px; max-width: 120px; border-radius: 6px; padding: 0.75rem 0.6rem; cursor: pointer; border: 0.5px solid #e5e7eb; background: white; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; flex-shrink: 0; text-decoration: none; color: inherit; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .edu-spine:hover { border-color: #d1d5db; background: #f9fafb; }
          .edu-spine-title { font-size: 12px; font-weight: 500; color: var(--text-primary); line-height: 1.35; }
          .edu-spine-meta { font-size: 11px; color: var(--text-muted); }
          .edu-spine-stripe { height: 3px; border-radius: 99px; margin-bottom: 6px; width: 100%; }
          .edu-saved-badge { margin-left: 5px; font-size: 11px; background: var(--bg-accent); color: var(--text-accent); border-radius: 99px; padding: 1px 6px; }
          .tab-panel { display: none; }
          .tab-panel.active { display: block; }
        `}</style>

        <ErrorBoundary>
          <EducationPortal />
        </ErrorBoundary>
      </div>
    </div>
  );
}
