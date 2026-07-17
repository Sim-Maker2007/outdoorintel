/*! Outdoor Intel — Add-to-trip layer.
 * Turns directory cards and spot pages into one-tap entry points to the
 * Trip Planner. Writes to the SAME localStorage key the planner restores
 * from (oi_trip_v1), so a spot added anywhere shows up in the plan. */
(function () {
  'use strict';
  try {
    var CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
    var LS_KEY = 'oi_trip_v1';
    var PLANNER = '/en/trip-planner';
    var FR = location.pathname.indexOf('/fr/') === 0;
    var T = {
      add: FR ? 'Ajouter' : 'Add to trip',
      added: FR ? 'Ajouté' : 'In trip',
      heroAdd: FR ? 'Ajouter au planificateur' : 'Add to Trip Planner',
      heroIn: FR ? 'Dans votre trajet' : 'In your trip',
      toastAdded: FR ? 'Ajouté à votre trajet' : 'Added to your trip',
      toastDup: FR ? 'Déjà dans votre trajet' : 'Already in your trip',
      view: FR ? 'Voir le planificateur' : 'Open planner'
    };

    function readTrip() { try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
    function writeTrip(o) { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {} }
    function inCart(cat, slug) { var o = readTrip(); return !!(o && o.t && o.t.some(function (x) { return !x.svc && x.slug === slug && x.cat === cat; })); }
    function addToCart(cat, slug) {
      var o = readTrip() || { a: cat, v: [cat], s: null, t: [] };
      if (!o.t) o.t = []; if (!o.v) o.v = [];
      if (o.t.some(function (x) { return !x.svc && x.slug === slug && x.cat === cat; })) return false;
      o.t.push({ slug: slug, cat: cat });
      if (!o.a) o.a = cat;
      if (o.v.indexOf(cat) < 0) o.v.push(cat);
      writeTrip(o);
      return true;
    }

    function parseSpot(href) {
      try {
        var u = new URL(href, location.origin);
        var parts = u.pathname.replace(/\.html$/, '').split('/').filter(Boolean); // [en|fr, cat, slug...]
        if (parts.length >= 3 && (parts[0] === 'en' || parts[0] === 'fr') && CATS.indexOf(parts[1]) >= 0) {
          var slug = parts.slice(2).join('/');
          if (slug === 'directory' || slug === 'spot-directory' || parts[2] === 'blog') return null;
          return { cat: parts[1], slug: slug };
        }
      } catch (e) {}
      return null;
    }

    // ---------- Toast ----------
    var toastEl, toastTimer;
    function toast(msg, withLink) {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'oi-plan-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);z-index:99999;background:#1c2b21;color:#fff;padding:12px 18px;border-radius:12px;font:600 13px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.28);opacity:0;transition:opacity .25s,transform .25s;display:flex;align-items:center;gap:12px;max-width:calc(100% - 32px)';
        document.body.appendChild(toastEl);
      }
      var link = withLink ? '<a href="' + PLANNER + '" style="color:#7ee2a8;text-decoration:underline;white-space:nowrap">' + T.view + ' &rarr;</a>' : '';
      toastEl.innerHTML = '<span>' + msg + '</span>' + link;
      requestAnimationFrame(function () { toastEl.style.opacity = '1'; toastEl.style.transform = 'translateX(-50%) translateY(0)'; });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; toastEl.style.transform = 'translateX(-50%) translateY(20px)'; }, 3600);
    }

    // ---------- Directory cards ----------
    function enhanceCards() {
      var cards = document.querySelectorAll('a.spot-card');
      cards.forEach(function (card) {
        var spot = parseSpot(card.getAttribute('href'));
        if (!spot) return;
        if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'oi-quickadd';
        var done = inCart(spot.cat, spot.slug);
        btn.setAttribute('aria-label', T.add);
        btn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:5;display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:16px;border:1px solid ' + (done ? '#a5d6a7' : 'rgba(48,94,60,.25)') + ';background:' + (done ? '#e8f5e9' : '#ffffff') + ';color:#305e3c;font:700 11px/1 system-ui,-apple-system,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .18s;opacity:' + (done ? '1' : '.92');
        btn.innerHTML = done ? '&#10003; ' + T.added : '&#43; ' + T.add;
        btn.addEventListener('mouseenter', function () { btn.style.opacity = '1'; btn.style.borderColor = '#3d7a4d'; });
        btn.addEventListener('mouseleave', function () { if (!btn.dataset.done) { btn.style.opacity = '.92'; btn.style.borderColor = 'rgba(48,94,60,.25)'; } });
        btn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var ok = addToCart(spot.cat, spot.slug);
          btn.dataset.done = '1';
          btn.innerHTML = '&#10003; ' + T.added;
          btn.style.background = '#e8f5e9'; btn.style.borderColor = '#a5d6a7'; btn.style.opacity = '1';
          toast(ok ? T.toastAdded : T.toastDup, true);
        });
        card.appendChild(btn);
      });
    }

    // ---------- Spot detail hero ----------
    function enhanceHero() {
      var hero = document.querySelector('.spot-hero');
      if (!hero) return;
      var canonical = document.querySelector('link[rel="canonical"]');
      var spot = canonical ? parseSpot(canonical.href) : null;
      if (!spot) return;
      var row = hero.querySelector('.flex.flex-wrap');
      if (!row) return;
      var done = inCart(spot.cat, spot.slug);
      var a = document.createElement('button');
      a.type = 'button';
      a.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:16px 32px;border-radius:8px;border:none;background:' + (done ? '#e8f5e9' : '#f4a825') + ';color:' + (done ? '#166534' : '#1c2b21') + ';font:700 16px/1 system-ui,-apple-system,sans-serif;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.18);transition:all .18s';
      a.innerHTML = (done ? '&#10003; ' + T.heroIn : '&#43; ' + T.heroAdd);
      a.addEventListener('mouseenter', function () { if (!a.dataset.done) a.style.background = '#f7b943'; });
      a.addEventListener('mouseleave', function () { if (!a.dataset.done) a.style.background = '#f4a825'; });
      a.addEventListener('click', function () {
        var ok = addToCart(spot.cat, spot.slug);
        a.dataset.done = '1';
        a.style.background = '#e8f5e9'; a.style.color = '#166534';
        a.innerHTML = '&#10003; ' + T.heroIn;
        toast(ok ? T.toastAdded : T.toastDup, true);
      });
      row.insertBefore(a, row.firstChild);
    }

    // ---------- Header trip counter (continuity cue on every page) ----------
    function tripCount() { var o = readTrip(); return o && o.t ? o.t.filter(function (x) { return !x.svc; }).length : 0; }
    function decorateNav() {
      var n = tripCount();
      var links = document.querySelectorAll('header a[href$="/trip-planner"], header a[href$="/trip-planner/"]');
      links.forEach(function (link) {
        var badge = link.querySelector('.oi-trip-badge');
        if (n <= 0) { if (badge) badge.remove(); return; }
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'oi-trip-badge';
          badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:9px;background:#f4a825;color:#1c2b21;font:700 11px/1 system-ui,-apple-system,sans-serif;vertical-align:middle';
          link.appendChild(badge);
        }
        badge.textContent = n;
      });
    }

    // ---------- Directory: URL-synced filters + reset ----------
    function enhanceDirectory() {
      var search = document.getElementById('search-input');
      var prov = document.getElementById('province-filter');
      var typ = document.getElementById('type-filter');
      var count = document.getElementById('result-count');
      if (!search || !count) return; // not a directory page

      var params = new URLSearchParams(location.search);
      var applied = false;
      var q = params.get('q');
      if (q) { search.value = q; applied = true; }
      var pv = params.get('province');
      if (pv && prov) { prov.value = pv; applied = true; }
      var sp = params.get('species');
      if (sp && typ) { typ.value = sp; applied = true; }

      function syncUrl() {
        var u = new URL(location.href);
        search.value ? u.searchParams.set('q', search.value) : u.searchParams.delete('q');
        (prov && prov.value) ? u.searchParams.set('province', prov.value) : u.searchParams.delete('province');
        (typ && typ.value) ? u.searchParams.set('species', typ.value) : u.searchParams.delete('species');
        history.replaceState(null, '', u.pathname + (u.search || '') + location.hash);
        updateReset();
      }

      // Reset control
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = FR ? 'Réinitialiser les filtres' : 'Clear filters';
      reset.style.cssText = 'margin-left:12px;padding:4px 12px;border:1px solid rgba(48,94,60,.25);background:#fff;color:#305e3c;border-radius:14px;font:600 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer;display:none;vertical-align:middle;transition:all .15s';
      reset.addEventListener('mouseenter', function () { reset.style.borderColor = '#3d7a4d'; reset.style.background = '#f4f3ec'; });
      reset.addEventListener('mouseleave', function () { reset.style.borderColor = 'rgba(48,94,60,.25)'; reset.style.background = '#fff'; });
      reset.addEventListener('click', function () {
        search.value = '';
        if (prov) prov.value = '';
        if (typ) typ.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        if (prov) prov.dispatchEvent(new Event('change', { bubbles: true }));
        if (typ) typ.dispatchEvent(new Event('change', { bubbles: true }));
        syncUrl();
        search.focus();
      });
      if (count.parentNode) count.parentNode.appendChild(reset);
      function updateReset() {
        var active = !!(search.value || (prov && prov.value) || (typ && typ.value));
        reset.style.display = active ? 'inline-block' : 'none';
      }

      search.addEventListener('input', syncUrl);
      if (prov) prov.addEventListener('change', syncUrl);
      if (typ) typ.addEventListener('change', syncUrl);

      // If URL carried filters, apply them now (existing inline handler re-filters)
      if (applied) {
        search.dispatchEvent(new Event('input', { bubbles: true }));
        if (prov) prov.dispatchEvent(new Event('change', { bubbles: true }));
        if (typ) typ.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateReset();
    }

    function run() {
      enhanceCards();
      enhanceHero();
      enhanceDirectory();
      decorateNav();
      // keep the counter fresh if the user returns via back/forward cache
      window.addEventListener('pageshow', decorateNav);
      window.addEventListener('focus', decorateNav);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  } catch (e) { /* never break the page */ }
})();
