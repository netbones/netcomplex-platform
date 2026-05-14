#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
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
    return `ERROR: ${e.message}`;
  }
}

async function sample(table, cols, limit = 3) {
  try {
    const r = await pool.query(`SELECT ${cols} FROM "${table}" LIMIT ${limit}`);
    return r.rows;
  } catch (e) {
    return [];
  }
}

(async () => {
  const tables = [
    'User', 'Profile', 'Household', 'Property',
    'StandardSeat', 'SoloSeat', 'PremiumSeat',
    'Tenant', 'Content', 'Booking', 'MaintenanceRequest',
  ];

  console.log('\n=== Row counts ===');
  for (const t of tables) {
    const n = await count(t);
    console.log(`  ${t.padEnd(20)} ${n}`);
  }

  console.log('\n=== Sample Users ===');
  const users = await sample('User', 'id, name, email, role, "tenantId"');
  users.forEach(u => console.log(`  ${u.name} | ${u.email} | ${u.role} | tenant:${u.tenantId}`));

  console.log('\n=== Sample Profiles ===');
  const profiles = await sample('Profile', 'id, "userId", "isPublic"');
  profiles.forEach(p => console.log(`  userId:${p.userId} | public:${p.isPublic}`));

  console.log('\n=== Sample Households ===');
  const hh = await sample('Household', 'id, street, unit, "tenantId"');
  hh.forEach(h => console.log(`  ${h.street} ${h.unit} | tenant:${h.tenantId}`));

  await pool.end();
})();
