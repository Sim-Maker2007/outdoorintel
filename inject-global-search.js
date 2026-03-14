const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules' || item === 'data') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findHtmlFiles(full));
        } else if (item.endsWith('.html')) {
            results.push(full);
        }
    }
    return results;
}

// The search button to add to desktop nav
const SEARCH_BTN = `<button id="global-search-toggle" class="hover:text-[#c97c5e] transition-colors py-2" aria-label="Search spots">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </button>`;

// The full-screen search overlay modal
const SEARCH_MODAL = `
    <!-- Global Search Overlay -->
    <div id="global-search-overlay" class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm hidden" style="transition:opacity 0.2s">
        <div class="flex items-start justify-center pt-[15vh] px-4">
            <div class="bg-white rounded-2xl w-full max-w-2xl overflow-hidden" style="box-shadow:0 25px 50px rgba(0,0,0,0.25)">
                <div class="flex items-center gap-3 px-6 py-4 border-b border-[#2d5a3d]/10">
                    <svg class="w-5 h-5 text-[#6b6359] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input id="global-search-input" type="text" placeholder="Search 499+ spots across Canada..." class="flex-1 text-lg text-[#3e3127] placeholder-[#6b6359]/50 outline-none bg-transparent" autocomplete="off">
                    <kbd class="hidden sm:inline-block text-xs text-[#6b6359] bg-[#f5f3f0] px-2 py-1 rounded font-mono">ESC</kbd>
                </div>
                <div id="global-search-results" class="max-h-[50vh] overflow-y-auto">
                    <div class="px-6 py-8 text-center text-[#6b6359] text-sm">Type to search fishing spots, hunting areas, campgrounds, trails...</div>
                </div>
            </div>
        </div>
    </div>
    <script>
    (function(){
        var overlay = document.getElementById('global-search-overlay');
        var input = document.getElementById('global-search-input');
        var results = document.getElementById('global-search-results');
        var toggle = document.getElementById('global-search-toggle');
        var spotsData = null;
        var CATS = ['fishing','hunting','camping','kayaking','skiing','hiking'];
        var CAT_ICONS = {fishing:'🎣',hunting:'🦌',camping:'⛺',kayaking:'🛶',skiing:'⛷️',hiking:'🥾'};

        function isEn() { return !window.location.pathname.startsWith('/fr'); }
        function basePath() {
            var p = window.location.pathname;
            var depth = (p.match(/\\//g)||[]).length - 1;
            if (p === '/' || p === '/index.html') return '';
            var segs = [];
            for (var i = 0; i < depth; i++) segs.push('..');
            return segs.join('/') || '.';
        }

        async function loadSpots() {
            if (spotsData) return spotsData;
            spotsData = [];
            var lang = isEn() ? 'en' : 'fr';
            var base = basePath();
            for (var i = 0; i < CATS.length; i++) {
                try {
                    var r = await fetch((base ? base + '/' : '/') + 'data/' + CATS[i] + '.json');
                    var d = await r.json();
                    d.spots.forEach(function(s) {
                        spotsData.push({
                            name: s.name,
                            slug: s.slug,
                            province: s.province,
                            category: CATS[i],
                            species: s.primary_species || s.primary_game || s.features || [],
                            scout_level: s.scout_level || ''
                        });
                    });
                } catch(e) {}
            }
            return spotsData;
        }

        function renderResults(matches) {
            if (!matches.length) {
                results.innerHTML = '<div class="px-6 py-8 text-center text-[#6b6359] text-sm">No spots found. Try a different search term.</div>';
                return;
            }
            var lang = isEn() ? 'en' : 'fr';
            var base = basePath();
            var html = matches.slice(0, 12).map(function(s) {
                var href = (base ? base + '/' : '/') + lang + '/' + s.category + '/' + s.slug + '.html';
                var icon = CAT_ICONS[s.category] || '';
                var sub = s.province + ' • ' + s.category.charAt(0).toUpperCase() + s.category.slice(1);
                if (s.species.length) sub += ' • ' + s.species.slice(0,2).join(', ');
                return '<a href="' + href + '" class="flex items-center gap-4 px-6 py-3 hover:bg-[#fef9f3] transition-colors">' +
                    '<span class="text-xl flex-shrink-0">' + icon + '</span>' +
                    '<div class="flex-1 min-w-0">' +
                    '<div class="font-semibold text-[#2d5a3d] truncate">' + s.name + '</div>' +
                    '<div class="text-xs text-[#6b6359] truncate">' + sub + '</div>' +
                    '</div>' +
                    '<span class="text-xs font-bold text-[#c97c5e] flex-shrink-0">' + s.scout_level + '</span>' +
                    '</a>';
            }).join('');
            if (matches.length > 12) {
                html += '<div class="px-6 py-3 text-center text-xs text-[#6b6359]">' + (matches.length - 12) + ' more results...</div>';
            }
            results.innerHTML = html;
        }

        function search(q) {
            if (!spotsData) return;
            q = q.toLowerCase().trim();
            if (!q) {
                results.innerHTML = '<div class="px-6 py-8 text-center text-[#6b6359] text-sm">Type to search fishing spots, hunting areas, campgrounds, trails...</div>';
                return;
            }
            var matches = spotsData.filter(function(s) {
                return s.name.toLowerCase().includes(q) ||
                    s.province.toLowerCase().includes(q) ||
                    s.category.toLowerCase().includes(q) ||
                    s.species.some(function(sp) { return sp.toLowerCase().includes(q); });
            });
            renderResults(matches);
        }

        function open() {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            input.value = '';
            input.focus();
            loadSpots();
            results.innerHTML = '<div class="px-6 py-8 text-center text-[#6b6359] text-sm">Type to search fishing spots, hunting areas, campgrounds, trails...</div>';
        }

        function close() {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }

        if (toggle) toggle.addEventListener('click', open);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') close();
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
        });
        input.addEventListener('input', function() { search(this.value); });
    })();
    </script>`;

const files = findHtmlFiles('.');
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('global-search-overlay')) return; // already has search

    // Add search button to desktop nav (before the Français link)
    if (html.includes('class="text-[#c97c5e] font-bold hover:text-[#2d5a3d] transition-colors py-2">Français</a>')) {
        html = html.replace(
            'class="text-[#c97c5e] font-bold hover:text-[#2d5a3d] transition-colors py-2">Français</a>',
            'class="text-[#c97c5e] font-bold hover:text-[#2d5a3d] transition-colors py-2">Français</a>\n            ' + SEARCH_BTN
        );
    }

    // Add search modal before </body>
    if (html.includes('</body>')) {
        html = html.replace('</body>', SEARCH_MODAL + '\n</body>');
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Global search injected into ${updated} pages.`);
