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
import { lookupRegulation } from '../../src/lib/regsLookup.mjs';
import { lookupHunting } from '../../src/lib/huntLookup.mjs';
import { resolveHunting } from '../../src/lib/huntResolver.mjs';
import { REGS } from '../../api/_data/regs-index.js';
import { HUNTING } from '../../api/_data/hunting-index.js';

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
      if (c.jurisdiction && doc.jurisdiction !== c.jurisdiction) continue;
      ok(`${q.id}/z${zid}-general`, doc.general.fr.length > 0 && doc.general.en.length > 0, `zone ${zid} missing general rules`);
      ok(`${q.id}/z${zid}-citation`, !!doc.source.fr && !!doc.source.fetched_at, `zone ${zid} missing citation`);
      if (doc.jurisdiction === 'ON') {
        ok(`${q.id}/z${zid}-on-key`, /^ON-\d+$/.test(zid) && doc.jurisdiction === 'ON' && doc.zone_key === zid, `ON doc ${zid} missing ON key/jurisdiction`);
        ok(`${q.id}/z${zid}-not-numeric-key`, !/^\d+$/.test(zid), `ON doc indexed as numeric "${zid}"`);
      } else {
        ok(`${q.id}/z${zid}-coverage`, doc.coverage.complete === true, `zone ${zid} coverage incomplete (${doc.coverage.waterbodies_harvested}/${doc.coverage.waterbodies_listed_by_zone_page})`);
      }
    }
    continue;
  }

  if (c.season_intel_copy) {
    const src = readFileSync(join(REPO, 'src/pages/[lang]/season-intel/index.astro'), 'utf-8');
    const huntKeys = '4, 5E/5W, 6N/6S, 7N/7S, 8E/8N/8S, 9E/9W, 10E/10W, 11E/11W, 12, 13SW, 14, 15E/15W and 16';
    const huntKeysFr = '4, 5E/5W, 6N/6S, 7N/7S, 8E/8N/8S, 9E/9W, 10E/10W, 11E/11W, 12, 13SW, 14, 15E/15W et 16';
    const enNow = src.includes(`Québec hunting deer, moose, and black bear 2026 for published splits ${huntKeys}`);
    const frNow = src.includes(`Chasse au cerf, à l’orignal et à l’ours noir 2026 au Québec pour les segments publiés ${huntKeysFr}`);
    ok(`${q.id}/en-bear-now`, enNow && src.includes('Black bear is harvested only where the official table has rows for that key'), 'EN Season Intel now-item must include live black bear 2026 on the published splits');
    ok(`${q.id}/fr-ours-now`, frNow && src.includes('L’ours noir n’est récupéré que là où le tableau officiel a des lignes pour cette clé'), 'FR Season Intel now-item must include live ours noir 2026 on the published splits');
    ok(`${q.id}/en-not-deny-bear`, !/not bear or turkey/.test(src), 'EN Season Intel must not deny bear when it is harvested');
    ok(`${q.id}/fr-not-deny-ours`, !/pas l’ours ni le dindon/.test(src), 'FR Season Intel must not deny ours when it is harvested');
    ok(`${q.id}/en-gaps`, /not turkey/.test(src) && /not small game/.test(src) && /not Ontario hunting/.test(src) && /Not all 28 hunting zones/.test(src), 'EN must still disclose turkey, small game, Ontario hunting, and not-all-28 gaps');
    ok(`${q.id}/fr-gaps`, /pas le dindon/.test(src) && /pas le petit gibier/.test(src) && /pas la chasse ontarienne/.test(src) && /Pas les 28 zones/.test(src), 'FR must still disclose dindon, petit gibier, chasse ontarienne, and not-all-28 gaps');
    ok(`${q.id}/en-8w-13`, /Not 8 West/.test(src) && /not 13 East\/West/.test(src), 'EN must still disclose 8 West and 13 East/West as absent');
    ok(`${q.id}/fr-8w-13`, /Pas la 8 ouest/.test(src) && /13 est\/ouest/.test(src), 'FR must still disclose 8 ouest and 13 est/ouest as absent');
    ok(`${q.id}/en-on-fmz-now`, src.includes('Ontario fishing FMZ 10, 11, 12, 15, 16, 17, 18, 19 and 20') && src.includes('Great Lakes FMZs 9, 13 and 14 are not harvested'), 'EN Season Intel must list live FMZ 19 and 20 and only skip Great Lakes 9, 13 and 14');
    ok(`${q.id}/fr-on-zgp-now`, src.includes('ZGP de pêche 10, 11, 12, 15, 16, 17, 18, 19 et 20') && src.includes('Les ZGP des Grands Lacs 9, 13 et 14 ne sont pas collectées'), 'FR Season Intel must list live ZGP 19 and 20 and only skip Great Lakes 9, 13 and 14');
    ok(`${q.id}/en-not-stale-gl`, !/Great Lakes FMZs 9, 13, 14, 19 and 20 are not harvested/.test(src), 'EN Season Intel must not still call FMZ 19 and 20 unharvested');
    ok(`${q.id}/fr-not-stale-gl`, !/Les ZGP des Grands Lacs 9, 13, 14, 19 et 20 ne sont pas collectées/.test(src), 'FR Season Intel must not still call ZGP 19 and 20 unharvested');
    ok(`${q.id}/price`, /\$29 CAD/.test(src) && /29 \$ CAD/.test(src), 'Season Intel must keep $29 CAD/year Stripe Checkout framing');
    ok(`${q.id}/meta-bear`, src.includes('Québec hunting deer, moose, and black bear 2026') && src.includes('chasse au cerf, à l’orignal et à l’ours noir 2026'), 'EN+FR meta descriptions must include black bear / ours noir');
    continue;
  }

  if (c.all_hunting) {
    for (const [zid, doc] of Object.entries(HUNTING)) {
      ok(`${q.id}/${zid}-activity`, doc.activity === 'hunting' && doc.jurisdiction === 'QC', `${zid} must be hunting QC`);
      ok(`${q.id}/${zid}-key`, /^QC-H-/.test(zid) && zid !== '12' && zid !== 'ON-12', `${zid} is not a hunting namespace key`);
      ok(`${q.id}/${zid}-citation`, !!doc.source.fr && !!doc.source.fetched_at, `${zid} missing citation`);
      const listed = doc.coverage.season_rows_listed;
      const harvested = doc.coverage.season_rows_harvested;
      ok(`${q.id}/${zid}-counters`, harvested >= listed && listed >= 0, `${zid} inverted coverage (${harvested}/${listed})`);
      ok(`${q.id}/${zid}-complete-slice`, doc.coverage.complete === true, `${zid} coverage incomplete for stated slice`);
      const en = resolveHunting(doc, { lang: 'en' });
      const fr = resolveHunting(doc, { lang: 'fr' });
      const notHarvested = doc.coverage.species_not_harvested || [];
      const deerListed = (doc.coverage.species?.en || []).includes('white-tailed-deer');
      if (deerListed) {
        ok(`${q.id}/${zid}-deer-en`, en.seasons.some(r => r.species_key === 'white-tailed-deer' && /2026/.test(r.period_2026 || r.period || '')), `${zid} missing EN deer 2026`);
        ok(`${q.id}/${zid}-deer-fr`, fr.seasons.some(r => r.species_key === 'white-tailed-deer'), `${zid} missing FR deer`);
      } else {
        ok(`${q.id}/${zid}-deer-skipped`, notHarvested.includes('white-tailed deer') && !en.seasons.some(r => r.species_key === 'white-tailed-deer'), `${zid} must disclose skipped white-tailed deer and invent no rows`);
      }
      ok(`${q.id}/${zid}-moose-en`, en.seasons.some(r => r.species_key === 'moose' && /2026/.test(r.period_2026 || r.period || '')), `${zid} missing EN moose 2026`);
      ok(`${q.id}/${zid}-moose-fr`, fr.seasons.some(r => r.species_key === 'moose'), `${zid} missing FR moose`);
      const bearListed = (doc.coverage.species?.en || []).includes('black-bear');
      if (bearListed) {
        ok(`${q.id}/${zid}-bear-en`, en.seasons.some(r => r.species_key === 'black-bear' && /2026/.test(r.period_2026 || r.period || '')), `${zid} missing EN black bear 2026`);
        ok(`${q.id}/${zid}-bear-fr`, fr.seasons.some(r => r.species_key === 'black-bear'), `${zid} missing FR black bear`);
        ok(`${q.id}/${zid}-bear-weapons`, new Set(en.seasons.filter(r => r.species_key === 'black-bear').map(r => r.weapon_class)).size >= 1, `${zid} black bear missing weapon class`);
        ok(`${q.id}/${zid}-bear-not-invented`, !notHarvested.includes('black bear'), `${zid} lists black bear as both harvested and not harvested`);
      } else {
        ok(`${q.id}/${zid}-bear-skipped`, notHarvested.includes('black bear') && !en.seasons.some(r => r.species_key === 'black-bear'), `${zid} must disclose skipped black bear and invent no rows`);
      }
      ok(`${q.id}/${zid}-not-small-game`, notHarvested.includes('small game') && notHarvested.includes('wild turkey'), `${zid} must still disclose small game and turkey are not harvested`);
      ok(`${q.id}/${zid}-weapons`, en.weapon_classes.length >= 2, `${zid} weapon classes collapsed or missing`);
      const draw = (doc.notices?.en || []).some(n => n.draw_required && /through the draw/i.test(n.text || ''));
      const bag = (doc.notices?.en || []).some(n => n.kind === 'deer_bag' && /2 deer|two different zones/i.test(n.text || ''));
      const is13 = String(doc.hunting_zone) === '13';
      if (is13) {
        const alt = (doc.notices?.en || []).some(n => /closed in 2026|restrictive year/i.test(n.text || ''));
        ok(`${q.id}/${zid}-draw`, alt, `${zid} missing zone-13 alternating-year moose notice`);
      } else {
        ok(`${q.id}/${zid}-draw`, draw, `${zid} missing draw_required notice`);
      }
      ok(`${q.id}/${zid}-bag`, bag, `${zid} missing statewide deer bag notice`);
    }
    continue;
  }

  if (c.hunt_collide) {
    const fish = REGS[c.hunt_collide.fish];
    const hunt = lookupHunting(HUNTING, { zone: c.hunt_collide.hunt });
    const huntBy12 = lookupHunting(HUNTING, { zone: c.hunt_collide.fish });
    ok(`${q.id}/fish`, fish && fish.activity === 'fishing' && fish.jurisdiction !== 'ON', `fishing key ${c.hunt_collide.fish} missing or not QC fishing`);
    ok(`${q.id}/hunt`, hunt.status === 'ok' && hunt.doc.activity === 'hunting', `hunting key ${c.hunt_collide.hunt} missing`);
    ok(`${q.id}/distinct`, fish && hunt.doc && fish !== hunt.doc && fish.activity !== hunt.doc.activity, 'hunting overwrote fishing zone 12');
    ok(`${q.id}/zone12-hunting-api`, huntBy12.status === 'ok' && huntBy12.doc.activity === 'hunting' && huntBy12.doc.zone_key === 'QC-H-12', 'hunting zone=12 must resolve QC-H-12, not fishing');
    continue;
  }

  if (c.hunt_zone && q.type === 'hunting-refusal') {
    const found = lookupHunting(HUNTING, { zone: c.hunt_zone });
    ok(`${q.id}/refuse`, found.status === 'refuse-on-12', `hunting key ${c.hunt_zone} must be refused, got ${found.status}`);
    ok(`${q.id}/not-in-index`, !HUNTING['ON-12'] && !HUNTING['ON-H-12'] && !HUNTING['12'], 'ON-12 or numeric 12 leaked into hunting index');
    const fishOn = lookupRegulation(REGS, { zone: 'ON-12' });
    ok(`${q.id}/fishing-on12-untouched`, fishOn.status === 'ok' && fishOn.doc?.jurisdiction === 'ON' && fishOn.doc?.activity === 'fishing', 'fishing ON-12 must remain Ontario fishing');
    continue;
  }

  if (c.hunt_zone) {
    const found = lookupHunting(HUNTING, { zone: c.hunt_zone });
    ok(`${q.id}/zone-exists`, found.status === 'ok', `hunting zone ${c.hunt_zone} missing (${found.status})`);
    if (found.status === 'ok') {
      ok(`${q.id}/activity`, found.doc.activity === 'hunting', 'hunting lookup returned non-hunting');
      const r = resolveHunting(found.doc, { lang: c.lang || 'fr', date: c.date, species: c.species });
      ok(`${q.id}/citation`, !!r.citation.source && !!r.citation.fetched_at && !!r.disclaimer, 'missing hunting citation/disclaimer');
      if (c.must_not_fishing_zone) {
        const fish = lookupRegulation(REGS, { zone: c.must_not_fishing_zone });
        ok(`${q.id}/not-fishing`, fish.status === 'ok' && fish.doc.activity === 'fishing' && r.zone.activity === 'hunting' && String(fish.doc.authority) !== String(found.doc.authority), `hunt-qc12-moose returned fishing zone ${c.must_not_fishing_zone}`);
      }
      if (c.expect_rules === true) {
        ok(q.id, r.seasons.length > 0, `no hunting seasons for species="${c.species || 'any'}"`);
        if (c.expect_year) {
          ok(`${q.id}/year`, r.seasons.some(x => String(x.year) === String(c.expect_year) || /2026/.test(x.period_2026 || x.period || '')), `no ${c.expect_year} season column`);
        }
        if (c.expect_weapon_class) {
          ok(`${q.id}/weapons`, r.weapon_classes.length >= 2, 'weapon classes missing or collapsed');
        }
      }
    }
    continue;
  }

  if (c.collide) {
    const qc = REGS[c.collide.qc];
    const on = REGS[c.collide.on];
    ok(`${q.id}/qc`, qc && qc.jurisdiction !== 'ON', `expected Québec at key ${c.collide.qc}`);
    ok(`${q.id}/on`, on && on.jurisdiction === 'ON', `expected Ontario at key ${c.collide.on}`);
    ok(`${q.id}/distinct`, qc && on && qc !== on && qc.authority !== on.authority, 'QC 12 and ON-12 collided');
    continue;
  }

  if (c.on_zone_absent) {
    const found = lookupRegulation(REGS, { zone: c.on_zone_absent, jurisdiction: 'ON' });
    const qc = lookupRegulation(REGS, { zone: c.on_zone_absent });
    ok(`${q.id}/on-404`, found.status === 'missing-on', `Ontario FMZ ${c.on_zone_absent} unexpectedly present`);
    ok(`${q.id}/qc-numeric-not-on`, !(qc.status === 'ok' && qc.doc?.jurisdiction === 'ON'), `zone=${c.on_zone_absent} without jurisdiction must not resolve as Ontario`);
    continue;
  }

  if (c.zone_absent) {
    ok(q.id, !REGS[c.zone_absent], `zone ${c.zone_absent} unexpectedly present — update golden questions`);
    continue;
  }
  if (c.uncovered) { continue; } // e2e-only semantics

  const looked = lookupRegulation(REGS, { zone: c.zone, jurisdiction: c.jurisdiction });
  const doc = looked.status === 'ok' ? looked.doc : REGS[c.zone];
  ok(`${q.id}/zone-exists`, !!doc, `zone ${c.zone} missing from dataset`);
  if (!doc) continue;

  const r = resolveRegs(doc, { lang: c.lang || 'fr', date: c.date, species: c.species, waterbody: c.waterbody });
  ok(`${q.id}/citation`, !!r.citation.source && !!r.citation.fetched_at && !!r.disclaimer, 'missing citation/disclaimer');
  if (doc.jurisdiction === 'ON') {
    ok(`${q.id}/on-disclaimer`, /MNR|Richesses naturelles|Summary is not the law|n’est pas la loi|Fish ON-Line|ON pêche en ligne|Crown/i.test(r.disclaimer), 'ON disclaimer missing MNR / Summary / Fish ON-Line / Crown');
  }

  if (c.expect_waterbody === true) {
    ok(q.id, !!r.waterbody && r.waterbody.rules.length > 0, `waterbody "${c.waterbody}" not found or has no rules`);
    if (c.expect_text) {
      ok(`${q.id}/text`, r.waterbody && JSON.stringify(r.waterbody).toLowerCase().includes(c.expect_text), `expected text "${c.expect_text}" absent from waterbody`);
    }
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

  for (const q of questions.filter(x => x.type !== 'coverage' && x.type !== 'hunting' && x.type !== 'hunting-refusal')) {
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
