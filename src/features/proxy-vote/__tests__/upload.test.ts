import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock state — shared across the storage mocks below.
// ---------------------------------------------------------------------------
const { mockS3Send, mockDbInsert } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
  mockDbInsert: vi.fn(() => ({ catch: vi.fn() })),
}));

vi.mock('@aws-sdk/client-s3', () => {
  function S3Client() {
    return { send: mockS3Send };
  }
  const PutObjectCommand = vi.fn();
  const DeleteObjectCommand = vi.fn();
  const ListObjectsV2Command = vi.fn();
  return {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
  };
});

vi.mock('@shared/lib/id', () => ({
  createId: vi.fn(() => 'test-create-id'),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
}));

vi.mock('@shared/api/db', () => ({
  db: { insert: mockDbInsert },
  mediaUploads: { _table: 'mediaUploads' },
}));

import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
  uploadDocument,
} from '../../../shared/api/storage';

// ---------------------------------------------------------------------------
// File factory — minimal File-stub for jsdom.
// ---------------------------------------------------------------------------
function makeFile(
  type: string,
  name: string,
  sizeBytes: number,
  content: ArrayBuffer = new ArrayBuffer(0)
): File {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes, configurable: true });
  return file;
}

describe('uploadDocument() — storage upload extension (125-06)', () => {
  beforeEach(() => {
    mockS3Send.mockReset();
    mockDbInsert.mockClear();
    mockDbInsert.mockImplementation(() => ({ catch: vi.fn() }));
  });

  describe('ALLOWED_DOCUMENT_TYPES constant', () => {
    it('is exported as a 3-element readonly array', () => {
      expect(ALLOWED_DOCUMENT_TYPES).toHaveLength(3);
    });

    it('contains exactly application/pdf', () => {
      expect(ALLOWED_DOCUMENT_TYPES).toContain('application/pdf');
    });

    it('contains exactly image/jpeg', () => {
      expect(ALLOWED_DOCUMENT_TYPES).toContain('image/jpeg');
    });

    it('contains exactly image/png', () => {
      expect(ALLOWED_DOCUMENT_TYPES).toContain('image/png');
    });
  });

  describe('MAX_DOCUMENT_SIZE constant', () => {
    it('equals 10MB (10485760 bytes)', () => {
      expect(MAX_DOCUMENT_SIZE).toBe(10 * 1024 * 1024);
      expect(MAX_DOCUMENT_SIZE).toBe(10485760);
    });
  });

  describe('uploadDocument() — MIME type validation', () => {
    it('rejects text/html', async () => {
      const file = makeFile('text/html', 'evil.html', 1024);
      const result = await uploadDocument(file, 'tenant-1');
      expect(result.error).toBe('Invalid file type: text/html. Accepted: PDF, JPG, PNG');
      expect(result.url).toBe('');
      expect(result.key).toBe('');
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('rejects video/mp4', async () => {
      const file = makeFile('video/mp4', 'clip.mp4', 1024);
      const result = await uploadDocument(file, 'tenant-1');
      expect(result.error).toContain('Invalid file type: video/mp4');
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('rejects application/zip', async () => {
      const file = makeFile('application/zip', 'bundle.zip', 1024);
      const result = await uploadDocument(file, 'tenant-1');
      expect(result.error).toContain('Invalid file type: application/zip');
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('rejects application/x-executable', async () => {
      const file = makeFile('application/x-executable', 'evil.exe', 1024);
      const result = await uploadDocument(file, 'tenant-1');
      expect(result.error).toContain('Invalid file type: application/x-executable');
      expect(mockS3Send).not.toHaveBeenCalled();
    });
  });

  describe('uploadDocument() — size validation', () => {
    it('rejects a 15MB file (over 10MB cap)', async () => {
      const oversize = 15 * 1024 * 1024;
      const file = makeFile('application/pdf', 'big.pdf', oversize);
      const result = await uploadDocument(file, 'tenant-1');
      expect(result.error).toBe(`File too large: ${oversize} bytes. Maximum: 10MB`);
      expect(result.url).toBe('');
      expect(result.key).toBe('');
      expect(mockS3Send).not.toHaveBeenCalled();
    });
  });
});
