---
title: Multi tenant
status: current
reviewed: 2026-07-28
tags: [multi-tenant, architecture]
audience: developer
---

GENERAL ADVICE ON MULTI-TENANT TRANSITION

Transitioning a single-organization HOA app to multi-tenant with a "1 seat + 5 profiles" model is a classic authorization challenge. Since you're using Better Auth, you're in a good spot—it flexible, but you'll need to map your household logic to its internal structures.

Here is how to approach the user and organization model:

1. The "Organization" is the HOA
   In your database, the Organization is the HOA itself. Every piece of data (announcements, fees, rules) must have an organization_id.

2. The "Household" as a Sub-Group
   The "1 seat + 5 profiles" requirement means a "User" in the system isn't just an individual; it's a Household Entity.

- The Seat (Primary): This is the main user account in Better Auth. They own the billing relationship or the official "membership" to the HOA.
- The Profiles (Sub-users): Don't create 5 separate "User" accounts for these if they don't need unique passwords or private data. Instead, treat them as Profiles or Sub-accounts under the Primary Seat.
- Implementation: Use a profiles table linked to the user_id. Each profile has a name and a "profile index" (1–5).

3. Login Flow with Better Auth
   Better Auth handles the session, but your application logic must handle the persona:

- Shared Credentials (Netflix Model): If the household shares one login, the user logs in once and then selects "Who is using the app?" (the Netflix model).

- Unique Credentials: If profiles need their own logins, you'll need to use Better Auth's Organization/Teams feature. The "Household" becomes a team within the "HOA" organization. Warning: This adds significant complexity to your UI.

4. Data Isolation Strategy
   Since you haven't deployed yet, implement Row-Level Security (RLS) immediately if you're using PostgreSQL.

- Every table (e.g., work_orders, gate_logs) must have an organization_id.

- The profiles or aliases should have a household_id to ensure one family can't see another family's internal notes.

5. Multi-Tenancy via Subdomains
   For HOAs, it's often cleaner to provide oak-ridges.your-app.com and sunset-valley.your-app.com.

- Better Auth can be configured to be domain-aware.

- When a user hits oak-ridges, your middleware extracts the slug, finds the organization_id, and ensures the login only checks users belonging to that HOA.

Do the profiles (occupants) need their own unique email/password logins, or is it better for them to share one login and select a profile (like Netflix)?
