---
title: Module
status: current
reviewed: 2026-07-28
tags: [steering, governance]
audience: all
---

Let me do a focused review of the project tree first,

then address the modular services question. Two distinct things to address here.

First the schema progress review, then the modular services architecture question with a diagram.

Schema progress review: The prisma/drizzle/ folder has grown meaningfully since the last snapshot. Notable new files are properties.ts, properties-relations.ts, properties-topremium-seats.ts, properties-topremium-seats-relations.ts, and occupancy-type-enum.ts. The previous snapshot used households.ts as the primary residential unit — it appears a rename/split is underway toward properties, which is a more generic, multi-tenant-appropriate term. The households-topremium-seats files from before are now properties-topremium-seats, which tracks. The migrations tell the same story: three applied so far — the original user table, the org_id backfill, and making tenantId nullable. The tenants.ts schema file is still present and unchanged. No new tenant-specific tables have been added (no tenant_modules, tenant_features, or similar), which leads directly into your question.

Now for the modular services question. Here's the recommended approach:

The right pattern is a two-layer model: a platform-level module registry (what NetComplex offers), and a per-tenant module selection table (what each tenant has enabled, and at what tier). This separates "what exists" from "who has what."

see [netcomplex_modular_services_architecture](./netcomplex_modular_services_architecture.html) document

On the schema changes: The rename from households → properties is the right call for a multi-tenant platform — a property management scheme in Cape Town and a community in Johannesburg shouldn't both be shoehorned into "household" semantics.

On the modular services question, the key decision is: don't put this in a json array on the tenants table.

Two dedicated tables (platform_modules + tenant_modules) give you queryability, per-module config, and a clean tier enforcement path. Here's what each piece does in your existing code:

min_tier on platform_modules is your hard platform-level lock — a tenant on Standard cannot snake their way into a Premium module via a direct API call.

config jsonb on tenant_modules is where things like "this tenant's bookings module is limited to 2 venues" or "show this as 'Reserve a Facility' not 'Bookings'" live — without a new column per quirk.

The tier column you'd add to tenants.ts (just an enum: standard | premium | enterprise) drives both middleware coarse-gating and the matrix validation.

Your existing FeatureGate.tsx becomes the client-side expression of this — it reads the resolved module list from tenant context and renders a locked state for anything not in the list.

TierGuard.tsx can then be retired or collapsed into FeatureGate since the tier check becomes implicit: if the module isn't in tenant_modules, it's gated regardless of why.
