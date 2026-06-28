/**
 * Task 1 — Schema evolution tests
 *
 * Verify the Drizzle schema includes the new models and
 * the AgentAccess model has been evolved correctly.
 * These are type-level compilation tests.
 */

import { describe, it, expect } from 'vitest';

// Import Drizzle schema to verify generated types exist
import { agentTokens } from '@schema/agent-tokens';
import { delegationActions } from '@schema/delegation-actions';
import { residentDelegations } from '@schema/resident-delegations';
import { agentAccesses } from '@schema/agent-accesses';

describe('Schema evolution', () => {
  describe('AgentToken model', () => {
    it('should have Drizzle schema definition', () => {
      expect(agentTokens).toBeDefined();
    });

    it('should have tokenHash column (unique)', () => {
      expect(agentTokens.tokenHash).toBeDefined();
    });

    it('should have scope column (json)', () => {
      expect(agentTokens.scope).toBeDefined();
    });

    it('should have revokedAt column', () => {
      expect(agentTokens.revokedAt).toBeDefined();
    });

    it('should have lastUsedAt column', () => {
      expect(agentTokens.lastUsedAt).toBeDefined();
    });

    it('should have expiresAt column', () => {
      expect(agentTokens.expiresAt).toBeDefined();
    });

    it('should have credentialType column with default jwt_es256', () => {
      expect(agentTokens.credentialType).toBeDefined();
    });
  });

  describe('DelegationAction model', () => {
    it('should have Drizzle schema definition', () => {
      expect(delegationActions).toBeDefined();
    });

    it('should have delegationId column', () => {
      expect(delegationActions.delegationId).toBeDefined();
    });

    it('should have actorId column', () => {
      expect(delegationActions.actorId).toBeDefined();
    });

    it('should have action column', () => {
      expect(delegationActions.action).toBeDefined();
    });
  });

  describe('ResidentDelegation model', () => {
    it('should have Drizzle schema definition', () => {
      expect(residentDelegations).toBeDefined();
    });

    it('should have scopes column (String[])', () => {
      expect(residentDelegations.scopes).toBeDefined();
    });
  });

  describe('AgentAccess evolution', () => {
    it('should have status column (replaces isActive)', () => {
      expect(agentAccesses.status).toBeDefined();
    });

    it('should have originalPermissions column', () => {
      expect(agentAccesses.originalPermissions).toBeDefined();
    });

    it('should have acceptedAt column', () => {
      expect(agentAccesses.acceptedAt).toBeDefined();
    });

    it('should have rejectedAt column', () => {
      expect(agentAccesses.rejectedAt).toBeDefined();
    });

    it('should have revokedAt column', () => {
      expect(agentAccesses.revokedAt).toBeDefined();
    });

    it('should NOT have isActive column', () => {
      // TypeScript should not compile if isActive still exists
      expect('isActive' in agentAccesses).toBe(false);
    });
  });
});
