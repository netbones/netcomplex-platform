#!/usr/bin/env tsx
/**
 * Tenant Isolation Audit Script — M4.5 (BD e0w)
 * Walks every route.ts under src/app/api/, identifies db.{select,update,delete,insert}
 * and tx.* calls, and verifies each route is either (a) inside a route that uses
 * withTenant() / withTenantOptional(), or (b) whitelisted as cross-tenant. v1/tenant
 * and v1/platform re-exports are recursed (max 5 hops) to inherit the canonical's
 * classification. The script preserves any human-curated header above the auto-generated
 * "## Audit Results" line across re-runs.
 * Usage: pnpm exec tsx scripts/audit-tenant-isolation.ts  |  Exits 0 on no FAIL.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = join(ROOT, 'src/app/api');
const REPORT = join(ROOT, 'docs/SECURITY_AUDIT_M4.5.md');

/** Whitelisted cross-tenant platform-admin routes — keep in sync with docs/API_ROUTES.md §5. */
const WHITELISTED_PATHS = new Set([
  '/api/admin/platform/assist', '/api/admin/platform/assist/[id]',
  '/api/admin/platform/tenants', '/api/admin/platform/tenants/[id]',
  '/api/admin/platform/v1/tenants', '/api/admin/platform/v1/onboarding',
  '/api/platform/tenants', '/api/platform/onboarding',
]);
const PUBLIC = new Set(['/api/v1/public/content', '/api/v1/public/competitions', '/api/v1/public/events', '/api/v1/public/resources']);
const SYSTEM = new Set(['/api/v1/system/flags', '/api/v1/system/health']);
const NA_EXACT = new Set([
  '/api/auth/suspension-status', '/api/invitations/accept', '/api/invitations/validate',
  '/api/health', '/api/webhooks/payload', '/api/openapi.json', '/api/trpc/[trpc]',
  '/api/tenants/[id]/modules',
]);
const RE_EXPORT_RE = /^export\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"];?\s*$/m;
const DB_CALL_RE = /\b(?:db|tx)\.(?:select|update|delete|insert)\b/;
const WT_RE = /\bwithTenant(?:Optional)?\s*\(/;
const WT_OPT_RE = /\bwithTenantOptional\s*\(/;
const PLAT_RE = /\b(?:requirePlatformAdmin|isPlatformAdmin)\b/;

type Status = 'PASS' | 'FAIL' | 'WHITELISTED' | 'NEEDS-FOLLOW-UP' | 'N/A';
type Type = 'tenant-scoped' | 'v1-reexport' | 'platform-cross-tenant' | 'public' | 'system' | 'auth' | 'other-na';
interface R { path: string; type: Type; status: Status; source: string; notes: string; }

function findRouteFiles(d: string): string[] {
  const o: string[] = [];
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '.next' || e === 'dist') continue;
    const p = join(d, e), s = statSync(p);
    if (s.isDirectory()) o.push(...findRouteFiles(p));
    else if (s.isFile() && e === 'route.ts') o.push(p);
  }
  return o;
}
const pathFromFile = (f: string): string => '/api/' + relative(API, f).replace(/\\/g, '/').replace(/\/route\.ts$/, '');

function parseReExport(c: string): string | null {
  const m = c.match(RE_EXPORT_RE); if (!m) return null;
  const imp = m[1];
  return imp.startsWith('@/') ? join(ROOT, 'src', imp.slice(2)) + '.ts' : null;
}
const isAuth = (p: string): boolean => p === '/api/auth' || p === '/api/auth/[...all]' || p.startsWith('/api/auth/');

function inspect(file: string, depth = 0): R {
  const path = pathFromFile(file);
  const c = readFileSync(file, 'utf-8');
  const hasDb = DB_CALL_RE.test(c), hasWt = WT_RE.test(c), isPlat = PLAT_RE.test(c);
  if (depth < 5) {
    const t = parseReExport(c);
    if (t) { const i = inspect(resolve(t), depth + 1); return { path, type: 'v1-reexport', status: i.status, source: i.source === 'N/A' ? 'N/A' : 'inherited', notes: `Re-export → ${i.path} (${i.status})` }; }
  }
  if (WHITELISTED_PATHS.has(path)) return { path, type: 'platform-cross-tenant', status: 'WHITELISTED', source: 'platform-admin-check', notes: isPlat ? 'Cross-tenant; uses platform-admin guard' : 'Cross-tenant; not in tenant scope' };
  if (PUBLIC.has(path))   return { path, type: 'public',   status: 'N/A', source: 'N/A', notes: 'Public v1 route' };
  if (SYSTEM.has(path))   return { path, type: 'system',   status: 'N/A', source: 'N/A', notes: 'System v1 route' };
  if (isAuth(path))       return { path, type: 'auth',     status: 'N/A', source: 'N/A', notes: 'Better Auth flow' };
  if (NA_EXACT.has(path)) return { path, type: 'other-na', status: 'N/A', source: 'N/A', notes: 'Token-based, infra, or admin outside tenant scope' };
  if (hasWt) return { path, type: 'tenant-scoped', status: 'PASS', source: WT_OPT_RE.test(c) ? 'withTenantOptional()' : 'withTenant()', notes: hasDb ? 'Calls withTenant() and filters DB' : 'Calls withTenant(); no DB calls' };
  if (hasDb) return { path, type: 'tenant-scoped', status: 'FAIL', source: 'none', notes: 'Touches DB without withTenant() — tenant-isolation bypass' };
  return { path, type: 'tenant-scoped', status: 'PASS', source: 'N/A', notes: 'No DB calls; tenant filter not required' };
}

function buildReport(rs: R[]): { md: string; counts: Record<Status, number> } {
  const c: Record<Status, number> = { PASS: 0, FAIL: 0, WHITELISTED: 0, 'NEEDS-FOLLOW-UP': 0, 'N/A': 0 };
  for (const r of rs) c[r.status]++;
  const o: Record<Status, number> = { FAIL: 0, 'NEEDS-FOLLOW-UP': 1, WHITELISTED: 2, PASS: 3, 'N/A': 4 };
  const s = [...rs].sort((a, b) => o[a.status] - o[b.status] || a.path.localeCompare(b.path));
  const rows = s.map(r => `| \`${r.path}\` | ${r.type} | ${r.status} | ${r.source} | ${r.notes.replace(/\|/g, '\\|')} |`);
  const md = ['## Audit Results', '', `Total routes audited: **${rs.length}**`, '',
    '| Status | Count |', '| --- | --- |', `| PASS | ${c.PASS} |`, `| FAIL | ${c.FAIL} |`,
    `| WHITELISTED | ${c.WHITELISTED} |`, `| NEEDS-FOLLOW-UP | ${c['NEEDS-FOLLOW-UP']} |`, `| N/A | ${c['N/A']} |`, '',
    '### Per-Route Compliance Table', '',
    '| Route | Type | Status | Tenant Filter Source | Notes |', '| --- | --- | --- | --- | --- |', ...rows, ''].join('\n');
  return { md, counts: c };
}

function main(): void {
  const fs = findRouteFiles(API).sort();
  const rs = fs.map(f => inspect(f));
  const { md, counts } = buildReport(rs);
  mkdirSync(dirname(REPORT), { recursive: true });
  // Preserve any human-curated header above "## Audit Results" across re-runs (line-anchored to avoid paragraph collisions).
  let prefix = '';
  try { const e = readFileSync(REPORT, 'utf-8'); const m = e.match(/^## Audit Results$/m); if (m?.index) prefix = e.slice(0, m.index); } catch { /* new file */ }
  writeFileSync(REPORT, prefix + md, 'utf-8');
  console.log(`Total: ${rs.length} | PASS: ${counts.PASS} | FAIL: ${counts.FAIL} | WHITELISTED: ${counts.WHITELISTED} | NEEDS-FOLLOW-UP: ${counts['NEEDS-FOLLOW-UP']} | N/A: ${counts['N/A']}`);
  console.log('Report: docs/SECURITY_AUDIT_M4.5.md');
  if (counts.FAIL > 0) process.exit(1);
}

main();
