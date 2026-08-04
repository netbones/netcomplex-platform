'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ApiClientError, apiFetchRaw } from '@/shared/api/http-client';

interface CSOSExportButtonProps {
  disputeId: string;
  userId: string;
}

const MAX_EXPORTS_PER_DAY = 3;

export function CSOSExportButton({ disputeId, userId: _userId }: CSOSExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  const isDisabled = exportCount >= MAX_EXPORTS_PER_DAY;

  const handleExport = async () => {
    if (isDisabled) return;

    setExporting(true);
    const exportToast = toast.loading('Generating CSOS export...');

    try {
      const res = await apiFetchRaw(`/api/disputes/${disputeId}/csos-export`);

      toast.dismiss(exportToast);

      if (res.status === 429) {
        toast.error('Export limit reached (3 per day). Try again tomorrow.');
        setExportCount(MAX_EXPORTS_PER_DAY);
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new ApiClientError(
          res.status,
          'CSOS_EXPORT_FAILED',
          body.error?.message ?? 'Export failed'
        );
      }

      // Binary PDF download — read body blob, extract filename from header
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
      a.download = filenameMatch?.[1] ?? `csos-export-${disputeId}.pdf`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportCount(prev => prev + 1);
      toast.success('CSOS export downloaded');
    } catch (err) {
      toast.dismiss(exportToast);
      toast.error(err instanceof Error ? err.message : 'Failed to export CSOS data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled || exporting}
      title={
        isDisabled
          ? `Daily export limit reached (${MAX_EXPORTS_PER_DAY} per day)`
          : `Export for CSOS (${exportCount}/${MAX_EXPORTS_PER_DAY} used today)`
      }
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Export dispute case as CSOS PDF"
    >
      {exporting ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export for CSOS
        </>
      )}
    </button>
  );
}
