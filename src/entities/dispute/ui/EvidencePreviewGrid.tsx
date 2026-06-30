'use client';

import { useState, useEffect } from 'react';
import type { DisputeEvidenceDTO } from '../model/types';
import { EvidenceUploadZone } from './EvidenceUploadZone';
import { LoadingSkeleton } from '@shared/ui';
import { formatDate } from '@shared/lib/format-date';

interface EvidencePreviewGridProps {
  disputeId: string;
  userId: string;
}

function isImage(fileType: string): boolean {
  return fileType.startsWith('image/');
}

function FileIcon({ fileType }: { fileType: string }) {
  // Simple file type icon mapping
  const icon = fileType.includes('pdf') ? 'PDF' : fileType.includes('image') ? 'IMG' : 'FILE';

  return (
    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
      <span className="text-xs font-bold text-gray-500">{icon}</span>
    </div>
  );
}

export function EvidencePreviewGrid({ disputeId, userId }: EvidencePreviewGridProps) {
  const [evidence, setEvidence] = useState<DisputeEvidenceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchEvidence = async () => {
    try {
      const res = await fetch(`/api/disputes/${disputeId}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? json;
      const ev = data.evidence ?? data.evidences ?? [];
      setEvidence(Array.isArray(ev) ? ev : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [disputeId, refreshKey]);

  const handleRemove = async (evidenceId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/disputes/${disputeId}/evidence/${evidenceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove');
      setEvidence(prev => prev.filter(e => e.id !== evidenceId));
    } catch {
      // silently fail - UI state already optimistic
    }
  };

  const handleUploadComplete = () => {
    setRefreshKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton lines={3} height="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty state */}
      {evidence.length === 0 && (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-gray-500 mb-4">
            No evidence uploaded. Drag and drop files or click to upload.
          </p>
          <EvidenceUploadZone
            disputeId={disputeId}
            userId={userId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      )}

      {/* Grid */}
      {evidence.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {evidence.map(item => (
              <div
                key={item.id}
                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id, item.fileName)}
                  className="absolute top-1 right-1 z-10 w-6 h-6 bg-white/90 hover:bg-red-50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove file: ${item.fileName}`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Preview */}
                {isImage(item.fileType) ? (
                  <button onClick={() => setLightboxUrl(item.fileUrl)} className="block w-full">
                    <img
                      src={item.fileUrl}
                      alt={item.fileName}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-50">
                    <FileIcon fileType={item.fileType} />
                  </div>
                )}

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs text-gray-700 truncate" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <p className="text-[10px] text-gray-400">{formatDate(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload more */}
          <EvidenceUploadZone
            disputeId={disputeId}
            userId={userId}
            onUploadComplete={handleUploadComplete}
          />
        </>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-label="Image preview"
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            aria-label="Close preview"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="Evidence preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
