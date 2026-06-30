import 'server-only';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DbSchema } from './db';

// Stub — RED phase. Tests should FAIL because methods throw or return wrong values.

export class AddressConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddressConflictError';
  }
}

export class AddressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddressValidationError';
  }
}

export class AddressNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddressNotFoundError';
  }
}

export class AddressService {
  private db: NodePgDatabase<DbSchema>;

  constructor(tx?: NodePgDatabase<DbSchema>) {
    this.db = tx!;
  }

  async reserve(
    _address: string,
    _tenantId: string,
    _kind: string,
    _opts?: { ownerType?: string; ownerId?: string | null; skipReservedCheck?: boolean }
  ): Promise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }

  async resolve(
    _addressOrHandle: string,
    _tenantId: string
  ): Promise<Record<string, unknown> | null> {
    throw new Error('Not implemented');
  }

  async release(_addressId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async move(
    _addressId: string,
    _newAddress: string,
    _tenantId: string
  ): Promise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }

  async forward(_addressId: string, _strategy: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async archive(_addressId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async lookup(
    _ownerType: string,
    _ownerId: string,
    _tenantId: string
  ): Promise<Record<string, unknown> | null> {
    throw new Error('Not implemented');
  }

  async lookupByOwnerInSeats(
    _userId: string,
    _tenantId: string
  ): Promise<Record<string, unknown> | null> {
    throw new Error('Not implemented');
  }

  async validate(_address: string): Promise<void> {
    throw new Error('Not implemented');
  }

  static async generate(
    _kind: string,
    _tenantId: string,
    _options?: Record<string, unknown>
  ): Promise<string> {
    throw new Error('Not implemented');
  }
}
