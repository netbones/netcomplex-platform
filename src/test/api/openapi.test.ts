import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  generateOpenApiSpec: vi.fn(),
}));

vi.mock('@server/openapi/generator', () => ({
  generateOpenApiSpec: mocks.generateOpenApiSpec,
}));

import { GET } from '@/app/api/openapi.json/route';

describe('GET /api/openapi.json', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the OpenAPI spec as JSON', async () => {
    const expectedSpec = {
      openapi: '3.0.0',
      info: { title: 'Soralia Village API', version: '1.0.0' },
      paths: {},
    };
    mocks.generateOpenApiSpec.mockResolvedValue(expectedSpec);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(expectedSpec);
    expect(mocks.generateOpenApiSpec).toHaveBeenCalledOnce();
  });

  it('returns 200 with empty spec object when generator returns empty', async () => {
    mocks.generateOpenApiSpec.mockResolvedValue({});

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({});
  });

  it('throws when generator fails', async () => {
    mocks.generateOpenApiSpec.mockRejectedValue(new Error('Generation failed'));

    await expect(GET()).rejects.toThrow('Generation failed');
  });
});
