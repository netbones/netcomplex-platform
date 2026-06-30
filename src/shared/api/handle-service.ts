import 'server-only';
import { eq, and, ilike } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, addresses, handles } from './db';
import type { DbSchema } from './db';
import { createId } from '@shared/lib/id';

// ---------------------------------------------------------------------------
// Reserved platform names (same list as AddressService)
// ---------------------------------------------------------------------------

const RESERVED_NAMES = new Set([
  'admin',
  'support',
  'system',
  'billing',
  'help',
  'maintenance',
  'security',
  'office',
  'community',
  'events',
]);

// ---------------------------------------------------------------------------
// Domain Errors
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HandleService
// ---------------------------------------------------------------------------

export class HandleService {
  private db: NodePgDatabase<DbSchema>;

  constructor(tx?: NodePgDatabase<DbSchema>) {
    this.db = tx ?? db;
  }

  // -- private helpers -------------------------------------------------------

  private isReservedHandle(handle: string): boolean {
    return RESERVED_NAMES.has(handle.toLowerCase());
  }

  private validateHandleFormat(handle: string): void {
    if (!handle || typeof handle !== 'string' || handle.includes('@')) {
      throw new HandleConflictError(
        `Invalid handle format: '${handle}' — handles must be alphanumeric and cannot contain '@'`
      );
    }
  }

  // -- public methods --------------------------------------------------------

  /**
   * Search for handles matching a prefix within a tenant.
   * Returns array of { handle, addressId, status }.
   */
  async search(prefix: string, tenantId: string, limit = 20): Promise<Record<string, unknown>[]> {
    const results = await this.db
      .select({
        id: handles.id,
        handle: handles.handle,
        addressId: handles.addressId,
        status: handles.status,
        createdAt: handles.createdAt,
      })
      .from(handles)
      .where(and(ilike(handles.handle, `${prefix}%`), eq(handles.tenantId, tenantId)))
      .limit(limit);

    return results as unknown as Record<string, unknown>[];
  }

  /**
   * Register a new handle linked to an address.
   * Enforces reserved names and uniqueness.
   */
  async register(
    handle: string,
    addressId: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    // Validate format
    this.validateHandleFormat(handle);

    // Check reserved names
    if (this.isReservedHandle(handle)) {
      throw new HandleConflictError(
        `Handle '${handle}' is reserved — only platform admins may register it`
      );
    }

    // Check uniqueness within tenant
    const existing = await this.db
      .select()
      .from(handles)
      .where(and(eq(handles.handle, handle), eq(handles.tenantId, tenantId)))
      .limit(1);

    if (existing.length > 0) {
      throw new HandleConflictError(`Handle '${handle}' is already registered in this tenant`);
    }

    // Insert
    const id = createId();
    const now = new Date();

    const [record] = await this.db
      .insert(handles)
      .values({
        id,
        tenantId,
        handle,
        addressId,
        status: 'ACTIVE' as string,
        createdAt: now,
      })
      .returning();

    return record;
  }

  /**
   * Release (soft-delete) a handle — sets status=RELEASED.
   */
  async release(handleId: string): Promise<void> {
    await this.db
      .update(handles)
      .set({ status: 'RELEASED' as string } as Record<string, unknown>)
      .where(eq(handles.id, handleId));
  }

  /**
   * Resolve a handle string to its full address + handle record.
   * Returns { handle, addressId, status } joined with the Address table.
   * Returns null if not found.
   */
  async resolve(handle: string, tenantId: string): Promise<Record<string, unknown> | null> {
    const [h] = await this.db
      .select()
      .from(handles)
      .where(
        and(
          eq(handles.handle, handle),
          eq(handles.tenantId, tenantId),
          eq(handles.status, 'ACTIVE')
        )
      )
      .limit(1);

    if (!h) return null;

    // Return the handle record (callers can resolve the address separately
    // or join via addressId).  The plan specifies HandleService resolve()
    // should NOT import AddressService to avoid circular deps.
    return h as unknown as Record<string, unknown>;
  }
}
