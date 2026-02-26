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
    if (html.includes('licenses.html')) return;

    const rel = path.relative('.', filePath);
    const depth = rel.split(path.sep).length - 1;
    let href;
    if (rel.startsWith('fr')) {
        if (depth === 1) href = '../en/licenses.html';
        else if (depth === 2) href = '../../en/licenses.html';
        else if (depth === 3) href = '../../../en/licenses.html';
        else href = '../en/licenses.html';
    } else if (rel.startsWith('en')) {
        if (depth === 1) href = 'licenses.html';
        else if (depth === 2) href = '../licenses.html';
        else if (depth === 3) href = '../../licenses.html';
        else href = '../licenses.html';
    } else {
        href = 'en/licenses.html';
    }

    // Insert after the About link in Resources
    const target = `<a href="${rel.startsWith('fr') ? href.replace('licenses','about') : href.replace('licenses','about')}" class="hover:text-[#c97c5e] transition-colors">About</a></li>`;

    // Simpler: just find the "About</a></li>" in Resources and add after it
    const aboutPattern = /About<\/a><\/li>/;
    if (aboutPattern.test(html)) {
        html = html.replace(aboutPattern, `About</a></li>\n                <li><a href="${href}" class="hover:text-[#c97c5e] transition-colors">Licenses &amp; Regs</a></li>`);
        fs.writeFileSync(filePath, html);
        updated++;
    }
});

console.log(`Licenses link injected into ${updated} page footers.`);
