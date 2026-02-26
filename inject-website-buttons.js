const fs = require('fs');
const path = require('path');

const categories = ['skiing', 'camping', 'hiking', 'hunting', 'kayaking', 'fishing'];
const categoryLabels = {
  skiing: 'All Skiing',
  camping: 'All Camping',
  hiking: 'All Hiking',
  hunting: 'All Hunting',
  kayaking: 'All Kayaking',
  fishing: 'All Fishing'
};

let totalUpdated = 0;
let totalSkipped = 0;

categories.forEach(cat => {
  const dataPath = `data/${cat}.json`;
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  data.spots.forEach(spot => {
    if (!spot.website) {
      totalSkipped++;
      return;
    }

    const htmlPath = `en/${cat}/${spot.slug}.html`;
    if (!fs.existsSync(htmlPath)) {
      console.log(`  SKIP (no HTML): ${htmlPath}`);
      totalSkipped++;
      return;
    }

    let html = fs.readFileSync(htmlPath, 'utf8');

    // Skip if already has the official website button
    if (html.includes('Official Website')) {
      return;
    }

    const label = categoryLabels[cat];
    // Pattern: the "All [Category]" button inside the hero section
    const searchStr = `<a href="directory.html" class="bg-[#2d5a3d] text-white px-8 py-4 font-semibold rounded-lg hover:bg-[#c97c5e] transition-colors shadow-lg">${label}</a>`;

    const websiteButton = `<a href="directory.html" class="bg-[#2d5a3d] text-white px-8 py-4 font-semibold rounded-lg hover:bg-[#c97c5e] transition-colors shadow-lg">${label}</a>\n                        <a href="${spot.website}" target="_blank" rel="noopener noreferrer" class="bg-white/90 text-[#2d5a3d] px-8 py-4 font-semibold rounded-lg hover:bg-white transition-colors shadow-lg inline-flex items-center gap-2">Official Website <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>`;

    if (html.includes(searchStr)) {
      html = html.replace(searchStr, websiteButton);
      fs.writeFileSync(htmlPath, html);
      totalUpdated++;
    } else {
      // Try alternate pattern for fishing pages that use "All Fishing" link differently
      const altSearch = `<a href="directory.html" class="bg-white text-[#2d5a3d] px-6 py-3 font-semibold rounded-lg hover:bg-[#fef9f3] transition-colors">${label}</a>`;
      const altButton = `<a href="directory.html" class="bg-white text-[#2d5a3d] px-6 py-3 font-semibold rounded-lg hover:bg-[#fef9f3] transition-colors">${label}</a>\n                    <a href="${spot.website}" target="_blank" rel="noopener noreferrer" class="bg-[#2d5a3d] text-white px-6 py-3 font-semibold rounded-lg hover:bg-[#c97c5e] transition-colors inline-flex items-center gap-2">Official Website <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>`;

      if (html.includes(altSearch)) {
        html = html.replace(altSearch, altButton);
        fs.writeFileSync(htmlPath, html);
        totalUpdated++;
      } else {
        console.log(`  PATTERN NOT FOUND: ${htmlPath}`);
        totalSkipped++;
      }
    }
  });

  console.log(`${cat}: processed`);
});

console.log(`\nDone! Updated ${totalUpdated} HTML pages. Skipped ${totalSkipped}.`);
