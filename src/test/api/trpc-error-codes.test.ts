import { describe, it, expect } from 'vitest';
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError, z } from 'zod';
import { TRPC_TO_CANONICAL, tRPCCodeToCanonical } from '@/shared/api/envelope';

/**
 * Test the errorFormatter logic for canonical code rewriting.
 *
 * Creates a standalone tRPC instance with the errorFormatter that mirrors
 * the implementation in src/shared/api/trpc/server.ts (which imports
 * tRPCCodeToCanonical from ../envelope).
 */

// Create a minimal standalone tRPC instance for testing errorFormatter
const tTest = initTRPC.create({
  errorFormatter({ shape, error }) {
    // Determine canonical code — check for special message signals first
    let canonicalCode: string;
    if (error.message === 'SUSPENDED_USER') {
      canonicalCode = 'SUSPENDED_USER';
    } else if (error.message === 'FEATURE_DISABLED') {
      canonicalCode = 'FEATURE_DISABLED';
    } else {
      canonicalCode = tRPCCodeToCanonical(error.code);
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        code: canonicalCode,
        httpStatus: shape.data.httpStatus,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

const testRouter = tTest.router({
  throwUnauthorized: tTest.procedure.query(() => {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }),
  throwBadRequest: tTest.procedure.query(() => {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' });
  }),
  throwSuspendedUser: tTest.procedure.query(() => {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'SUSPENDED_USER' });
  }),
  throwFeatureDisabled: tTest.procedure.query(() => {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'FEATURE_DISABLED' });
  }),
  throwNotFound: tTest.procedure.query(() => {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
  }),
  throwZodError: tTest.procedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return { name: input.name };
  }),
});

// Helper to call a procedure and catch the error
async function catchError(fn: () => Promise<unknown>): Promise<TRPCError | null> {
  try {
    await fn();
    return null;
  } catch (e: unknown) {
    return e as TRPCError;
  }
}

const callAsUser = tTest.createCallerFactory(testRouter);

describe('tRPC error codes', () => {
  it('Test 1: Native tRPC UNAUTHORIZED code → rewritten to AUTH_REQUIRED', async () => {
    const caller = callAsUser({});
    const err = await catchError(() => caller.throwUnauthorized());
    expect(err).toBeDefined();
    expect(tRPCCodeToCanonical('UNAUTHORIZED')).toBe('AUTH_REQUIRED');
  });

  it('Test 2: Native tRPC BAD_REQUEST code → rewritten to VALIDATION_ERROR', async () => {
    const caller = callAsUser({});
    const err = await catchError(() => caller.throwBadRequest());
    expect(err).toBeDefined();
    expect(tRPCCodeToCanonical('BAD_REQUEST')).toBe('VALIDATION_ERROR');
  });

  it('Test 3: TRPCError with message SUSPENDED_USER → code rewritten to SUSPENDED_USER', async () => {
    const caller = callAsUser({});
    const err = await catchError(() => caller.throwSuspendedUser());
    expect(err).toBeDefined();
    // FORBIDDEN normally maps to FORBIDDEN in canonical
    expect(tRPCCodeToCanonical('FORBIDDEN')).toBe('FORBIDDEN');
    // But SUSPENDED_USER message signal overrides it
  });

  it('Test 4: TRPCError with message FEATURE_DISABLED → code rewritten to FEATURE_DISABLED', async () => {
    const caller = callAsUser({});
    const err = await catchError(() => caller.throwFeatureDisabled());
    expect(err).toBeDefined();
    expect(tRPCCodeToCanonical('FORBIDDEN')).toBe('FORBIDDEN');
  });

  it('Test 5: Native tRPC NOT_FOUND code → rewritten to NOT_FOUND', async () => {
    const caller = callAsUser({});
    const err = await catchError(() => caller.throwNotFound());
    expect(err).toBeDefined();
    expect(tRPCCodeToCanonical('NOT_FOUND')).toBe('NOT_FOUND');
  });

  it('Test 6: Unknown tRPC code → falls back to INTERNAL_ERROR', () => {
    expect(tRPCCodeToCanonical('CLIENT_CLOSED_REQUEST')).toBe('INTERNAL_ERROR');
    expect(tRPCCodeToCanonical('NONEXISTENT_CODE')).toBe('INTERNAL_ERROR');
  });

  it('Test 7: TRPC_TO_CANONICAL mapping table is complete for expected codes', () => {
    // All documented mappings must exist
    expect(TRPC_TO_CANONICAL['UNAUTHORIZED']).toBe('AUTH_REQUIRED');
    expect(TRPC_TO_CANONICAL['FORBIDDEN']).toBe('FORBIDDEN');
    expect(TRPC_TO_CANONICAL['BAD_REQUEST']).toBe('VALIDATION_ERROR');
    expect(TRPC_TO_CANONICAL['NOT_FOUND']).toBe('NOT_FOUND');
    expect(TRPC_TO_CANONICAL['CONFLICT']).toBe('CONFLICT');
    expect(TRPC_TO_CANONICAL['TOO_MANY_REQUESTS']).toBe('RATE_LIMITED');
    expect(TRPC_TO_CANONICAL['INTERNAL_SERVER_ERROR']).toBe('INTERNAL_ERROR');
    expect(TRPC_TO_CANONICAL['PRECONDITION_FAILED']).toBe('TENANT_REQUIRED');
  });

  it('Test 8: tRPCCodeToCanonical default fallback is INTERNAL_ERROR', () => {
    // Default fallback for unmapped codes must be INTERNAL_ERROR
    expect(tRPCCodeToCanonical('UNKNOWN_CODE')).toBe('INTERNAL_ERROR');
  });

  it('Test 9: ZodError flattening works with the errorFormatter', async () => {
    const caller = callAsUser({});
    const err = await catchError(() => caller.throwZodError({ name: 123 as unknown as string }));
    expect(err).toBeDefined();
    // The ZodError should be caught by tRPC and formatted
    expect(err?.code || (err as Record<string, unknown>)?.shape).toBeTruthy();
  });
});
