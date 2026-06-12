import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClientError, apiGet, apiPost, apiPatch, apiDelete } from '../http-client';

vi.mock('../auth-client', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { token: 'test-token' } },
    }),
  },
}));

vi.mock('../observability', () => ({
  getRequestId: vi.fn().mockReturnValue('test-req-id'),
}));

describe('ApiClientError', () => {
  it('creates an error with status code and error code', () => {
    const err = new ApiClientError(404, 'NOT_FOUND', 'Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.name).toBe('ApiClientError');
  });

  it('includes optional details', () => {
    const err = new ApiClientError(422, 'VALIDATION_ERROR', 'Invalid input', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('envelope unwrapping', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('unwraps {success, data} envelope', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { id: '1', name: 'test' } }),
    });
    const result = await apiGet<{ id: string; name: string }>('/api/test');
    expect(result).toEqual({ id: '1', name: 'test' });
  });

  it('passes through unwrapped responses', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: '1' }, { id: '2' }]),
    });
    const result = await apiGet<Array<{ id: string }>>('/api/test');
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('throws ApiClientError on non-ok response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Auth required' },
        }),
    });
    const err = await apiGet('/api/test').catch(e => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe('AUTH_REQUIRED');
  });

  it('uses generic error when response body is not parseable', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });
    await expect(apiGet('/api/test')).rejects.toMatchObject({
      statusCode: 500,
      errorCode: 'UNKNOWN_ERROR',
    });
  });

  it('returns undefined for 204 No Content', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => {
        throw new Error('should not be called');
      },
    });
    const result = await apiDelete('/api/test');
    expect(result).toBeUndefined();
  });
});

describe('apiPost sends POST with body', () => {
  it('sends JSON body with POST', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ success: true, data: { id: 'new' } }),
    });
    const result = await apiPost('/api/test', { name: 'new-item' });
    expect(result).toEqual({ id: 'new' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'new-item' }),
      })
    );
  });
});

describe('apiPatch sends PATCH with body', () => {
  it('sends JSON body with PATCH', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: { id: '1', name: 'updated' } }),
    });
    const result = await apiPatch('/api/test/1', { name: 'updated' });
    expect(result).toEqual({ id: '1', name: 'updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
