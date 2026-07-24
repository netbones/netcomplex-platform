'use client';

import { CheckCircle2, Upload } from 'lucide-react';
import { useState, type ChangeEvent, type DragEvent } from 'react';

import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE, uploadDocument } from '@api/server';

interface ProxyUploadFormProps {
  proxyId: string;
  tenantId: string;
  onUploadComplete: (documentId: string, fileUrl: string) => void;
}

function getReadableSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ProxyUploadForm({ proxyId, tenantId, onUploadComplete }: ProxyUploadFormProps) {
  const [filename, setFilename] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setError(null);
    if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
      setError('Upload failed — try again or use a PDF, JPG, or PNG under 10MB.');
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      setError('Upload failed — try again or use a PDF, JPG, or PNG under 10MB.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await uploadDocument(file, tenantId, 'proxy-forms');
      setFilename(file.name);
      setSize(file.size);
      onUploadComplete(proxyId, result.url);
    } catch {
      setError('Upload failed — try again or use a PDF, JPG, or PNG under 10MB.');
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  const borderClass = error ? 'border-red-500' : 'border-gray-300';

  return (
    <div className="space-y-3">
      <label
        htmlFor={`upload-${proxyId}`}
        className={`flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-gray-50 p-8 text-center transition hover:border-soralia-primary ${borderClass}`}
        onDragOver={event => event.preventDefault()}
        onDrop={onDrop}
      >
        <Upload className="h-8 w-8 text-gray-400" aria-hidden />
        <span className="text-sm text-gray-600">
          Upload signed proxy form (PDF, JPG, or PNG — max 10MB)
        </span>
        <input
          id={`upload-${proxyId}`}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onChange}
          className="hidden"
          disabled={submitting}
        />
        <span className="text-xs text-gray-400">Drag and drop, or click to browse.</span>
      </label>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {filename && (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {filename} · {size !== null ? getReadableSize(size) : ''}
        </p>
      )}
      <button
        type="button"
        disabled={submitting || !filename}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-soralia-primary px-6 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Uploading…' : 'Submit Proxy Appointment'}
      </button>
    </div>
  );
}
