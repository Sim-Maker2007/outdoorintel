#!/usr/bin/env node
/**
 * Unsplash Image Downloader for OutdoorIntel
 * Downloads outdoor activity images and saves them as hero images.
 *
 * Usage: node download-images.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCESS_KEY = 'iRzzjPTu47vioCt3QJ60mGT5H9hSvKLBJMTy6-3O67k';
const HERO_DIR = path.join(__dirname, 'assets', 'heros');

// Search queries mapped to outdoor categories on the site
const SEARCH_QUERIES = [
  // Fishing
  { query: 'lake fishing canada', count: 8 },
  { query: 'fly fishing river', count: 5 },
  { query: 'ice fishing winter', count: 4 },
  { query: 'bass fishing boat', count: 3 },

  // Hunting
  { query: 'deer hunting forest autumn', count: 5 },
  { query: 'duck hunting wetland', count: 3 },
  { query: 'wilderness hunting canada', count: 4 },
  { query: 'hunting gear outdoor', count: 3 },

  // Camping
  { query: 'camping tent forest canada', count: 5 },
  { query: 'campfire night wilderness', count: 3 },
  { query: 'backcountry camping lake', count: 4 },
  { query: 'winter camping snow', count: 3 },

  // Hiking
  { query: 'hiking trail mountain canada', count: 5 },
  { query: 'forest trail autumn hiking', count: 4 },
  { query: 'rocky mountain hiking', count: 3 },
  { query: 'coastal trail hiking', count: 3 },

  // Kayaking
  { query: 'kayaking lake calm water', count: 5 },
  { query: 'river kayaking rapids', count: 3 },
  { query: 'sea kayaking coast', count: 3 },
  { query: 'canoe wilderness lake', count: 4 },

  // Skiing
  { query: 'skiing powder snow mountain', count: 4 },
  { query: 'cross country skiing forest', count: 3 },
  { query: 'backcountry skiing canada', count: 3 },
  { query: 'ski resort mountain winter', count: 3 },
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Accept-Version': 'v1' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function searchUnsplash(query, perPage) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&client_id=${ACCESS_KEY}`;
  const data = await httpsGet(url);
  const json = JSON.parse(data.toString());
  return json.results || [];
}

async function downloadImage(imageUrl, destPath) {
  const data = await httpsGet(imageUrl);
  fs.writeFileSync(destPath, data);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(HERO_DIR)) {
    fs.mkdirSync(HERO_DIR, { recursive: true });
  }

  // Find the highest existing scout-hero number
  const existing = fs.readdirSync(HERO_DIR)
    .filter((f) => f.startsWith('scout-hero-'))
    .map((f) => parseInt(f.replace('scout-hero-', '').replace('.jpg', ''), 10))
    .filter((n) => !isNaN(n));
  let nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;

  // Collect all referenced but missing images
  const missingNums = [];
  for (let i = 1; i <= 40; i++) {
    const fpath = path.join(HERO_DIR, `scout-hero-${i}.jpg`);
    if (!fs.existsSync(fpath)) {
      missingNums.push(i);
    }
  }

  console.log(`\n=== OutdoorIntel Image Downloader ===`);
  console.log(`Existing hero images: ${existing.length}`);
  console.log(`Missing referenced images: ${missingNums.length} (${missingNums.join(', ')})`);
  console.log(`Next new image number: ${nextNum}\n`);

  // Track all URLs to download — fill missing slots first, then add new
  const downloadQueue = []; // { num, url, query }

  let totalSearches = SEARCH_QUERIES.length;
  let searchesDone = 0;

  for (const { query, count } of SEARCH_QUERIES) {
    searchesDone++;
    console.log(`[${searchesDone}/${totalSearches}] Searching: "${query}" (${count} images)...`);

    try {
      const results = await searchUnsplash(query, count);

      for (const photo of results) {
        // Use the "regular" size (1080px wide) and crop to 1280x720
        const url = photo.urls.regular + '&w=1280&h=720&fit=crop&crop=entropy';

        // Fill missing slots first
        if (missingNums.length > 0) {
          const num = missingNums.shift();
          downloadQueue.push({ num, url, query, photographer: photo.user.name });
        } else {
          downloadQueue.push({ num: nextNum++, url, query, photographer: photo.user.name });
        }
      }

      // Respect Unsplash rate limit (50 req/hour on free tier)
      await sleep(1500);
    } catch (err) {
      console.error(`  Error searching "${query}": ${err.message}`);
      await sleep(3000);
    }
  }

  console.log(`\n=== Downloading ${downloadQueue.length} images ===\n`);

  let downloaded = 0;
  let failed = 0;

  for (const item of downloadQueue) {
    const filename = `scout-hero-${item.num}.jpg`;
    const destPath = path.join(HERO_DIR, filename);

    // Skip if already exists (shouldn't happen, but just in case)
    if (fs.existsSync(destPath)) {
      console.log(`  SKIP ${filename} (already exists)`);
      continue;
    }

    try {
      process.stdout.write(`  Downloading ${filename} [${item.query}]...`);
      await downloadImage(item.url, destPath);
      const size = fs.statSync(destPath).size;
      console.log(` OK (${(size / 1024).toFixed(0)}KB) — Photo by ${item.photographer}`);
      downloaded++;
      await sleep(500);
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total hero images now: ${fs.readdirSync(HERO_DIR).filter((f) => f.endsWith('.jpg')).length}`);

  // Save attribution file
  const attributions = downloadQueue
    .filter((item) => fs.existsSync(path.join(HERO_DIR, `scout-hero-${item.num}.jpg`)))
    .map((item) => `scout-hero-${item.num}.jpg — Photo by ${item.photographer} on Unsplash (query: "${item.query}")`)
    .join('\n');

  fs.writeFileSync(path.join(HERO_DIR, 'ATTRIBUTIONS.txt'), attributions + '\n');
  console.log(`Attribution file saved to assets/heros/ATTRIBUTIONS.txt`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
