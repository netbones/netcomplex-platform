#!/usr/bin/env npx tsx
// Batch-add suspension checks to REST route files.
// Reads file paths from stdin (one per line).
// For each file that calls getSessionAndRole() but does NOT check
// suspension, inject a guardSuspension() call after the null-auth check.

import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin });

let modifiedCount = 0;
let skipCount = 0;
let warnCount = 0;

for await (const file of rl) {
  const trimmed = file.trim();
  if (!trimmed) continue;

  const original = readFileSync(trimmed, 'utf-8');

  // Skip if the file does not call getSessionAndRole
  if (!original.includes('getSessionAndRole(')) {
    continue;
  }

  // Skip if the file already has a suspension check
  if (
    original.includes('guardSuspension(') ||
    original.includes('authData.suspension') ||
    original.includes('.suspension)') ||
    original.includes('throwIfSuspended(') ||
    original.includes('requireNotSuspended(')
  ) {
    skipCount++;
    continue;
  }

  // Find the variable name used for getSessionAndRole result
  const varMatch = original.match(/const\s+(\w+)\s*=\s*await\s+getSessionAndRole\s*\(/);
  if (!varMatch) {
    console.warn(`  ⚠  Could not find variable name in ${trimmed}`);
    warnCount++;
    continue;
  }
  const varName = varMatch[1];

  // Check if guardSuspension is already imported
  const hasImport = original.includes('guardSuspension');

  // Find the null-check line
  const nullCheckPattern = new RegExp(`if\\s*\\(!\\s*${varName}\\s*\\)`);
  const lines = original.split('\n');

  let insertLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (nullCheckPattern.test(line)) {
      const afterNullCheck = line.replace(nullCheckPattern, '');

      // Determine if this is a one-liner or block
      if (afterNullCheck.trim().startsWith('return')) {
        // One-liner: if (!x) return ...;
        insertLine = i + 1;
      } else if (afterNullCheck.includes('{')) {
        // Block opening: if (!x) {
        let braceDepth = 1;
        for (let j = i + 1; j < lines.length; j++) {
          const opens = (lines[j].match(/{/g) || []).length;
          const closes = (lines[j].match(/}/g) || []).length;
          braceDepth += opens - closes;
          if (braceDepth <= 0) {
            insertLine = j + 1;
            break;
          }
        }
      }
      break;
    }
  }

  if (insertLine === -1) {
    console.warn(`  ⚠  Could not find null check for ${varName} in ${trimmed}`);
    warnCount++;
    continue;
  }

  // Determine indent
  const indentMatch = lines[insertLine - 1].match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '  ';

  // Add import for guardSuspension if not already there
  let result = original;
  if (!hasImport) {
    // Add to existing named import from @api/server or the direct path
    const importRegex =
      /(import\s*\{)([^}]*?)(\}\s*from\s*['"](@\/api\/server|@api\/server)['"]\s*)/;
    const importMatch = result.match(importRegex);
    if (importMatch) {
      const existingBody = importMatch[2];
      const trailing = existingBody.endsWith('\n') ? '' : '\n  ';
      result = result.replace(importRegex, `$1${existingBody}${trailing}guardSuspension,$3`);
    }
  }

  // Build the guard line
  const guardLine = `${indent}const guard = guardSuspension(${varName});\n${indent}if (guard) return guard;`;

  // Insert
  const resultLines = result.split('\n');
  resultLines.splice(insertLine, 0, guardLine);
  result = resultLines.join('\n');

  writeFileSync(trimmed, result);
  console.log(`  ✓ ${trimmed.replace('src/app/api/', '')}`);
  modifiedCount++;
}

console.log(
  `\nDone. Modified: ${modifiedCount}, Skipped (already guarded): ${skipCount}, Warnings: ${warnCount}`
);
