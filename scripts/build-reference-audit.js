const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DOCS_DIR = path.join(ROOT, 'docs');
const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const GENERATED_ON = '2026-07-04';

function inc(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function table(rows) {
  return rows.map(row => `| ${row.join(' | ')} |`).join('\n');
}

const byCategory = new Map();
const byProvince = new Map();
const byVerification = new Map();
const byConfidence = new Map();
const sourceMissing = [];
const generatedSignals = [];
let total = 0;

for (const category of CATEGORIES) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${category}.json`), 'utf8'));
  inc(byCategory, category, data.spots.length);
  total += data.spots.length;

  for (const spot of data.spots) {
    inc(byProvince, spot.province);
    inc(byVerification, spot.verification_status || 'missing');
    inc(byConfidence, spot.confidence || 'missing');

    if (!spot.source_url || !spot.official_regulation_url) sourceMissing.push(`${category}/${spot.slug}`);

    const text = [
      spot.getting_there,
      spot.nearby_services,
      spot.accommodation,
      spot.safety
    ].filter(Boolean).join(' ');
    if (/From Ottawa|Nearest hospital: Ottawa|Nearest town with full services: Vancouver|Nearest hospital: Vancouver|Nearest hospital: Kelowna|Groceries and supplies available in Ottawa/.test(text)) {
      generatedSignals.push(`${category}/${spot.slug}`);
    }
  }
}

const categoryRows = [['Activity', 'Spots'], ...[...byCategory.entries()].map(([k, v]) => [k, String(v)])];
const provinceRows = [['Province/Territory', 'Spots'], ...[...byProvince.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)])];
const verificationRows = [['Status', 'Spots'], ...[...byVerification.entries()].map(([k, v]) => [k, String(v)])];
const confidenceRows = [['Confidence', 'Spots'], ...[...byConfidence.entries()].map(([k, v]) => [k, String(v)])];

const report = `# Outdoor Intel Reference Audit

Generated: ${GENERATED_ON}

This audit is the working control panel for moving Outdoor Intel from a generated directory toward a trusted Canadian outdoor reference.

## Dataset Snapshot

- Total spots: ${total}
- Activities: ${CATEGORIES.length}
- Canonical provinces/territories represented: ${byProvince.size}
- Spots missing source or regulation URL: ${sourceMissing.length}
- Spots with generated location/service phrasing: ${generatedSignals.length}

${table(categoryRows)}

${table(provinceRows)}

## Verification Coverage

${table(verificationRows)}

${table(confidenceRows)}

## Highest Priority Cleanup

1. Manually verify the top traffic pages before publishing more long-form pages.
2. Replace generated directions, parking, nearby services, and hospital references with sourced local details.
3. Mark each reviewed spot as \`verification_status: "verified"\`, set \`confidence\`, and add \`last_verified_at\`.
4. Keep official regulation/permit links activity-specific instead of relying on a global footer link.
5. Noindex or de-emphasize pages that are still useful for search discovery but not yet safe as planning references.

## First Manual Review Batch

Start with nationally recognizable and high-intent destinations:

- fishing/lake-superior
- fishing/lake-ontario
- fishing/lake-erie
- fishing/lake-nipissing
- fishing/algonquin-park-lakes
- camping/algonquin-provincial-park
- camping/killarney-provincial-park
- hiking/west-coast-trail
- hiking/garibaldi-lake
- skiing/whistler-blackcomb
- kayaking/nahanni-river
- hunting/anticosti-island

## Generated Copy Signals

These are not automatic failures, but they are trust risks. Review them before using the affected pages as flagship references.

${generatedSignals.slice(0, 80).map(item => `- ${item}`).join('\n')}${generatedSignals.length > 80 ? `\n- ... ${generatedSignals.length - 80} more` : ''}
`;

fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.writeFileSync(path.join(DOCS_DIR, 'REFERENCE_AUDIT.md'), report);
console.log(`Wrote ${path.relative(ROOT, path.join(DOCS_DIR, 'REFERENCE_AUDIT.md'))}`);
