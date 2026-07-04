const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const CANONICAL_PROVINCES = new Set([
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
]);

const REQUIRED = [
  'name',
  'slug',
  'province',
  'province_code',
  'country',
  'coordinates',
  'source_url',
  'source_label',
  'official_regulation_url',
  'verification_status',
  'confidence'
];

const errors = [];
const warnings = [];
const slugs = new Set();
let total = 0;

function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

for (const category of CATEGORIES) {
  const file = path.join(DATA_DIR, `${category}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data.spots)) errors.push(`${category}: missing spots array`);

  for (const spot of data.spots || []) {
    total += 1;
    const id = `${category}/${spot.slug || spot.name || 'unknown'}`;

    for (const field of REQUIRED) {
      if (spot[field] === undefined || spot[field] === '') errors.push(`${id}: missing ${field}`);
    }

    if (!CANONICAL_PROVINCES.has(spot.province)) errors.push(`${id}: non-canonical province "${spot.province}"`);
    if (spot.country !== 'Canada') errors.push(`${id}: country must be Canada`);
    if (!spot.coordinates || typeof spot.coordinates.lat !== 'number' || typeof spot.coordinates.lng !== 'number') {
      errors.push(`${id}: coordinates must include numeric lat/lng`);
    }
    if (!isUrl(spot.source_url)) errors.push(`${id}: source_url must be an http(s) URL`);
    if (!isUrl(spot.official_regulation_url)) errors.push(`${id}: official_regulation_url must be an http(s) URL`);
    if (!['needs_review', 'verified', 'stale'].includes(spot.verification_status)) {
      errors.push(`${id}: verification_status must be needs_review, verified, or stale`);
    }
    if (!['unverified', 'low', 'medium', 'high'].includes(spot.confidence)) {
      errors.push(`${id}: confidence must be unverified, low, medium, or high`);
    }

    const key = `${category}:${spot.slug}`;
    if (slugs.has(key)) errors.push(`${id}: duplicate slug in category`);
    slugs.add(key);

    const body = [
      spot.description,
      spot.getting_there,
      spot.parking,
      spot.nearby_services,
      spot.accommodation,
      spot.safety
    ].filter(Boolean).join(' ');
    if (/From Ottawa|Nearest hospital: Ottawa|Nearest town with full services: Vancouver|Nearest hospital: Vancouver|Nearest hospital: Kelowna/.test(body)) {
      warnings.push(`${id}: contains generated location/service phrasing that should be manually reviewed`);
    }
  }
}

const filesToScan = ['index.html', 'en/about.html', 'en/provinces/index.html', 'fr/provinces/index.html'];
for (const relative of filesToScan) {
  const file = path.join(ROOT, relative);
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    if (/16 provinces/.test(text)) errors.push(`${relative}: still claims 16 provinces`);
    if (/ultimate outdoor destination/i.test(text)) warnings.push(`${relative}: still uses broad "ultimate" positioning`);
  }
}

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  warnings.slice(0, 25).forEach(w => console.log(`- ${w}`));
  if (warnings.length > 25) console.log(`- ... ${warnings.length - 25} more`);
}

if (errors.length) {
  console.error(`\nValidation failed with ${errors.length} error(s):`);
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
}

console.log(`Validated ${total} spots across ${CATEGORIES.length} datasets.`);
