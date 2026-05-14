#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { Pool } = require('pg');

function loadEnv(file) {
  const env = {};
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      env[key] = val;
    }
  } catch (e) {}
  return env;
}

const env = Object.assign({}, loadEnv('.env'), loadEnv('.env.local'));
const connectionString = env.DATABASE_URL.replace('sslmode=require', 'sslmode=no-verify');
const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

async function count(table) {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
    return parseInt(r.rows[0].count);
  } catch (e) {
    return `ERR: ${e.message.split('\n')[0]}`;
  }
}

(async () => {
  // Correct casing from pg_tables output
  const tables = [
    'user', 'profile', 'Household', 'Property',
    'standardSeat', 'soloSeat', 'premiumSeat',
    'Tenant', 'Content', 'Booking', 'MaintenanceRequest',
    'Conversation', 'Message', 'Event', 'album',
    'propertyListing', 'communityServiceListing',
  ];

  console.log('\n=== Row counts ===');
  for (const t of tables) {
    const n = await count(t);
    console.log(`  ${t.padEnd(25)} ${n}`);
  }

  console.log('\n=== Sample users ===');
  try {
    const r = await pool.query(`SELECT id, name, email, role, "tenantId" FROM "user" LIMIT 5`);
    if (r.rows.length === 0) console.log('  (none)');
    r.rows.forEach(u => console.log(`  ${u.name} | ${u.email} | ${u.role} | tenant:${u.tenantId}`));
  } catch(e) { console.log(' ', e.message); }

  console.log('\n=== Sample profiles ===');
  try {
    const r = await pool.query(`SELECT id, "userId", "isPublic" FROM "profile" LIMIT 5`);
    if (r.rows.length === 0) console.log('  (none)');
    r.rows.forEach(p => console.log(`  userId:${p.userId} | public:${p.isPublic}`));
  } catch(e) { console.log(' ', e.message); }

  console.log('\n=== Sample households ===');
  try {
    const r = await pool.query(`SELECT id, street, unit, "tenantId" FROM "Household" LIMIT 5`);
    if (r.rows.length === 0) console.log('  (none)');
    r.rows.forEach(h => console.log(`  ${h.street} ${h.unit} | tenant:${h.tenantId}`));
  } catch(e) { console.log(' ', e.message); }

  await pool.end();
})();
