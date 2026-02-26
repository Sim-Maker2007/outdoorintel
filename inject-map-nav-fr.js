const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        if (item === '.git' || item === 'node_modules') return;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results.push(...findHtmlFiles(fullPath));
        } else if (item.endsWith('.html')) {
            results.push(fullPath);
        }
    });
    return results;
}

const htmlFiles = findHtmlFiles('./fr');
let updated = 0;

htmlFiles.forEach(filePath => {
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('map.html')) return;

    const rel = path.relative('.', filePath);
    const depth = rel.split(path.sep).length - 1;

    // Map link points to EN map (same map for both languages)
    let mapHref;
    if (depth === 1) mapHref = '../en/map.html';
    else if (depth === 2) mapHref = '../../en/map.html';
    else if (depth === 3) mapHref = '../../../en/map.html';
    else mapHref = '../en/map.html';

    let changed = false;

    // Desktop nav - French uses "Blogue"
    const desktopBlog = `<a href="../../fr/blog.html" class="hover:text-[#c97c5e] transition-colors py-2">Blogue</a>`;
    if (html.includes(desktopBlog)) {
        html = html.replace(desktopBlog,
            `<a href="${mapHref}" class="hover:text-[#c97c5e] transition-colors py-2">Carte</a>\n            ${desktopBlog}`);
        changed = true;
    }

    // Mobile nav
    const mobileBlog = `<a href="../../fr/blog.html" class="block py-2 text-[#2d5a3d] font-semibold hover:text-[#c97c5e]">Blogue</a>`;
    if (html.includes(mobileBlog)) {
        html = html.replace(mobileBlog,
            `<a href="${mapHref}" class="block py-2 text-[#6b6359] hover:text-[#c97c5e]">Carte</a>\n            ${mobileBlog}`);
    }

    if (changed) {
        fs.writeFileSync(filePath, html);
        updated++;
    }
});

console.log(`Updated ${updated} French files with Carte (Map) navigation link.`);
