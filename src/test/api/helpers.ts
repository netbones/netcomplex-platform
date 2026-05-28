import { vi } from 'vitest';

/**
 * Shared test helpers for API route tests.
 * Provides mock request creation and Drizzle query chain builders.
 */

/**
 * Create a mock Request object with standard tenant headers.
 * Use this for all API route tests to ensure consistent request format.
 */
export function createMockRequest({
  method = 'GET',
  url = 'http://localhost:3000/api/test',
  body,
  headers = {},
}: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a chainable Drizzle select mock.
 * Supports: select().from().where(), select().from().innerJoin().where(), etc.
 * The chain returns the given result when awaited.
 */
export function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  const whereResult = Promise.resolve(result);
  const limitFn = vi.fn(() => Promise.resolve(result));
  const orderByFn = vi.fn(() => Promise.resolve(result));

  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => {
    const thenable = {
      then: (resolve: (v: unknown[]) => void, reject: (e: Error) => void) =>
        whereResult.then(resolve, reject),
      limit: limitFn,
      orderBy: orderByFn,
      offset: vi.fn(() => thenable),
    };
    return thenable;
  });
  chain.limit = limitFn;
  chain.orderBy = orderByFn;
  chain.offset = vi.fn(() => chain);

  return chain;
}

/**
 * Create a chainable Drizzle insert mock.
 * Supports: insert().values().returning()
 */
export function makeInsertChain(result: unknown[]) {
  return {
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve(result)),
    })),
  };
}

/**
 * Create a chainable Drizzle update mock.
 * Supports: update().set().where().returning()
 */
export function makeUpdateChain(result: unknown[]) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

/**
 * Create a chainable Drizzle delete mock.
 * Supports: delete().where()
 */
export function makeDeleteChain() {
  return {
    where: vi.fn(() => Promise.resolve({})),
  };
}
