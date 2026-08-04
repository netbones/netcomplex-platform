'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { ApiClientError, apiPostForm } from '@/shared/api/http-client';
import { ALLOWED_EVIDENCE_TYPES, MAX_EVIDENCE_FILE_SIZE } from '../model/schemas';

interface EvidenceUploadZoneProps {
  disputeId: string;
  userId: string;
  onUploadComplete: () => void;
}

const ACCEPT_STRING = ALLOWED_EVIDENCE_TYPES.join(',');
const MAX_SIZE_MB = Math.round(MAX_EVIDENCE_FILE_SIZE / (1024 * 1024));

function validateFile(file: File): string | null {
  const isAllowed = (ALLOWED_EVIDENCE_TYPES as ReadonlyArray<string>).includes(file.type);
  if (!isAllowed) {
    return `Unsupported file type "${file.type}". PDFs, images, and documents up to ${MAX_SIZE_MB}MB accepted.`;
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE) {
    return `File exceeds ${MAX_SIZE_MB}MB limit.`;
  }
  return null;
}

export function EvidenceUploadZone({
  disputeId,
  userId: _userId,
  onUploadComplete,
}: EvidenceUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setUploading(true);
      const uploadToast = toast.loading('Uploading evidence...');

      try {
        const formData = new FormData();
        formData.append('file', file);

        await apiPostForm(`/api/disputes/${disputeId}/evidence`, formData);

        toast.dismiss(uploadToast);

        toast.success('Evidence uploaded successfully');
        onUploadComplete();
      } catch (err) {
        toast.dismiss(uploadToast);
        if (err instanceof ApiClientError && err.statusCode === 429) {
          toast.error('Too many uploads. Please wait a moment.');
          return;
        }
        toast.error(err instanceof Error ? err.message : 'Failed to upload evidence');
      } finally {
        setUploading(false);
      }
    },
    [disputeId, onUploadComplete]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      toast.error('Please upload files one at a time.');
      return;
    }
    const file = files[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Upload evidence files"
      className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragOver
          ? 'border-soralia-primary bg-indigo-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-soralia-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Uploading...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600 font-medium">
            Drag and drop files or click to upload
          </p>
          <p className="text-xs text-gray-400">PDFs, images up to {MAX_SIZE_MB}MB accepted</p>
          <p className="text-xs text-gray-400">Maximum 10 files per dispute</p>
        </div>
      )}
    </div>
  );
}
