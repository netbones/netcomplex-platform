/**
 * Script to add missing `createComponentLogger` to @shared/lib mocks.
 * Run: npx tsx scripts/fix-test-mocks.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function findTestFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
        results.push(...findTestFiles(full));
      }
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const FILES = findTestFiles(join(scriptDir, '..', 'src'));
const INSERT = '  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),\n';

let fixed = 0;

for (const file of FILES) {
  let content = readFileSync(file, 'utf-8');
  if (!content.includes("vi.mock('@shared/lib'") && !content.includes('vi.mock("@shared/lib"')) continue;
  if (content.includes('createComponentLogger')) continue;

  // Pattern: vi.mock('@shared/lib', () => ({ ... }))
  const m = content.match(/vi\.mock\(['"]@shared\/lib['"],\s*(?:async\s*)?\([^)]*\)\s*=>\s*\(?\s*\{/);
  if (m) {
    const start = m.index! + m[0].length;
    let depth = 1, end = start;
    while (depth > 0 && end < content.length) {
      if (content[end] === '{') depth++;
      else if (content[end] === '}') depth--;
      end++;
    }
    const before = content.slice(0, end - 1).replace(/,?\s*$/, '');
    const after = content.slice(end - 1);
    content = before + ',\n' + INSERT + after;
    writeFileSync(file, content, 'utf-8');
    fixed++;
    console.log(`✓ ${relative(scriptDir, file)}`);
    continue;
  }

  // Pattern: vi.mock('@shared/lib', async importOriginal => { return { ... } })
  const m2 = content.match(/vi\.mock\(['"]@shared\/lib['"],\s*async\s+\([^)]*\)\s*=>\s*\{/);
  if (m2) {
    const afterStart = m2.index! + m2[0].length;
    const returnMatch = content.slice(afterStart).match(/\s+return\s+\{/);
    if (returnMatch) {
      const retStart = afterStart + returnMatch.index! + returnMatch[0].length;
      let depth = 1, end = retStart;
      while (depth > 0 && end < content.length) {
        if (content[end] === '{') depth++;
        else if (content[end] === '}') depth--;
        end++;
      }
      const before = content.slice(0, end - 1).replace(/,?\s*$/, '');
      const after = content.slice(end - 1);
      content = before + ',\n    ' + INSERT.trimEnd() + '\n' + after;
      writeFileSync(file, content, 'utf-8');
      fixed++;
      console.log(`✓ ${relative(scriptDir, file)}`);
    }
  }
}

console.log(`\nFixed ${fixed} files`);
