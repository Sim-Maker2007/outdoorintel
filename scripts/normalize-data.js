const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CATEGORIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const NORMALIZED_AT = '2026-07-04';

const PROVINCES = {
  Alberta: { code: 'AB', links: {
    fishing: 'https://www.alberta.ca/fishing',
    hunting: 'https://www.alberta.ca/hunting',
    camping: 'https://www.albertaparks.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.avalanche.ca',
    hiking: 'https://www.albertaparks.ca'
  } },
  'British Columbia': { code: 'BC', links: {
    fishing: 'https://www2.gov.bc.ca/gov/content/sports-culture/recreation/fishing-hunting/fishing',
    hunting: 'https://www2.gov.bc.ca/gov/content/sports-culture/recreation/fishing-hunting/hunting',
    camping: 'https://bcparks.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.avalanche.ca',
    hiking: 'https://bcparks.ca'
  } },
  Manitoba: { code: 'MB', links: {
    fishing: 'https://www.gov.mb.ca/nrnd/fish-wildlife/fish/',
    hunting: 'https://www.gov.mb.ca/nrnd/fish-wildlife/wildlife/hunting/',
    camping: 'https://www.gov.mb.ca/nrnd/parks/',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.gov.mb.ca/nrnd/parks/',
    hiking: 'https://www.gov.mb.ca/nrnd/parks/'
  } },
  'New Brunswick': { code: 'NB', links: {
    fishing: 'https://www2.gnb.ca/content/gnb/en/departments/erd/natural_resources/content/fish.html',
    hunting: 'https://www2.gnb.ca/content/gnb/en/departments/erd/natural_resources/content/wildlife.html',
    camping: 'https://parcsnbparks.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://tourismnewbrunswick.ca',
    hiking: 'https://parcsnbparks.ca'
  } },
  'Newfoundland and Labrador': { code: 'NL', links: {
    fishing: 'https://www.gov.nl.ca/ffa/',
    hunting: 'https://www.gov.nl.ca/ffa/',
    camping: 'https://www.parksnl.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.newfoundlandlabrador.com',
    hiking: 'https://www.parksnl.ca'
  } },
  'Northwest Territories': { code: 'NT', links: {
    fishing: 'https://www.ecc.gov.nt.ca/en/services/fishing',
    hunting: 'https://www.ecc.gov.nt.ca/en/services/hunting-trapping',
    camping: 'https://www.nwtparks.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.avalanche.ca',
    hiking: 'https://www.nwtparks.ca'
  } },
  'Nova Scotia': { code: 'NS', links: {
    fishing: 'https://novascotia.ca/fish/',
    hunting: 'https://novascotia.ca/natr/hunt/',
    camping: 'https://parks.novascotia.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://parks.novascotia.ca',
    hiking: 'https://parks.novascotia.ca'
  } },
  Nunavut: { code: 'NU', links: {
    fishing: 'https://www.gov.nu.ca/environment',
    hunting: 'https://www.gov.nu.ca/environment',
    camping: 'https://www.gov.nu.ca/environment',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.avalanche.ca',
    hiking: 'https://www.gov.nu.ca/environment'
  } },
  Ontario: { code: 'ON', links: {
    fishing: 'https://www.ontario.ca/document/ontario-fishing-regulations-summary',
    hunting: 'https://www.ontario.ca/document/ontario-hunting-regulations-summary',
    camping: 'https://www.ontarioparks.com',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.ontario.ca/page/snow-safety',
    hiking: 'https://www.ontarioparks.com'
  } },
  'Prince Edward Island': { code: 'PE', links: {
    fishing: 'https://www.princeedwardisland.ca/en/topic/fishing',
    hunting: 'https://www.princeedwardisland.ca/en/topic/hunting',
    camping: 'https://www.tourismpei.com/pei-campgrounds',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.tourismpei.com',
    hiking: 'https://www.tourismpei.com/what-to-do/beaches-parks'
  } },
  Quebec: { code: 'QC', links: {
    fishing: 'https://www.quebec.ca/tourisme-et-loisirs/activites-de-plein-air/peche-sportive',
    hunting: 'https://www.quebec.ca/tourisme-et-loisirs/activites-sportives-et-de-plein-air/chasse-sportive',
    camping: 'https://www.sepaq.com',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.quebec.ca/tourisme-et-loisirs/activites-de-plein-air/ski',
    hiking: 'https://www.sepaq.com'
  } },
  Saskatchewan: { code: 'SK', links: {
    fishing: 'https://www.saskatchewan.ca/residents/parks-culture-heritage-and-sport/hunting-trapping-and-angling/fishing',
    hunting: 'https://www.saskatchewan.ca/residents/parks-culture-heritage-and-sport/hunting-trapping-and-angling/hunting',
    camping: 'https://parks.saskatchewan.ca',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://parks.saskatchewan.ca',
    hiking: 'https://parks.saskatchewan.ca'
  } },
  Yukon: { code: 'YT', links: {
    fishing: 'https://yukon.ca/en/outdoor-recreation-and-wildlife/fishing',
    hunting: 'https://yukon.ca/en/outdoor-recreation-and-wildlife/hunting',
    camping: 'https://yukon.ca/en/outdoor-recreation-and-wildlife/camping',
    kayaking: 'https://tc.canada.ca/en/marine-transportation/marine-safety',
    skiing: 'https://www.avalanche.ca',
    hiking: 'https://yukon.ca/en/outdoor-recreation-and-wildlife'
  } }
};

const ALIASES = {
  'Newfoundland & Labrador': 'Newfoundland and Labrador',
  'Newfoundland--Labrador': 'Newfoundland and Labrador',
  PEI: 'Prince Edward Island',
  'Yukon Territory': 'Yukon',
  Québec: 'Quebec'
};

function normalizeProvince(value) {
  return ALIASES[value] || value;
}

function sourceLabelFor(spot, province, category) {
  if (spot.website) return 'Official destination/operator website';
  return `${province} ${category} official resource`;
}

let changed = 0;
let total = 0;

for (const category of CATEGORIES) {
  const file = path.join(DATA_DIR, `${category}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const spot of data.spots) {
    total += 1;
    const before = JSON.stringify(spot);
    const originalProvince = spot.province;
    const province = normalizeProvince(originalProvince);
    const provinceInfo = PROVINCES[province];

    if (!provinceInfo) {
      throw new Error(`Unknown province "${originalProvince}" in ${category}/${spot.slug}`);
    }

    if (province !== originalProvince) {
      spot.original_province = originalProvince;
      spot.province = province;
    }

    spot.province_code = provinceInfo.code;
    spot.country = 'Canada';
    spot.source_url = spot.source_url || spot.website || provinceInfo.links[category];
    spot.source_label = spot.source_label || sourceLabelFor(spot, province, category);
    spot.official_regulation_url = spot.official_regulation_url || provinceInfo.links[category];
    spot.last_verified_at = spot.last_verified_at || null;
    spot.verification_status = spot.verification_status || 'needs_review';
    spot.confidence = spot.confidence || 'unverified';
    spot.data_origin = spot.data_origin || `OutdoorIntel v2.2 dataset; provenance scaffold added ${NORMALIZED_AT}`;
    spot.review_notes = spot.review_notes || 'Generated profile copy requires editorial verification for directions, parking, local services, regulations, and safety claims.';

    if (JSON.stringify(spot) !== before) changed += 1;
  }

  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`Normalized ${changed}/${total} spots across ${CATEGORIES.length} datasets.`);
