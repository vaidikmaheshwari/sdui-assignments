#!/usr/bin/env node
/**
 * Reads bench/results-p7.json and prints median/p90 per metric for one variant, and — when the
 * variant isn't the baseline — the before/after delta against `baseline` (docs/PROMPTS.md P7:
 * "give me a before/after median for each").
 *
 * Deltas are reported for every metric including the ones that got worse. A metric that is N/A
 * for one side prints N/A rather than being dropped, so a regression can't hide behind a
 * missing marker.
 *
 * Usage: scripts/p7-report.js <variant> [baseline-variant]
 *        scripts/p7-report.js --all
 */
const fs = require('node:fs');
const path = require('node:path');

const RESULTS = path.join(__dirname, '..', 'bench', 'results-p7.json');
const METRICS = [
  'appStart',
  'payloadReceived',
  'parseEnd',
  'validateEnd',
  'firstPaint',
  'interactive',
  'fullRender',
  'swapEnd',
  'aboveFoldImagesLoaded',
];

function pct(values, p) {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(rank, sorted.length - 1))];
}

function load() {
  if (!fs.existsSync(RESULTS)) {
    console.error(`no results at ${RESULTS}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
}

function statsFor(runs, metric) {
  const values = runs.map((r) => r.markersMs?.[metric]).filter((v) => typeof v === 'number');
  return { median: pct(values, 50), p90: pct(values, 90), n: values.length };
}

function derived(runs) {
  // parseEnd - payloadReceived is decode cost (item 6); validateEnd - parseEnd is Zod.
  const decode = [];
  const zod = [];
  for (const r of runs) {
    const m = r.markersMs || {};
    if (typeof m.parseEnd === 'number' && typeof m.payloadReceived === 'number') {
      decode.push(m.parseEnd - m.payloadReceived);
    }
    if (typeof m.validateEnd === 'number' && typeof m.parseEnd === 'number') {
      zod.push(m.validateEnd - m.parseEnd);
    }
  }
  return {
    'decode (parseEnd−payloadReceived)': { median: pct(decode, 50), p90: pct(decode, 90), n: decode.length },
    'zod (validateEnd−parseEnd)': { median: pct(zod, 50), p90: pct(zod, 90), n: zod.length },
  };
}

function report(variant, baselineLabel) {
  const all = load();
  const runs = all.filter((r) => r.variant === variant);
  if (runs.length === 0) {
    console.error(`no runs recorded for variant "${variant}"`);
    process.exit(1);
  }
  const base = baselineLabel ? all.filter((r) => r.variant === baselineLabel) : [];

  console.log(`=== ${variant} (n=${runs.length})${base.length ? ` vs ${baselineLabel} (n=${base.length})` : ''} ===`);

  const rows = [];
  for (const metric of METRICS) {
    rows.push([metric, statsFor(runs, metric), base.length ? statsFor(base, metric) : null]);
  }
  const d = derived(runs);
  const db = base.length ? derived(base) : {};
  for (const key of Object.keys(d)) rows.push([key, d[key], db[key] ?? null]);

  for (const [name, cur, before] of rows) {
    if (cur.median === null) {
      console.log(`${name.padEnd(36)} N/A`);
      continue;
    }
    let line = `${name.padEnd(36)} median=${String(cur.median).padStart(5)}ms p90=${String(cur.p90).padStart(5)}ms`;
    if (before && before.median !== null) {
      const delta = cur.median - before.median;
      const pctChange = before.median === 0 ? 0 : (delta / before.median) * 100;
      const sign = delta > 0 ? '+' : '';
      const verdict = delta > 0 ? 'WORSE' : delta < 0 ? 'better' : 'same';
      line += `   (was ${before.median}ms → ${sign}${delta}ms, ${sign}${pctChange.toFixed(1)}% ${verdict})`;
    } else if (before) {
      line += `   (baseline: N/A)`;
    }
    console.log(line);
  }

  const ttr = runs.map((r) => r.ttrTotalTimeMs).filter((v) => typeof v === 'number');
  if (ttr.length) {
    let line = `${'TTR (am start -W TotalTime)'.padEnd(36)} median=${String(pct(ttr, 50)).padStart(5)}ms p90=${String(pct(ttr, 90)).padStart(5)}ms`;
    const bttr = base.map((r) => r.ttrTotalTimeMs).filter((v) => typeof v === 'number');
    if (bttr.length) {
      const delta = pct(ttr, 50) - pct(bttr, 50);
      line += `   (was ${pct(bttr, 50)}ms → ${delta > 0 ? '+' : ''}${delta}ms)`;
    }
    console.log(line);
  }

  const bytes = runs.map((r) => r.wireBytes).filter((v) => typeof v === 'number');
  if (bytes.length) console.log(`${'wire bytes'.padEnd(36)} ${bytes[0]}`);

  const fellBack = runs.filter((r) => r.opt4FellBackToJsThread).length;
  if (fellBack > 0) {
    console.log(`\n[warn] ${fellBack}/${runs.length} runs fell back to a JS-thread JSON.parse.`);
  }

  const fps = runs.map((r) => r.jank && r.jank.fpsAverage).filter((v) => typeof v === 'number');
  if (fps.length) console.log(`${'flashlight fpsAverage'.padEnd(36)} median=${pct(fps, 50).toFixed(2)} p90=${pct(fps, 90).toFixed(2)}`);
}

const args = process.argv.slice(2);
if (args[0] === '--all') {
  const variants = [...new Set(load().map((r) => r.variant))];
  for (const v of variants) {
    report(v, v === 'baseline' ? undefined : 'baseline');
    console.log('');
  }
} else {
  report(args[0], args[1] ?? (args[0] === 'baseline' ? undefined : 'baseline'));
}
