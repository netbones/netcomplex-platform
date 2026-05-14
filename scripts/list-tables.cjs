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

pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
  .then(r => {
    console.log(`\n${r.rows.length} tables in public schema:`);
    r.rows.forEach(row => console.log(' ', row.tablename));
    pool.end();
  })
  .catch(e => { console.error(e.message); pool.end(); });
