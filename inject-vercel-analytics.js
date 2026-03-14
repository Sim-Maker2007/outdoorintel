const fs = require('fs');
const path = require('path');

const ANALYTICS_TAG = '    <script defer src="/_vercel/insights/script.js"></script>';

function findHtmlFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
            results.push(...findHtmlFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            results.push(fullPath);
        }
    }
    return results;
}

const root = __dirname;
const files = findHtmlFiles(root);
let injected = 0;
let skipped = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('/_vercel/insights/script.js')) {
        skipped++;
        continue;
    }
    if (content.includes('</body>')) {
        content = content.replace('</body>', `${ANALYTICS_TAG}\n</body>`);
        fs.writeFileSync(file, content, 'utf8');
        injected++;
    }
}

console.log(`Done: ${injected} files updated, ${skipped} already had analytics, ${files.length} total HTML files found.`);
