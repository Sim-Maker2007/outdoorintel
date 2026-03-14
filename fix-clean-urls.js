const fs = require('fs');
const path = require('path');

// Fix 1: Sitemap - remove .html from all URLs
function fixSitemap() {
    const file = path.join(__dirname, 'sitemap.xml');
    let content = fs.readFileSync(file, 'utf8');
    // Replace .html in <loc> tags, but keep /index.html as /
    content = content.replace(/<loc>(https:\/\/outdoorintel\.ca)\/index\.html<\/loc>/g, '<loc>$1/</loc>');
    content = content.replace(/\.html<\/loc>/g, '</loc>');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed sitemap.xml');
}

// Fix 2: HTML files - remove .html from canonical, hreflang, og:url, twitter:url, and schema URLs
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

function fixHtmlFiles() {
    const files = findHtmlFiles(__dirname);
    let fixed = 0;

    for (const file of files) {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;

        // Fix canonical: href=".../.html" -> href=".../"
        // Handle index.html specially -> /
        content = content.replace(
            /(rel="canonical"\s+href="https:\/\/outdoorintel\.ca)\/index\.html(")/g,
            '$1/$2'
        );
        content = content.replace(
            /(rel="canonical"\s+href="https:\/\/outdoorintel\.ca\/[^"]+)\.html(")/g,
            '$1$2'
        );

        // Fix hreflang: href=".../.html" -> href=".../"
        content = content.replace(
            /(hreflang="[^"]+"\s+href="https:\/\/outdoorintel\.ca)\/index\.html(")/g,
            '$1/$2'
        );
        content = content.replace(
            /(hreflang="[^"]+"\s+href="https:\/\/outdoorintel\.ca\/[^"]+)\.html(")/g,
            '$1$2'
        );

        // Fix og:url
        content = content.replace(
            /(property="og:url"\s+content="https:\/\/outdoorintel\.ca)\/index\.html(")/g,
            '$1/$2'
        );
        content = content.replace(
            /(property="og:url"\s+content="https:\/\/outdoorintel\.ca\/[^"]+)\.html(")/g,
            '$1$2'
        );

        // Fix twitter:url if present
        content = content.replace(
            /(name="twitter:url"\s+content="https:\/\/outdoorintel\.ca)\/index\.html(")/g,
            '$1/$2'
        );
        content = content.replace(
            /(name="twitter:url"\s+content="https:\/\/outdoorintel\.ca\/[^"]+)\.html(")/g,
            '$1$2'
        );

        // Fix JSON-LD schema "url" fields pointing to outdoorintel.ca
        content = content.replace(
            /("url"\s*:\s*"https:\/\/outdoorintel\.ca)\/index\.html(")/g,
            '$1/$2'
        );
        content = content.replace(
            /("url"\s*:\s*"https:\/\/outdoorintel\.ca\/[^"]+)\.html(")/g,
            '$1$2'
        );

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            fixed++;
        }
    }

    console.log(`Fixed ${fixed} / ${files.length} HTML files`);
}

fixSitemap();
fixHtmlFiles();
console.log('Done! All URLs now use clean paths (no .html extension).');
