const fs = require('fs');
const path = require('path');

// Find all HTML files recursively
function findHtmlFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        if (item === '.git' || item === 'node_modules') return;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results.push(...findHtmlFiles(fullPath));
        } else if (item.endsWith('.html') && !item.includes('map.html')) {
            results.push(fullPath);
        }
    });
    return results;
}

const htmlFiles = findHtmlFiles('.');
let updated = 0;
let skipped = 0;

htmlFiles.forEach(filePath => {
    let html = fs.readFileSync(filePath, 'utf8');

    // Skip if already has map link
    if (html.includes('map.html')) {
        skipped++;
        return;
    }

    // Determine path prefix based on file depth
    let mapHref;
    let blogHref;
    const rel = path.relative('.', filePath);
    const depth = rel.split(path.sep).length - 1;

    if (depth === 0) {
        // Root level (index.html)
        mapHref = 'en/map.html';
    } else if (depth === 1) {
        // en/ level
        mapHref = 'map.html';
    } else if (depth === 2) {
        // en/skiing/ level
        mapHref = '../map.html';
    } else if (depth === 3) {
        // en/skiing/blog/ level
        mapHref = '../../map.html';
    } else {
        mapHref = '../map.html';
    }

    let changed = false;

    // Desktop nav - add Map link before Blog
    // Pattern 1: index.html style nav (uses en/blog.html)
    const desktopBlog1 = `<a href="en/blog.html" class="hover:text-[#c97c5e] transition-colors py-2">Blog</a>`;
    if (html.includes(desktopBlog1)) {
        html = html.replace(desktopBlog1,
            `<a href="${mapHref}" class="hover:text-[#c97c5e] transition-colors py-2">Map</a>\n            ${desktopBlog1}`);
        changed = true;
    }

    // Pattern 2: en/ level pages using relative blog.html
    const desktopBlog2 = `<a href="../../en/blog.html" class="hover:text-[#c97c5e] transition-colors py-2">Blog</a>`;
    if (html.includes(desktopBlog2)) {
        html = html.replace(desktopBlog2,
            `<a href="${mapHref}" class="hover:text-[#c97c5e] transition-colors py-2">Map</a>\n            ${desktopBlog2}`);
        changed = true;
    }

    // Pattern 3: blog.html itself
    const desktopBlog3 = `<a href="blog.html" class="hover:text-[#c97c5e] transition-colors py-2">Blog</a>`;
    if (!changed && html.includes(desktopBlog3)) {
        html = html.replace(desktopBlog3,
            `<a href="${mapHref}" class="hover:text-[#c97c5e] transition-colors py-2">Map</a>\n            ${desktopBlog3}`);
        changed = true;
    }

    // Pattern 4: blog link with different path (../blog.html)
    const desktopBlog4 = `<a href="../en/blog.html" class="hover:text-[#c97c5e] transition-colors py-2">Blog</a>`;
    if (!changed && html.includes(desktopBlog4)) {
        html = html.replace(desktopBlog4,
            `<a href="${mapHref}" class="hover:text-[#c97c5e] transition-colors py-2">Map</a>\n            ${desktopBlog4}`);
        changed = true;
    }

    // Mobile nav - add Map link before Blog in mobile menu
    // Pattern 1: index.html mobile
    const mobileBlog1 = `<a href="en/blog.html" class="block py-2 text-[#2d5a3d] font-semibold hover:text-[#c97c5e]">Blog</a>`;
    if (html.includes(mobileBlog1)) {
        html = html.replace(mobileBlog1,
            `<a href="${mapHref}" class="block py-2 text-[#6b6359] hover:text-[#c97c5e]">Map</a>\n            ${mobileBlog1}`);
    }

    // Pattern 2: spot pages mobile
    const mobileBlog2 = `<a href="../../en/blog.html" class="block py-2 text-[#2d5a3d] font-semibold hover:text-[#c97c5e]">Blog</a>`;
    if (html.includes(mobileBlog2)) {
        html = html.replace(mobileBlog2,
            `<a href="${mapHref}" class="block py-2 text-[#6b6359] hover:text-[#c97c5e]">Map</a>\n            ${mobileBlog2}`);
    }

    // Pattern 3: blog.html mobile
    const mobileBlog3 = `<a href="blog.html" class="block py-2 text-[#2d5a3d] font-semibold hover:text-[#c97c5e]">Blog</a>`;
    if (html.includes(mobileBlog3)) {
        html = html.replace(mobileBlog3,
            `<a href="${mapHref}" class="block py-2 text-[#6b6359] hover:text-[#c97c5e]">Map</a>\n            ${mobileBlog3}`);
    }

    if (changed) {
        fs.writeFileSync(filePath, html);
        updated++;
    } else {
        skipped++;
    }
});

console.log(`Updated ${updated} files with Map navigation link. Skipped ${skipped}.`);
