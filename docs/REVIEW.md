review of the codebase and documentation, here is an analysis of the
multi-tenant architecture, identifying critical gaps, technical debt, and architectural
"gotchas."

1. The "Single-Tenant User" Gotcha

- Issue: The user model (src/shared/api/auth.ts) has a required tenantId field.
- Impact: This strictly locks a user's identity to one tenant. A resident who owns
  properties in two different villages (tenants) cannot use the same email for both.
- Technical Debt: This deviates from Better Auth's standard design, which typically uses
  the organization plugin to allow one user to have many memberships. By putting tenantId
  on the user itself, you lose the ability for users to switch between communities without
  re-authenticating with different accounts.

2. Dual Identity System (Redundancy & Drift)

- Issue: Tables like households and members contain both organizationId (Better Auth) and
  tenantId (Custom).
- Risk: The codebase uses tenantId for data partitioning and theming, but organizationId
  for roles and invitations. If these two IDs ever drift (e.g., a user is moved between
  organizations but their tenantId isn't updated), they will experience "identity
  drift"—seeing one tenant's branding but having another's permissions.

3. Security Gap: Header-Based Isolation

- Issue: withTenant() and getCurrentTenant() resolve the tenant solely from the
  x-tenant-id header set by the middleware.
- Gap: The middleware (src/proxy.ts) sets these headers based on the URL, not the user
  session.
- Scenario: If an authenticated user from Tenant A manually navigates to
  tenant-b.netbones.co.za, the headers will resolve to Tenant B. If a server action uses
  db.where(eq(table.tenantId, tenantIdFromHeaders)), the user may successfully query
  Tenant B's data because the application doesn't verify that the user.tenantId matches
  the header.tenantId.

4. Brittle Tenant Resolution

- Issue: src/proxy.ts uses host.split('.')[0] for subdomain resolution.
- Gotcha: This logic fails for nested subdomains (e.g., dev.soralia.netbones.co.za) or
  complex custom domain structures. It also requires TENANT_DOMAINS to be hardcoded in the
  middleware file.

5. Maintenance Debt: Manual Query Mapping

- Issue: The tenantQueries object in src/shared/api/tenant/base.ts manually maps every
  single table in the database to a tenant filter.
- Technical Debt: Every time a new table is added to the schema, this file must be
  manually updated. This is prone to human error (forgetting to add a new table), which
  could lead to data leakage where a query accidentally returns data from all tenants.

6. Incomplete Row Level Security (RLS)

- Issue: While some models (like Message) have comments referencing RLS, it is not
  implemented at the database level across the entire schema.
- Gap: In a shared-database multi-tenant model, RLS is the "last line of defense." Relying
  purely on application-level filtering (.where(eq(tenantId, ...))) is risky as it only
  takes one missing where clause to leak private community data.

Summary of Recommendations

1.  Secure withTenant: Update the helper to cross-verify the session's user.tenantId
    against the requested header.tenantId.
2.  Generic Scoping: Implement a generic Drizzle helper or middleware to automatically
    inject tenantId filters into queries rather than using the manual tenantQueries map.
3.  Unify Identifiers: Determine if organizationId can be the sole source of truth to
    remove the redundant tenantId fields where possible.
4.  Centralize Config: Move hardcoded domains and slugs from src/proxy.ts into environment
    variables or a cached database lookup.
