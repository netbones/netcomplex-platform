import 'server-only';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DbSchema } from './db';

// Stub — RED phase

export class HandleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandleConflictError';
  }
}

export class HandleNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandleNotFoundError';
  }
}

export class HandleService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(tx?: any) {
    this.db = tx;
  }

  async search(
    _prefix: string,
    _tenantId: string,
    _limit?: number
  ): Promise<Record<string, unknown>[]> {
    throw new Error('Not implemented');
  }

  async register(
    _handle: string,
    _addressId: string,
    _tenantId: string
  ): Promise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }

  async release(_handleId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async resolve(_handle: string, _tenantId: string): Promise<Record<string, unknown> | null> {
    throw new Error('Not implemented');
  }
}
