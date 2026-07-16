import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const emitterPath = new URL('../src/shared/api/events/emitter.ts', import.meta.url).pathname;
const source = readFileSync(emitterPath, 'utf-8');

const eventTypes: string[] = [];
for (const line of source.split('\n')) {
  const m = line.match(/\| \{ type: '([^']+)'/);
  if (m) eventTypes.push(m[1]);
}

let exitCode = 0;
const srcDir = new URL('../src/', import.meta.url).pathname;

const isEmitterFile = (f: string) => f.includes('emitter.ts');

for (const type of eventTypes) {
  const emitCmd = `rg -l "emitEvent\\('${type}'" ${srcDir} 2>/dev/null || true`;
  const onCmd = `rg -l "onEvent\\('${type}'" ${srcDir} 2>/dev/null || true`;
  const emitMatches = execSync(emitCmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  const onMatches = execSync(onCmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);

  const realEmitters = emitMatches.filter(f => !isEmitterFile(f));
  const realHandlers = onMatches.filter(f => !isEmitterFile(f));

  const ec = realEmitters.length;
  const hc = realHandlers.length;
  const status = ec > 0 && hc > 0 ? 'OK' : 'ISSUE';
  const marker = status === 'OK' ? '✓' : '⚠';

  console.log(` ${marker} ${type}  emitters=${ec}  handlers=${hc}  ${status}`);

  if (ec === 0) {
    console.log(`     No emitEvent('${type}') call site found`);
    exitCode = 1;
  }
  if (hc === 0) {
    console.log(`     No onEvent('${type}') listener found`);
    exitCode = 1;
  }
  if (ec > 0 && hc > 0) {
    for (const f of realEmitters) console.log(`     emit → ${f.replace(srcDir, 'src/')}`);
    for (const f of realHandlers) console.log(`     on   → ${f.replace(srcDir, 'src/')}`);
  }
}

process.exit(exitCode);
