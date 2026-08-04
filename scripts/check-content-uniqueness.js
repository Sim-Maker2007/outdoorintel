#!/usr/bin/env node
/**
 * check-content-uniqueness.js
 *
 * Duplication check for spot content. Rule: no sentence of 8+ words may
 * appear on more than MAX_PAGES (2) spot pages.
 *
 * Checks two layers:
 *   1. data/{activity}.json — all string content fields per spot
 *   2. en|fr/{activity}/{slug}.html — the "About This Place" and
 *      "Seasonal Tips" content sections (the text this project rewrites)
 *
 * Usage:
 *   node scripts/check-content-uniqueness.js               # all activities
 *   node scripts/check-content-uniqueness.js fishing       # one activity
 *   node scripts/check-content-uniqueness.js --slugs=lake-superior,lake-simcoe
 *       (all spots are indexed; violations are reported only if they touch
 *        one of the given slugs — i.e. batch spots checked against whole site)
 *   node scripts/check-content-uniqueness.js --fields=description,seasonal_tips
 *   node scripts/check-content-uniqueness.js --top=20      # show top N offending sentences
 *   node scripts/check-content-uniqueness.js --shapes
 *       Also flag TEMPLATED boilerplate in the practical fields
 *       (getting_there, parking, best_time, nearby_services, accommodation,
 *       safety): sentences are masked — proper nouns -> @, numbers -> # —
 *       before indexing, so per-spot parameterized filler like
 *       "From Ottawa, head east — the drive takes approximately 1.5-2 hours"
 *       collapses into one shape across spots and gets caught even though no
 *       two spots share the exact sentence.
 *
 * Exit code 1 if any violation found (for CI).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ACTIVITIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const MAX_PAGES = 2;   // a sentence may appear on at most this many spots
const MIN_WORDS = 8;

// JSON fields that hold prose shown on the page
const JSON_FIELDS = [
  'description', 'seasonal_tips', 'best_time', 'terrain', 'getting_there',
  'parking', 'accommodation', 'nearby_services', 'regulations', 'safety',
  'description_fr', 'seasonal_tips_fr',
];

const args = process.argv.slice(2);
const actArg = args.find(a => !a.startsWith('--'));
const slugsArg = (args.find(a => a.startsWith('--slugs=')) || '').replace('--slugs=', '');
const topArg = parseInt((args.find(a => a.startsWith('--top=')) || '--top=10').replace('--top=', ''), 10);
const fieldsArg = (args.find(a => a.startsWith('--fields=')) || '').replace('--fields=', '');
const acts = actArg ? [actArg] : ACTIVITIES;
const onlySlugs = slugsArg ? new Set(slugsArg.split(',')) : null;
const onlyFields = fieldsArg ? new Set(fieldsArg.split(',').flatMap(f => [f, `${f}_fr`])) : null;
const shapesMode = args.includes('--shapes');

// Fields prone to parameterized template filler (checked in --shapes mode).
const SHAPE_FIELDS = ['getting_there', 'parking', 'best_time', 'nearby_services', 'accommodation', 'safety'];

// Mask proper nouns and numbers so parameterized boilerplate collapses into
// one comparable shape. Runs BEFORE lowercasing (case identifies the nouns).
function maskShape(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\b[A-ZÀÂÇÉÈÊËÎÏÔ][\wàâçéèêëîïôùûüœ'-]*(?:\s+[A-ZÀÂÇÉÈÊËÎÏÔ][\wàâçéèêëîïôùûüœ'-]*)*/g, '@')
    .replace(/\d[\d.,:-]*/g, '#');
}

function sentences(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.toLowerCase().replace(/[^a-z0-9àâçéèêëîïôùûüœ' -]/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter(s => s.split(' ').filter(Boolean).length >= MIN_WORDS);
}

// Extract the About + Seasonal Tips paragraph text from a spot page.
function extractHtmlSections(html) {
  const out = [];
  // Seasonal Tips / Conseils de saison block
  const seas = html.match(/<h2[^>]*>(?:Seasonal Tips|Conseils de saison)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/);
  if (seas) out.push(seas[1]);
  // About This Place / À propos de ce lieu block
  const about = html.match(/<h2[^>]*>(?:About This Place|À propos de ce lieu)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/);
  if (about) out.push(about[1]);
  return out;
}

// sentence -> Map(activity/slug -> Set(where))
const index = new Map();
function add(sentence, pageKey, where) {
  if (!index.has(sentence)) index.set(sentence, new Map());
  const pages = index.get(sentence);
  if (!pages.has(pageKey)) pages.set(pageKey, new Set());
  pages.get(pageKey).add(where);
}

// masked shape -> Map(activity/slug -> Set(field))
const shapeIndex = new Map();
function addShape(shape, pageKey, field) {
  if (!shapeIndex.has(shape)) shapeIndex.set(shape, new Map());
  const pages = shapeIndex.get(shape);
  if (!pages.has(pageKey)) pages.set(pageKey, new Set());
  pages.get(pageKey).add(field);
}

let spotCount = 0;
for (const act of acts) {
  const dataFile = path.join(ROOT, 'data', `${act}.json`);
  if (!fs.existsSync(dataFile)) continue;
  const spots = JSON.parse(fs.readFileSync(dataFile, 'utf8')).spots;
  for (const spot of spots) {
    spotCount++;
    const key = `${act}/${spot.slug}`;
    for (const f of JSON_FIELDS) {
      if (onlyFields && !onlyFields.has(f)) continue;
      if (spot[f]) for (const s of sentences(spot[f])) add(s, key, `json:${f}`);
    }
    if (shapesMode) {
      for (const f of SHAPE_FIELDS) {
        if (spot[f]) for (const s of sentences(maskShape(spot[f]))) addShape(s, key, f);
      }
    }
    if (!onlyFields || onlyFields.has('description') || onlyFields.has('seasonal_tips')) {
      for (const lang of ['en', 'fr']) {
        const file = path.join(ROOT, lang, act, `${spot.slug}.html`);
        if (!fs.existsSync(file)) continue;
        for (const block of extractHtmlSections(fs.readFileSync(file, 'utf8'))) {
          for (const s of sentences(block)) add(s, key, `${lang}:html`);
        }
      }
    }
  }
}

const violations = [...index.entries()]
  .map(([s, pages]) => ({ sentence: s, count: pages.size, pages: [...pages.keys()] }))
  .filter(v => v.count > MAX_PAGES)
  .filter(v => !onlySlugs || v.pages.some(p => onlySlugs.has(p.split('/')[1])))
  .sort((a, b) => b.count - a.count);

console.log(`Checked ${spotCount} spots (${acts.join(', ')})`);
console.log(`Duplicated sentences (${MIN_WORDS}+ words on >${MAX_PAGES} pages): ${violations.length}`);
const affected = new Set(violations.flatMap(v => v.pages));
console.log(`Spot pages affected: ${affected.size}`);
for (const v of violations.slice(0, topArg)) {
  console.log(`\n[${v.count} pages] "${v.sentence.slice(0, 110)}${v.sentence.length > 110 ? '…' : ''}"`);
  console.log(`  e.g. ${v.pages.slice(0, 4).join(', ')}`);
}

let shapeViolations = [];
if (shapesMode) {
  shapeViolations = [...shapeIndex.entries()]
    .map(([s, pages]) => ({
      shape: s,
      count: pages.size,
      pages: [...pages.keys()],
      fields: [...new Set([...pages.values()].flatMap(set => [...set]))],
    }))
    .filter(v => v.count > MAX_PAGES)
    .filter(v => !onlySlugs || v.pages.some(p => onlySlugs.has(p.split('/')[1])))
    .sort((a, b) => b.count - a.count);
  const shapeAffected = new Set(shapeViolations.flatMap(v => v.pages));
  console.log(`\n--- Templated-boilerplate shapes (${SHAPE_FIELDS.join(', ')}) ---`);
  console.log(`Shapes on >${MAX_PAGES} pages: ${shapeViolations.length}`);
  console.log(`Spot pages affected: ${shapeAffected.size}`);
  for (const v of shapeViolations.slice(0, topArg)) {
    console.log(`\n[${v.count} pages] [${v.fields.join(',')}] "${v.shape.slice(0, 110)}${v.shape.length > 110 ? '…' : ''}"`);
    console.log(`  e.g. ${v.pages.slice(0, 4).join(', ')}`);
  }
}
process.exit(violations.length || shapeViolations.length ? 1 : 0);
