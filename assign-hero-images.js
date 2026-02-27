#!/usr/bin/env node
/**
 * Hero Image Assigner for OutdoorIntel
 * Redistributes all available hero images across pages so each page
 * gets a unique image where possible, then updates both JSON data
 * and HTML files (en + fr).
 *
 * Usage: node assign-hero-images.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HERO_DIR = path.join(__dirname, 'assets', 'heros');
const EN_DIR = path.join(__dirname, 'en');
const FR_DIR = path.join(__dirname, 'fr');

// Collect all available hero images
const allImages = fs.readdirSync(HERO_DIR)
  .filter(f => f.endsWith('.jpg'))
  .sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
    const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
    return numA - numB;
  });

console.log(`\n=== Hero Image Assigner ===`);
console.log(`Available images: ${allImages.length}`);

// Activity categories and their data files
const categories = ['camping', 'fishing', 'hiking', 'hunting', 'kayaking', 'skiing'];

// Load all data
const allData = {};
let totalEntries = 0;
for (const cat of categories) {
  const filePath = path.join(DATA_DIR, `${cat}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  allData[cat] = data;
  totalEntries += data.spots.length;
  console.log(`  ${cat}: ${data.spots.length} entries`);
}

console.log(`Total entries: ${totalEntries}`);
console.log(`Available images: ${allImages.length}`);

// Build a pool of images to assign, categorized by theme
// Group images by type for better thematic matching
const fishingImages = [];
const huntingImages = [];
const campingImages = [];
const hikingImages = [];
const kayakingImages = [];
const skiingImages = [];
const generalPool = [];

// Read attributions to understand image themes
const attrFile = path.join(HERO_DIR, 'ATTRIBUTIONS.txt');
const attributions = {};
if (fs.existsSync(attrFile)) {
  const lines = fs.readFileSync(attrFile, 'utf8').split('\n').filter(l => l.trim());
  for (const line of lines) {
    const match = line.match(/^(scout-hero-\d+\.jpg)\s*—.*query:\s*"([^"]+)"/);
    if (match) {
      attributions[match[1]] = match[2].toLowerCase();
    }
  }
}

// Categorize images by their search query theme
for (const img of allImages) {
  const query = attributions[img] || '';
  if (query.includes('fish') || query.includes('bass') || query.includes('lake') && !query.includes('camp')) {
    fishingImages.push(img);
  } else if (query.includes('hunt') || query.includes('deer') || query.includes('duck')) {
    huntingImages.push(img);
  } else if (query.includes('camp') || query.includes('tent') || query.includes('campfire')) {
    campingImages.push(img);
  } else if (query.includes('hik') || query.includes('trail') || query.includes('mountain') && !query.includes('ski')) {
    hikingImages.push(img);
  } else if (query.includes('kayak') || query.includes('canoe') || query.includes('river') || query.includes('paddle')) {
    kayakingImages.push(img);
  } else if (query.includes('ski') || query.includes('snow') || query.includes('winter') && !query.includes('fish')) {
    skiingImages.push(img);
  } else {
    generalPool.push(img);
  }
}

console.log(`\nImage pools by theme:`);
console.log(`  Fishing: ${fishingImages.length}`);
console.log(`  Hunting: ${huntingImages.length}`);
console.log(`  Camping: ${campingImages.length}`);
console.log(`  Hiking: ${hikingImages.length}`);
console.log(`  Kayaking: ${kayakingImages.length}`);
console.log(`  Skiing: ${skiingImages.length}`);
console.log(`  General: ${generalPool.length}`);

// Map category to its themed pool
const categoryPools = {
  fishing: fishingImages,
  hunting: huntingImages,
  camping: campingImages,
  hiking: hikingImages,
  kayaking: kayakingImages,
  skiing: skiingImages,
};

// Assign images: each category gets its themed images first, then general pool, then cycles
const usedImages = new Set();
const assignments = {}; // { category: [{ slug, oldImage, newImage }] }
let changedCount = 0;

for (const cat of categories) {
  assignments[cat] = [];
  const pool = [...categoryPools[cat], ...generalPool, ...allImages.filter(img =>
    !categoryPools[cat].includes(img) && !generalPool.includes(img)
  )];

  // Remove already-used images from pool, keeping order
  const availablePool = pool.filter(img => !usedImages.has(img));

  const spots = allData[cat].spots;
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    const oldImage = spot.hero_image;

    // Pick next available image, cycling if we run out
    let newImage;
    if (i < availablePool.length) {
      newImage = availablePool[i];
    } else {
      // Cycle through all images for this category
      const cyclePool = pool.length > 0 ? pool : allImages;
      newImage = cyclePool[i % cyclePool.length];
    }

    usedImages.add(newImage);

    if (oldImage !== newImage) {
      changedCount++;
    }

    assignments[cat].push({
      slug: spot.slug,
      oldImage,
      newImage,
    });

    // Update the data object
    spot.hero_image = newImage;
  }
}

console.log(`\nAssignments changed: ${changedCount} out of ${totalEntries}`);

// Save updated JSON data files
for (const cat of categories) {
  const filePath = path.join(DATA_DIR, `${cat}.json`);
  fs.writeFileSync(filePath, JSON.stringify(allData[cat], null, 2) + '\n');
  console.log(`  Updated ${cat}.json`);
}

// Now update HTML files
let htmlUpdated = 0;
let htmlSkipped = 0;
let htmlMissing = 0;

for (const cat of categories) {
  for (const assignment of assignments[cat]) {
    if (assignment.oldImage === assignment.newImage) {
      htmlSkipped++;
      continue;
    }

    // Determine subdirectory for this category
    const subDir = cat;

    // Update English page
    const enPath = path.join(EN_DIR, subDir, `${assignment.slug}.html`);
    // Update French page
    const frPath = path.join(FR_DIR, subDir, `${assignment.slug}.html`);

    for (const htmlPath of [enPath, frPath]) {
      if (!fs.existsSync(htmlPath)) {
        htmlMissing++;
        continue;
      }

      let html = fs.readFileSync(htmlPath, 'utf8');

      // Replace all occurrences of the old image with the new one
      // 1. og:image meta tag
      // 2. twitter:image meta tag
      // 3. Schema.org JSON-LD image
      // 4. CSS background url
      const oldImgPattern = assignment.oldImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(oldImgPattern, 'g');
      const newHtml = html.replace(regex, assignment.newImage);

      if (newHtml !== html) {
        fs.writeFileSync(htmlPath, newHtml);
        htmlUpdated++;
      }
    }
  }
}

console.log(`\nHTML files updated: ${htmlUpdated}`);
console.log(`HTML files skipped (no change): ${htmlSkipped}`);
console.log(`HTML files missing: ${htmlMissing}`);
console.log(`\n=== Done ===`);
