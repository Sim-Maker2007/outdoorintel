const fs = require('fs');
const path = require('path');

function findBlogHtml(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findBlogHtml(full));
        } else if (item.endsWith('.html') && full.includes('/blog/')) {
            results.push(full);
        }
    }
    return results;
}

const SHARE_BAR = `
        <!-- Share buttons -->
        <section class="bg-white py-8 px-6 border-t border-[#2d5a3d]/10">
            <div class="max-w-3xl mx-auto">
                <div class="flex items-center gap-4 flex-wrap">
                    <span class="text-sm font-semibold text-[#6b6359]">Share this article:</span>
                    <a id="share-x" href="#" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5f3f0] text-[#3e3127] text-sm font-medium hover:bg-[#2d5a3d] hover:text-white transition-colors">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        X / Twitter
                    </a>
                    <a id="share-fb" href="#" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5f3f0] text-[#3e3127] text-sm font-medium hover:bg-[#1877f2] hover:text-white transition-colors">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </a>
                    <button id="share-copy" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5f3f0] text-[#3e3127] text-sm font-medium hover:bg-[#2d5a3d] hover:text-white transition-colors cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        Copy Link
                    </button>
                </div>
            </div>
        </section>
        <script>
        (function(){
            var url = encodeURIComponent(window.location.href);
            var title = encodeURIComponent(document.title);
            var xEl = document.getElementById('share-x');
            var fbEl = document.getElementById('share-fb');
            var copyEl = document.getElementById('share-copy');
            if(xEl) xEl.href = 'https://x.com/intent/tweet?url=' + url + '&text=' + title;
            if(fbEl) fbEl.href = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
            if(copyEl) copyEl.addEventListener('click', function(){
                navigator.clipboard.writeText(window.location.href).then(function(){
                    copyEl.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!';
                    setTimeout(function(){ copyEl.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg> Copy Link'; }, 2000);
                });
            });
        })();
        </script>
`;

const files = findBlogHtml('.');
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('share-copy')) return; // already injected

    // Insert share bar before </main>
    if (html.includes('</main>')) {
        html = html.replace('</main>', SHARE_BAR + '    </main>');
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Share buttons injected into ${updated} blog posts.`);
