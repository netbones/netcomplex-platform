# Project Roadmap

## Project: NetComplex Multi-Tenant Platform

Transform Soralia Village from single-tenant to white-label SaaS platform.

---

## Phase: 00-multi-tenant-foundation

**Goal:** Establish core multi-tenant infrastructure — tenant resolution, enforcement helpers, seed data

**Status:** In Progress

**Requirements:** MULTI-01, MULTI-02, MULTI-03

**Plans:**

- [x] 00-01-PLAN.md — Phase 0 Foundation (7 tasks) ✅

---

## Future Phases (To Be Planned)

### Phase 1: Enforcement

- Audit all API routes and apply withTenant()
- Wire CSS variables to tenant DB
- Move tenant components
- Build FeatureGate

### Phase 2: Admin UI

- Build tenant management UI
- Feature toggle interface
- Branding upload

### Phase 3: Second Tenant

- Onboard second tenant
- Enable RLS
- Test isolation
