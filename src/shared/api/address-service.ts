import 'server-only';
import { eq, and, ilike } from 'drizzle-orm';
import { db, addresses, handles, tenants } from './db';

import { standardSeats } from '@schema/standard-seats';
import { soloSeats } from '@schema/solo-seats';
import { premiumSeats } from '@schema/premium-seats';
import { profiles } from '@schema/profiles';
import { createId } from '@shared/lib/id';

// ---------------------------------------------------------------------------
// Domain Errors
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Reserved platform names (per CONTEXT.md D-SPECIFIC-01)
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
// AddressService
// ---------------------------------------------------------------------------

export class AddressService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(tx?: any) {
    this.db = tx ?? db;
  }

  // -- private helpers -------------------------------------------------------

  private parseAddress(address: string): { localPart: string; domain: string } {
    const atIndex = address.lastIndexOf('@');
    if (atIndex === -1 || atIndex === address.length - 1) {
      throw new AddressValidationError(`Invalid address format: '${address}' — must contain '@'`);
    }
    const localPart = address.slice(0, atIndex);
    const domain = address.slice(atIndex + 1);
    if (!localPart || !domain) {
      throw new AddressValidationError(
        `Invalid address format: '${address}' — local part and domain are required`
      );
    }
    return { localPart, domain };
  }

  private isReservedName(localPart: string): boolean {
    return RESERVED_NAMES.has(localPart.toLowerCase());
  }

  private validateAddressFormat(address: string): void {
    if (!address || typeof address !== 'string' || !address.includes('@')) {
      throw new AddressValidationError(`Invalid address format: '${address}'`);
    }
    this.parseAddress(address); // throws on format violations
  }

  // -- public methods --------------------------------------------------------

  /**
   * Reserve a new address in the registry.
   * Returns the created AddressRecord with status=ACTIVE.
   */
  async reserve(
    address: string,
    tenantId: string,
    kind: string,
    opts?: { ownerType?: string; ownerId?: string | null; skipReservedCheck?: boolean }
  ): Promise<Record<string, unknown>> {
    // Validate format
    this.validateAddressFormat(address);

    const { localPart, domain } = this.parseAddress(address);

    // Check reserved names (non-admin cannot reserve these)
    if (!opts?.skipReservedCheck && this.isReservedName(localPart)) {
      throw new AddressConflictError(
        `Address '${address}' uses a reserved name — only platform admins may reserve it`
      );
    }

    // Check uniqueness within tenant
    const existing = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.address, address), eq(addresses.tenantId, tenantId)))
      .limit(1);

    if (existing.length > 0) {
      throw new AddressConflictError(`Address '${address}' is already in use in this tenant`);
    }

    // Insert the address
    const id = createId();
    const now = new Date();

    const [record] = await this.db
      .insert(addresses)
      .values({
        id,
        tenantId,
        address,
        localPart,
        domain,
        kind: kind as string,
        status: 'ACTIVE' as string,
        ownerType: (opts?.ownerType as string) ?? null,
        ownerId: opts?.ownerId ?? null,
        receiveExternal: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return record;
  }

  /**
   * Resolve an address string (or handle) to its AddressRecord.
   * Returns null if not found.
   */
  async resolve(
    addressOrHandle: string,
    tenantId: string
  ): Promise<Record<string, unknown> | null> {
    // Try direct address match first
    if (addressOrHandle.includes('@')) {
      const [record] = await this.db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.address, addressOrHandle),
            eq(addresses.tenantId, tenantId),
            eq(addresses.status, 'ACTIVE')
          )
        )
        .limit(1);
      if (record) return record;
      return null;
    }

    // Try handle resolution
    const [handle] = await this.db
      .select()
      .from(handles)
      .where(
        and(
          eq(handles.handle, addressOrHandle),
          eq(handles.tenantId, tenantId),
          eq(handles.status, 'ACTIVE')
        )
      )
      .limit(1);

    if (!handle) return null;

    const [addr] = await this.db
      .select()
      .from(addresses)
      .where(eq(addresses.id, handle.addressId as string))
      .limit(1);

    return addr ?? null;
  }

  /**
   * Release (soft-delete) an address — sets status=DELETED, releasedAt=now().
   */
  async release(addressId: string): Promise<void> {
    await this.db
      .update(addresses)
      .set({ status: 'DELETED' as string, releasedAt: new Date() } as Record<string, unknown>)
      .where(eq(addresses.id, addressId));
  }

  /**
   * Move an address to a new address string (e.g. resident changes seat type).
   * Validates uniqueness of the new address.
   */
  async move(
    addressId: string,
    newAddress: string,
    tenantId: string
  ): Promise<Record<string, unknown>> {
    this.validateAddressFormat(newAddress);

    const { localPart, domain } = this.parseAddress(newAddress);

    // Check reserved names
    if (this.isReservedName(localPart)) {
      throw new AddressConflictError(
        `Address '${newAddress}' uses a reserved name — only platform admins may use it`
      );
    }

    // Check uniqueness of new address (excluding current)
    const existing = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.address, newAddress), eq(addresses.tenantId, tenantId)))
      .limit(1);

    if (existing.length > 0) {
      throw new AddressConflictError(`Address '${newAddress}' is already in use in this tenant`);
    }

    const now = new Date();
    await this.db
      .update(addresses)
      .set({
        address: newAddress,
        localPart,
        domain,
        updatedAt: now,
      } as Record<string, unknown>)
      .where(eq(addresses.id, addressId));

    // Return the updated record
    const [record] = await this.db
      .select()
      .from(addresses)
      .where(eq(addresses.id, addressId))
      .limit(1);

    return record;
  }

  /**
   * Update the forward strategy for an address (DIRECT or HOUSEHOLD).
   */
  async forward(addressId: string, strategy: string): Promise<void> {
    await this.db
      .update(addresses)
      .set({ forwardStrategy: strategy } as Record<string, unknown>)
      .where(eq(addresses.id, addressId));
  }

  /**
   * Archive an address — sets status=ARCHIVED, archivedUntil=now() + 90 days.
   */
  async archive(addressId: string): Promise<void> {
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    await this.db
      .update(addresses)
      .set({
        status: 'ARCHIVED' as string,
        archivedUntil: new Date(Date.now() + ninetyDays),
      } as Record<string, unknown>)
      .where(eq(addresses.id, addressId));
  }

  /**
   * Look up an address by its polymorphic owner (ownerType + ownerId).
   */
  async lookup(
    ownerType: string,
    ownerId: string,
    tenantId: string
  ): Promise<Record<string, unknown> | null> {
    const [record] = await this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(
            addresses.ownerType,
            ownerType as
              | 'SYSTEM'
              | 'PROVIDER'
              | 'PROFILE'
              | 'PROPERTY'
              | 'STANDARD_SEAT'
              | 'SOLO_SEAT'
              | 'PREMIUM_SEAT'
          ),
          eq(addresses.ownerId, ownerId),
          eq(addresses.tenantId, tenantId)
        )
      )
      .limit(1);

    return record ?? null;
  }

  /**
   * Find the address owned by any of the user's seat/profiles.
   * Queries StandardSeats, SoloSeats, PremiumSeats, then Profile.
   */
  async lookupByOwnerInSeats(
    userId: string,
    tenantId: string
  ): Promise<Record<string, unknown> | null> {
    // Check StandardSeats
    const [stdSeat] = await this.db
      .select()
      .from(standardSeats)
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq((standardSeats as any).userId, userId),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq((standardSeats as any).tenantId, tenantId)
        )
      )
      .limit(1);

    if (stdSeat) {
      const [addr] = await this.db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.ownerType, 'STANDARD_SEAT'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            eq(addresses.ownerId, (stdSeat as any).id),
            eq(addresses.tenantId, tenantId)
          )
        )
        .limit(1);
      if (addr) return addr;
    }

    // Check SoloSeats
    const [soloSeat] = await this.db
      .select()
      .from(soloSeats)
      .where(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        and(eq((soloSeats as any).userId, userId), eq((soloSeats as any).tenantId, tenantId))
      )
      .limit(1);

    if (soloSeat) {
      const [addr] = await this.db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.ownerType, 'SOLO_SEAT'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            eq(addresses.ownerId, (soloSeat as any).id),
            eq(addresses.tenantId, tenantId)
          )
        )
        .limit(1);
      if (addr) return addr;
    }

    // Check PremiumSeats
    const [premiumSeat] = await this.db
      .select()
      .from(premiumSeats)
      .where(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        and(eq((premiumSeats as any).userId, userId), eq((premiumSeats as any).tenantId, tenantId))
      )
      .limit(1);

    if (premiumSeat) {
      const [addr] = await this.db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.ownerType, 'PREMIUM_SEAT'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            eq(addresses.ownerId, (premiumSeat as any).id),
            eq(addresses.tenantId, tenantId)
          )
        )
        .limit(1);
      if (addr) return addr;
    }

    // Check Profile
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        and(eq((profiles as any).userId, userId), eq((profiles as any).tenantId, tenantId))
      )
      .limit(1);

    if (profile) {
      const [addr] = await this.db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.ownerType, 'PROFILE'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            eq(addresses.ownerId, (profile as any).id),
            eq(addresses.tenantId, tenantId)
          )
        )
        .limit(1);
      if (addr) return addr;
    }

    return null;
  }

  /**
   * Validate an address string format. Throws AddressValidationError on failure.
   */
  async validate(address: string): Promise<void> {
    this.validateAddressFormat(address);
  }

  /**
   * Static utility: generate an address string from kind and options.
   * Resolves the tenant domain dynamically — NOT hardcoded.
   */
  static async generate(
    kind: string,
    tenantId: string,
    options?: { unitNumber?: string; name?: string; custom?: string; companyName?: string }
  ): Promise<string> {
    // Resolve tenant domain
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    const tenantDomain =
      (tenant as { customDomain?: string; slug?: string } | undefined)?.customDomain ??
      `${(tenant as { slug?: string } | undefined)?.slug ?? 'default'}.netbones.co.za`;

    switch (kind) {
      case 'STANDARD':
        return `unit${options?.unitNumber ?? '000'}@${tenantDomain}`;
      case 'ALIAS':
        return `${options?.name ?? 'resident'}.unit${options?.unitNumber ?? '000'}@${tenantDomain}`;
      case 'SOLO':
        return `${options?.name ?? 'resident'}@${tenantDomain}`;
      case 'PREMIUM':
        return `${options?.custom ?? 'premium'}@${tenantDomain}`;
      case 'PROVIDER':
        return `${(options?.companyName ?? 'provider').toLowerCase().replace(/[^a-z0-9]/g, '')}@${tenantDomain}`;
      default:
        throw new AddressValidationError(`Unknown address kind: '${kind}'`);
    }
  }
}

// Re-export the tables used by HandleService for internal use
export { handles } from './db';

/**
 * Handle search helper: ilike query for prefix matching.
 * Used by HandleService.
 */
export { ilike };
