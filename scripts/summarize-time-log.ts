import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'docs', 'TIME_LOG.csv');
const OUT_PATH = path.join(ROOT, 'docs', 'reports', 'TIME_SUMMARY.md');

type Bucket = 'advisory' | 'execution' | 'review' | 'research' | 'discussion';

interface Row {
  date: string;
  bd_id: string;
  bucket: Bucket;
  person: string;
  agent_tool: string;
  duration_minutes: number;
  description: string;
  gsd_phase: string;
}

function parseCSV(content: string): Row[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length < 8) continue;
    if (values[0].startsWith('#')) continue;

    rows.push({
      date: values[0],
      bd_id: values[1],
      bucket: values[2] as Bucket,
      person: values[3],
      agent_tool: values[4],
      duration_minutes: parseInt(values[5], 10) || 0,
      description: values[6],
      gsd_phase: values[7],
    });
  }

  return rows;
}

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  return start.toISOString().slice(0, 10);
}

function humanize(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function main() {
  let rows: Row[];

  try {
    const raw = fs.readFileSync(CSV_PATH, 'utf-8');
    rows = parseCSV(raw);
  } catch {
    rows = [];
  }

  const generated = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let md = `# TIME_SUMMARY\n\n`;
  md += `**Generated:** ${generated}\n`;
  md += `**Source:** \`docs/TIME_LOG.csv\`\n\n`;

  if (rows.length === 0) {
    md += `*No entries in TIME_LOG.csv.*\n`;
    fs.writeFileSync(OUT_PATH, md);
    return;
  }

  const total = rows.reduce((sum, r) => sum + (r.person !== 'agent' ? r.duration_minutes : 0), 0);

  md += `## Totals\n\n`;
  md += `| Metric | Value |\n`;
  md += `| ------ | ----- |\n`;
  md += `| Total human time | ${humanize(total)} |\n`;
  md += `| Sessions logged | ${rows.length} |\n`;
  md += '\n';

  const byBucket: Record<string, number> = {};
  for (const r of rows) {
    if (r.person === 'agent') continue;
    byBucket[r.bucket] = (byBucket[r.bucket] || 0) + r.duration_minutes;
  }

  md += `## By Bucket\n\n`;
  md += `| Bucket | Time | Share |\n`;
  md += `| ------ | ---- | ----- |\n`;
  const buckets: Bucket[] = ['advisory', 'execution', 'review', 'research', 'discussion'];
  for (const b of buckets) {
    const mins = byBucket[b] || 0;
    const pct = total > 0 ? ((mins / total) * 100).toFixed(1) : '0.0';
    md += `| ${b} | ${humanize(mins)} | ${pct}% |\n`;
  }

  md += `\n## By BD Issue\n\n`;
  md += `| BD ID | Time | Buckets |\n`;
  md += `| ----- | ---- | ------- |\n`;
  const byBdId: Record<string, { total: number; buckets: Set<string> }> = {};
  for (const r of rows) {
    if (r.person === 'agent') continue;
    const entry = (byBdId[r.bd_id] ??= { total: 0, buckets: new Set() });
    entry.total += r.duration_minutes;
    entry.buckets.add(r.bucket);
  }
  for (const [id, data] of Object.entries(byBdId).sort()) {
    md += `| ${id} | ${humanize(data.total)} | ${[...data.buckets].join(', ')} |\n`;
  }

  md += `\n## By Week\n\n`;
  md += `| Week Starting | Time |\n`;
  md += `| ------------- | ---- |\n`;
  const byWeek: Record<string, number> = {};
  for (const r of rows) {
    if (r.person === 'agent') continue;
    const w = getWeekLabel(r.date);
    byWeek[w] = (byWeek[w] || 0) + r.duration_minutes;
  }
  for (const [week, mins] of Object.entries(byWeek).sort()) {
    md += `| ${week} | ${humanize(mins)} |\n`;
  }

  const gsdPhases = rows.filter(r => r.gsd_phase).map(r => r.gsd_phase);
  if (gsdPhases.length > 0) {
    md += `\n## By GSD Phase\n\n`;
    md += `| Phase | Time |\n`;
    md += `| ----- | ---- |\n`;
    const byPhase: Record<string, number> = {};
    for (const r of rows) {
      if (r.person === 'agent' || !r.gsd_phase) continue;
      byPhase[r.gsd_phase] = (byPhase[r.gsd_phase] || 0) + r.duration_minutes;
    }
    for (const [phase, mins] of Object.entries(byPhase).sort()) {
      md += `| ${phase} | ${humanize(mins)} |\n`;
    }
  }

  md += `\n*Agent execution rows (person=agent, duration=0) are excluded from totals. Execution cost is reconciled per-harness. See advisory for details.*\n`;

  fs.writeFileSync(OUT_PATH, md);
}

main();
