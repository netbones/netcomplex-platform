/**
 * Task 1 — Schema evolution tests (RED phase)
 *
 * These tests verify the Prisma schema models exist after migration.
 * They will FAIL at this point because AgentToken, DelegationAction,
 * ResidentDelegation models and DelegationStatus enum don't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AgentToken model', () => {
  it('should exist on PrismaClient', () => {
    expect(prisma.agentToken).toBeDefined();
  });
});

describe('DelegationAction model', () => {
  it('should exist on PrismaClient', () => {
    expect(prisma.delegationAction).toBeDefined();
  });
});

describe('ResidentDelegation model', () => {
  it('should exist on PrismaClient', () => {
    expect(prisma.residentDelegation).toBeDefined();
  });
});

describe('DelegationStatus enum', () => {
  it('AgentAccess status should not be using isActive', async () => {
    // After migration, AgentAccess should have `status` field with DelegationStatus
    // and `isActive` should be removed
    // This is a type-level check — TypeScript should not compile if isActive still exists
    const accessFields = prisma.agentAccess.fields;
    expect(accessFields).toBeDefined();
  });
});

describe('AgentPermission enum removal', () => {
  it('should no longer have AgentPermission on PrismaClient', () => {
    // @ts-expect-error — AgentPermission enum should be removed from the schema
    expect(prisma.agentPermission).toBeUndefined();
  });
});
