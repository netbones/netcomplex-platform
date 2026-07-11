import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Better Auth client
const mockSignUpEmail = vi.fn();
vi.mock('@api/client', () => ({
  authClient: {
    signUp: {
      email: mockSignUpEmail,
    },
  },
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}));

describe('identitySignupSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts valid identity fields (firstName, lastName, email, password, confirmPassword)', async () => {
    const { identitySignupSchema } = await import('@entities/tenant');
    const result = identitySignupSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'StrongP1!',
      confirmPassword: 'StrongP1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects communityName field (not present in identity schema)', async () => {
    const { identitySignupSchema } = await import('@entities/tenant');
    const result = identitySignupSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'StrongP1!',
      confirmPassword: 'StrongP1!',
      communityName: 'My Community',
      subdomain: 'mycomm',
      plan: 'core',
    });
    // identity schema should NOT recognize communityName/subdomain/plan
    const data = result.success ? result.data : {};
    expect((data as Record<string, unknown>).communityName).toBeUndefined();
    expect((data as Record<string, unknown>).subdomain).toBeUndefined();
    expect((data as Record<string, unknown>).plan).toBeUndefined();
  });

  it('rejects when password and confirmPassword mismatch', async () => {
    const { identitySignupSchema } = await import('@entities/tenant');
    const result = identitySignupSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'StrongP1!',
      confirmPassword: 'DifferentP1!',
    });
    expect(result.success).toBe(false);
  });
});

describe('communitySetupSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts valid community setup fields', async () => {
    const { communitySetupSchema } = await import('@entities/tenant');
    const result = communitySetupSchema.safeParse({
      communityName: 'My Community',
      subdomain: 'mycomm',
      plan: 'core',
    });
    expect(result.success).toBe(true);
  });

  it('rejects subdomain with invalid characters', async () => {
    const { communitySetupSchema } = await import('@entities/tenant');
    const result = communitySetupSchema.safeParse({
      communityName: 'My Community',
      subdomain: 'INVALID_UPPER',
      plan: 'core',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid plan enum value', async () => {
    const { communitySetupSchema } = await import('@entities/tenant');
    const result = communitySetupSchema.safeParse({
      communityName: 'My Community',
      subdomain: 'mycomm',
      plan: 'invalid-plan',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing communityName', async () => {
    const { communitySetupSchema } = await import('@entities/tenant');
    const result = communitySetupSchema.safeParse({
      subdomain: 'mycomm',
      plan: 'core',
    });
    expect(result.success).toBe(false);
  });
});

describe('useSignupForm', () => {
  beforeEach(() => {
    mockSignUpEmail.mockReset();
    mockPush.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes handleNext and handleBack but NOT handleSubdomainChange', async () => {
    const { useSignupForm } = await import('@/features/auth/model/useSignupForm');
    const { result } = renderHook(() => useSignupForm());
    expect(result.current.handleNext).toBeDefined();
    expect(result.current.handleBack).toBeDefined();
    // handleSubdomainChange should NOT exist (subdomain field removed from form)
    expect((result.current as Record<string, unknown>).handleSubdomainChange).toBeUndefined();
  });

  it('calls authClient.signUp.email() on successful submit instead of fetch to /api/platform/tenants', async () => {
    mockSignUpEmail.mockResolvedValueOnce({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const { useSignupForm } = await import('@/features/auth/model/useSignupForm');
    const { result } = renderHook(() => useSignupForm());

    // Set form values
    await act(async () => {
      result.current.form.setValue('firstName', 'John');
      result.current.form.setValue('lastName', 'Doe');
      result.current.form.setValue('email', 'john@example.com');
      result.current.form.setValue('password', 'StrongP1!');
      result.current.form.setValue('confirmPassword', 'StrongP1!');
    });

    // Advance through Step 1 (identity fields)
    await act(async () => {
      await result.current.handleNext();
    });

    // Advance through Step 2 (password) — triggers submit
    await act(async () => {
      await result.current.handleNext();
    });

    // After submission, authClient.signUp.email should have been called
    expect(mockSignUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'john@example.com',
        password: 'StrongP1!',
        name: 'John Doe',
        callbackURL: '/verify-email',
      })
    );
  });
});
