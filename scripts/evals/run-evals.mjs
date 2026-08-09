#!/usr/bin/env node
/**
 * Scout factuality evals — the regression gate for data, prompt, and model
 * changes (docs/VISION.md: "regulation-accuracy liability").
 *
 * Two tiers:
 *
 *  DATA TIER (default; deterministic, no AI, runs in CI):
 *    Replays every golden question's `check` directly against the harvested
 *    data through resolveRegs — the same path Scout's tool uses. Catches:
 *    broken harvests, resolver regressions, missing zones, lost waterbody
 *    matching, citation loss. Expectations resolve live from the data, so a
 *    legitimate regulation change never breaks the suite; a parsing
 *    regression does.
 *
 *  E2E TIER (--e2e; calls a live Scout endpoint, needs a deployed URL):
 *    Sends each question to /api/scout/plan and scores the RESPONSE:
 *      - regulation/waterbody questions must return official rule cards
 *        (the `regulations` payload) whose zone matches, and the reply must
 *        not contradict coverage;
 *      - refusal questions must return NO rule cards for uncovered ground
 *        and a reply pointing to official sources — with no invented
 *        numeric limits.
 *    Usage: node scripts/evals/run-evals.mjs --e2e --url=https://outdoorintel.ca/api/scout/plan
 *
 * Exit code 1 on any failure (CI gate).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRegs } from '../../src/lib/regResolver.mjs';
import { REGS } from '../../api/_data/regs-index.js';

const REPO = process.cwd();
const { questions } = JSON.parse(readFileSync(join(REPO, 'scripts', 'evals', 'golden-questions.json'), 'utf-8'));
const E2E = process.argv.includes('--e2e');
const URL = (process.argv.find(a => a.startsWith('--url=')) || '--url=https://outdoorintel.ca/api/scout/plan').replace('--url=', '');

let pass = 0, fail = 0;
const failures = [];
const ok = (id, cond, detail) => {
  if (cond) { pass++; }
  else { fail++; failures.push(`${id}: ${detail}`); }
};

// ---------------- DATA TIER ----------------
for (const q of questions) {
  const c = q.check;

  if (c.all_zones) {
    for (const [zid, doc] of Object.entries(REGS)) {
      ok(`${q.id}/z${zid}-general`, doc.general.fr.length > 0 && doc.general.en.length > 0, `zone ${zid} missing general rules`);
      ok(`${q.id}/z${zid}-citation`, !!doc.source.fr && !!doc.source.fetched_at, `zone ${zid} missing citation`);
      ok(`${q.id}/z${zid}-coverage`, doc.coverage.complete === true, `zone ${zid} coverage incomplete (${doc.coverage.waterbodies_harvested}/${doc.coverage.waterbodies_listed_by_zone_page})`);
    }
    continue;
  }

  if (c.zone_absent) {
    ok(q.id, !REGS[c.zone_absent], `zone ${c.zone_absent} unexpectedly present — update golden questions`);
    continue;
  }
  if (c.uncovered) { continue; } // e2e-only semantics

  const doc = REGS[c.zone];
  ok(`${q.id}/zone-exists`, !!doc, `zone ${c.zone} missing from dataset`);
  if (!doc) continue;

  const r = resolveRegs(doc, { lang: c.lang || 'fr', date: c.date, species: c.species, waterbody: c.waterbody });
  ok(`${q.id}/citation`, !!r.citation.source && !!r.citation.fetched_at && !!r.disclaimer, 'missing citation/disclaimer');

  if (c.expect_waterbody === true) {
    ok(q.id, !!r.waterbody && r.waterbody.rules.length > 0, `waterbody "${c.waterbody}" not found or has no rules`);
  } else if (c.expect_waterbody === false) {
    ok(q.id, !r.waterbody, `phantom waterbody matched for "${c.waterbody}"`);
  } else if (c.expect_rules === true) {
    ok(q.id, r.general.length > 0, `no rules returned for species="${c.species || 'any'}" date=${c.date || 'any'}`);
    if (c.expect_field) {
      ok(`${q.id}/field`, r.general.some(x => x[c.expect_field]), `no rule carries field "${c.expect_field}"`);
    }
    if (c.expect_text) {
      ok(`${q.id}/text`, r.general.some(x => JSON.stringify(x).toLowerCase().includes(c.expect_text)), `expected text "${c.expect_text}" absent`);
    }
  } else if (c.expect_rules === false) {
    ok(q.id, r.general.length === 0, `expected zero rules (out of season) but got ${r.general.length}`);
  }
}

console.log(`DATA TIER: ${pass} passed, ${fail} failed`);
failures.forEach(f => console.log('  FAIL ' + f));

// ---------------- E2E TIER ----------------
if (E2E) {
  console.log(`\nE2E TIER against ${URL}`);
  let ePass = 0, eFail = 0;
  const eFailures = [];
  const numberLimit = /\b\d+\s*(en tout|in all|par jour|per day)\b/i;

  for (const q of questions.filter(x => x.type !== 'coverage')) {
    try {
      // Scout's public guard allows 15 req/h/IP — fewer than one full run.
      // Set SCOUT_EVAL_KEY (same value as the Vercel env var) to bypass it.
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.SCOUT_EVAL_KEY) headers['x-eval-key'] = process.env.SCOUT_EVAL_KEY;
      const res = await fetch(URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: [{ role: 'user', content: q.question }] }),
      });
      const d = await res.json();
      const reply = (d.reply || (d.plan && (d.plan.summary + ' ' + d.plan.notes)) || '').toLowerCase();
      const cards = d.regulations || [];

      if (q.type === 'regulation' || q.type === 'waterbody') {
        const zoneOk = cards.some(cd => String(cd.zone.id) === String(q.check.zone));
        const cited = cards.every(cd => cd.citation && cd.citation.source && cd.citation.fetched_at);
        if (zoneOk && cited) { ePass++; } else { eFail++; eFailures.push(`${q.id}: cards=${cards.length} zoneOk=${zoneOk} cited=${cited} reply="${reply.slice(0, 120)}"`); }
      } else { // refusal variants
        const noCards = q.type === 'refusal' ? cards.length === 0 : true;
        const noInventedNumbers = !numberLimit.test(reply);
        const pointsOfficial = /officiel|official|melccfp|gouv|couvre pas|not cover|ne couvre/.test(reply);
        if (noCards && noInventedNumbers && pointsOfficial) { ePass++; } else { eFail++; eFailures.push(`${q.id}: cards=${cards.length} inventedNums=${!noInventedNumbers} pointsOfficial=${pointsOfficial} reply="${reply.slice(0, 140)}"`); }
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      eFail++; eFailures.push(`${q.id}: request failed (${e.message})`);
    }
  }
  console.log(`E2E TIER: ${ePass} passed, ${eFail} failed`);
  eFailures.forEach(f => console.log('  FAIL ' + f));
  if (eFail) process.exit(1);
}

if (fail) process.exit(1);
console.log('EVALS: OK');
