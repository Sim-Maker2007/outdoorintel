const fs = require('fs');
const path = require('path');

// TODO: Replace G-QY8Q00962P with your actual GA4 Measurement ID from https://analytics.google.com
const GA4_ID = 'G-QY8Q00962P';

const GA4_SNIPPET = `
    <!-- Google Analytics (GA4) — GA4 Measurement ID -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA4_ID}');
    </script>
`;

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

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('googletagmanager.com/gtag')) return; // already has it
    if (!html.includes('</head>')) return;

    html = html.replace('</head>', GA4_SNIPPET + '</head>');
    fs.writeFileSync(f, html);
    updated++;
});

console.log(`GA4 snippet injected into ${updated} pages.`);
