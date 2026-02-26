const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findHtmlFiles(full));
        } else if (item.endsWith('.html')) {
            results.push(full);
        }
    }
    return results;
}

const files = findHtmlFiles('.');
let updated = 0;

files.forEach(filePath => {
    let html = fs.readFileSync(filePath, 'utf8');
    if (html.includes('about.html')) return;

    // Determine the correct relative path to en/about.html
    const rel = path.relative('.', filePath);
    const depth = rel.split(path.sep).length - 1;
    let aboutHref;
    if (rel.startsWith('fr')) {
        // French pages
        if (depth === 1) aboutHref = '../en/about.html';
        else if (depth === 2) aboutHref = '../../en/about.html';
        else if (depth === 3) aboutHref = '../../../en/about.html';
        else aboutHref = '../en/about.html';
    } else if (rel.startsWith('en')) {
        if (depth === 1) aboutHref = 'about.html';
        else if (depth === 2) aboutHref = '../about.html';
        else if (depth === 3) aboutHref = '../../about.html';
        else aboutHref = '../about.html';
    } else {
        // Root (index.html)
        aboutHref = 'en/about.html';
    }

    // Insert into Resources section (before Ontario Regulations link)
    const target = `<h4 class="font-bold mb-4 text-[#c97c5e]">Resources</h4>`;
    if (html.includes(target)) {
        const aboutLink = `<h4 class="font-bold mb-4 text-[#c97c5e]">Resources</h4>\n            <ul class="space-y-2 text-white/70 text-sm">\n                <li><a href="${aboutHref}" class="hover:text-[#c97c5e] transition-colors">About</a></li>`;
        // Replace the Resources header + the opening ul
        const searchPattern = `<h4 class="font-bold mb-4 text-[#c97c5e]">Resources</h4>\n            <ul class="space-y-2 text-white/70 text-sm">`;
        if (html.includes(searchPattern)) {
            html = html.replace(searchPattern, aboutLink);
            fs.writeFileSync(filePath, html);
            updated++;
        }
    }
});

console.log(`About link injected into ${updated} page footers.`);
