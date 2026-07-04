/**
 * Soralia Village — seed data.
 *
 * A free-standing estate village of ~180 individual homes near Muizenberg
 * in the Cape Peninsula. Streets are named after indigenous fynbos plants.
 *
 * This file is now a re-export shim. The actual seed data lives in
 * domain modules under `./soralia-village/`:
 *
 *   tenant.ts          — Tenant record
 *   people.ts          — Users (residents, board, admin, agents)
 *   housing.ts         — Properties, households, profiles, seats
 *   marketplace.ts     — Service listings & reviews
 *   groups.ts          — Interest groups & members
 *   resources.ts       — Governance documents, DIY guides, reports
 *   content.ts         — CMS content (news, blogs, events, campaigns, conservation)
 *   events-surveys.ts  — Calendar events, surveys, questions, responses, competitions
 *   maintenance.ts     — Categories, bursaries, teams, providers, requests
 *   settings.ts        — Settings keys (branding, map, education, stats)
 *   billing.ts         — Subscription tiers, reputations, merits, transactions
 *   announcements.ts   — Community announcements
 *   index.ts           — Assembly re-export
 */

export { SORALIA_VILLAGE } from './soralia-village/index';
