/**
 * Locale key parity check — ADVISORY-026 Phase 4.
 * Verifies all 4 locale trees (en, af, xh, zu) have identical key structures.
 * Run: npx tsx scripts/audit-locale-parity.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALE_DIR = path.resolve(__dirname, '../public/locales');
const LOCALES = ['en', 'af', 'xh', 'zu'];

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];

function flattenKeys(obj: JsonObject, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as JsonObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadLocale(locale: string): JsonObject {
  const dir = path.join(LOCALE_DIR, locale);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const merged: JsonObject = {};
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const data = JSON.parse(content);
    const nsKey = file.replace('.json', '');
    merged[nsKey] = data;
  }
  return merged;
}

const localeData = Object.fromEntries(LOCALES.map(locale => [locale, loadLocale(locale)]));

const localeKeys = Object.fromEntries(
  LOCALES.map(locale => [locale, new Set(flattenKeys(localeData[locale]))])
);

const enKeys = localeKeys['en'];
let hasDiff = false;

for (const locale of LOCALES.slice(1)) {
  const keys = localeKeys[locale];
  const missing = [...enKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !enKeys.has(k));

  if (missing.length > 0) {
    console.error(`❌ ${locale} is missing keys: ${missing.join(', ')}`);
    hasDiff = true;
  }
  if (extra.length > 0) {
    console.error(`❌ ${locale} has extra keys not in en: ${extra.join(', ')}`);
    hasDiff = true;
  }
}

// Check for any remaining Soralia literals in locale JSON
let soraliaFound = false;
for (const locale of LOCALES) {
  const dir = path.join(LOCALE_DIR, locale);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    if (content.includes('Soralia')) {
      console.error(`❌ ${locale}/${file} still contains "Soralia" literal`);
      soraliaFound = true;
    }
  }
}

if (!hasDiff) {
  console.log('✅ All 4 locale trees have identical key structures');
}
if (!soraliaFound) {
  console.log('✅ No Soralia-brand literals remain in any locale file');
}

if (hasDiff || soraliaFound) {
  process.exit(1);
}
