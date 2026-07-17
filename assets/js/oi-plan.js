/*! Outdoor Intel — Add-to-trip layer.
 * Turns directory cards and spot pages into one-tap entry points to the
 * Trip Planner. Writes to the SAME localStorage key the planner restores
 * from (oi_trip_v1), so a spot added anywhere shows up in the plan. */
(function () {
  'use strict';
  try {
    var CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
    var CAT_COLOR = { fishing: '#2563eb', hunting: '#ea580c', camping: '#16a34a', kayaking: '#0891b2', skiing: '#7c3aed', hiking: '#d97706' };
    var CAT_ICON = { fishing: '\u{1F3A3}', hunting: '\u{1F98C}', camping: '⛺', kayaking: '\u{1F6F6}', skiing: '⛷️', hiking: '\u{1F97E}' };
    var CAT_LABEL_FR = { fishing: 'Pêche', hunting: 'Chasse', camping: 'Camping', kayaking: 'Kayak', skiing: 'Ski', hiking: 'Randonnée' };
    var WMO_ICON = { 0: '☀️', 1: '\u{1F324}️', 2: '⛅', 3: '☁️', 45: '\u{1F32B}️', 48: '\u{1F32B}️', 51: '\u{1F326}️', 53: '\u{1F327}️', 55: '\u{1F327}️', 61: '\u{1F326}️', 63: '\u{1F327}️', 65: '\u{1F327}️', 66: '\u{1F9CA}', 67: '\u{1F9CA}', 71: '\u{1F328}️', 73: '\u{1F328}️', 75: '\u{1F328}️', 77: '\u{1F328}️', 80: '\u{1F326}️', 81: '\u{1F327}️', 82: '⛈️', 85: '\u{1F328}️', 86: '\u{1F328}️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
    var LS_KEY = 'oi_trip_v1';
    var PLANNER = '/en/trip-planner';
    var FR = location.pathname.indexOf('/fr/') === 0;
    function catLabel(cat) { return FR ? (CAT_LABEL_FR[cat] || cat) : (cat.charAt(0).toUpperCase() + cat.slice(1)); }

    // ---------- Shared spot data (lazy, cached) ----------
    var _spotsPromise = null;
    function loadAllSpots() {
      if (_spotsPromise) return _spotsPromise;
      _spotsPromise = Promise.all(CATS.map(function (cat) {
        return fetch('/data/' + cat + '.json').then(function (r) { return r.json(); }).then(function (d) {
          return (d.spots || []).map(function (s) {
            return {
              name: s.name, slug: s.slug, province: s.province, cat: cat,
              lat: s.coordinates && s.coordinates.lat, lng: s.coordinates && s.coordinates.lng,
              species: s.primary_species || s.primary_game || s.features || [], scout: s.scout_level || ''
            };
          });
        }).catch(function () { return []; });
      })).then(function (arrs) { return arrs.reduce(function (a, b) { return a.concat(b); }, []); });
      return _spotsPromise;
    }
    function haversine(aLat, aLng, bLat, bLng) {
      var R = 6371, p = Math.PI / 180;
      var dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
      var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
    function fmtDist(km) { return km < 10 ? km.toFixed(1) + ' km' : Math.round(km) + ' km'; }
    function getPosition() {
      return new Promise(function (res, rej) {
        if (!navigator.geolocation) { rej(new Error('no-geo')); return; }
        navigator.geolocation.getCurrentPosition(function (pos) { res(pos.coords); }, rej,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
      });
    }
    // ---------- Weekend weather (Open-Meteo), best-effort ----------
    var _wxCache = {};
    function weekendWeather(lat, lng) {
      var key = lat.toFixed(2) + ',' + lng.toFixed(2);
      if (_wxCache[key]) return Promise.resolve(_wxCache[key]);
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
        '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=10';
      return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.daily || !d.daily.time) return null;
        var days = d.daily.time.map(function (t, i) {
          return { date: t, code: d.daily.weathercode[i], hi: Math.round(d.daily.temperature_2m_max[i]), lo: Math.round(d.daily.temperature_2m_min[i]), dow: new Date(t + 'T12:00').getDay() };
        });
        var sat = null, sun = null;
        for (var i = 0; i < days.length; i++) {
          if (!sat && days[i].dow === 6) sat = days[i];
          if (!sun && days[i].dow === 0 && (!sat || days[i].date > sat.date)) sun = days[i];
          if (sat && sun) break;
        }
        var out = { sat: sat, sun: sun };
        _wxCache[key] = out;
        return out;
      }).catch(function () { return null; });
    }
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

      // Weekend conditions chip — "is it worth going this weekend?"
      loadAllSpots().then(function (spots) {
        var rec = spots.find(function (s) { return s.slug === spot.slug && s.cat === spot.cat; });
        if (!rec || !rec.lat || !rec.lng) return;
        return weekendWeather(rec.lat, rec.lng).then(function (w) {
          if (!w || (!w.sat && !w.sun)) return;
          var wrap = document.createElement('div');
          wrap.style.cssText = 'margin-top:18px;display:inline-flex;align-items:center;gap:14px;background:rgba(255,255,255,.92);backdrop-filter:blur(4px);border-radius:12px;padding:10px 16px;box-shadow:0 4px 12px rgba(0,0,0,.12)';
          function seg(label, d) { return d ? '<span style="display:inline-flex;align-items:center;gap:5px;font:600 13px/1 system-ui,-apple-system,sans-serif;color:#1c2b21"><span style="color:#7a9b8e;font-weight:700">' + label + '</span> ' + (WMO_ICON[d.code] || '') + ' ' + d.hi + '°<span style="color:#7a9b8e">/' + d.lo + '°</span></span>' : ''; }
          var satL = FR ? 'Sam' : 'Sat', sunL = FR ? 'Dim' : 'Sun';
          wrap.innerHTML = '<span style="font:700 11px/1 system-ui;text-transform:uppercase;letter-spacing:1px;color:#305e3c">' + (FR ? 'Cette fin de semaine' : 'This weekend') + '</span>' + seg(satL, w.sat) + seg(sunL, w.sun);
          if (row.parentNode) row.parentNode.insertBefore(wrap, row.nextSibling);
        });
      }).catch(function () {});
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

      // "Sort by distance" (near me)
      var grid = document.getElementById('spots-grid');
      if (grid) {
        var near = document.createElement('button');
        near.type = 'button';
        near.innerHTML = '&#128205; ' + (FR ? 'Trier par distance' : 'Sort by distance');
        near.style.cssText = 'margin-left:12px;padding:4px 12px;border:1px solid rgba(48,94,60,.25);background:#fff;color:#305e3c;border-radius:14px;font:600 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer;vertical-align:middle;transition:all .15s';
        near.addEventListener('mouseenter', function () { near.style.borderColor = '#3d7a4d'; near.style.background = '#f4f3ec'; });
        near.addEventListener('mouseleave', function () { near.style.borderColor = 'rgba(48,94,60,.25)'; near.style.background = '#fff'; });
        near.addEventListener('click', function () {
          near.disabled = true; near.style.opacity = '.7';
          near.innerHTML = '&#128205; ' + (FR ? 'Localisation…' : 'Locating…');
          getPosition().then(function (coords) {
            return loadAllSpots().then(function (spots) {
              var coordMap = {};
              spots.forEach(function (s) { if (s.lat && s.lng) coordMap[s.cat + '/' + s.slug] = s; });
              var cards = [].slice.call(grid.querySelectorAll('a.spot-card'));
              cards.forEach(function (card) {
                var sp = parseSpot(card.getAttribute('href'));
                var rec = sp && coordMap[sp.cat + '/' + sp.slug];
                var d = rec ? haversine(coords.latitude, coords.longitude, rec.lat, rec.lng) : Infinity;
                card.dataset.dist = d;
                if (rec && !card.querySelector('.oi-dist')) {
                  var badge = document.createElement('span');
                  badge.className = 'oi-dist';
                  badge.textContent = fmtDist(d);
                  badge.style.cssText = 'position:absolute;top:12px;left:12px;z-index:5;background:#305e3c;color:#fff;font:700 11px/1 system-ui,-apple-system,sans-serif;padding:5px 9px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.12)';
                  if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
                  card.appendChild(badge);
                } else if (rec) { card.querySelector('.oi-dist').textContent = fmtDist(d); }
              });
              cards.sort(function (a, b) { return parseFloat(a.dataset.dist) - parseFloat(b.dataset.dist); });
              cards.forEach(function (c) { grid.appendChild(c); });
              near.disabled = false; near.style.opacity = '1';
              near.innerHTML = '&#128205; ' + (FR ? 'Trié par distance' : 'Sorted by distance');
            });
          }).catch(function () {
            near.disabled = false; near.style.opacity = '1';
            near.innerHTML = '&#128205; ' + (FR ? 'Localisation indisponible' : 'Location unavailable');
          });
        });
        if (count.parentNode) count.parentNode.appendChild(near);
      }

      // If URL carried filters, apply them now (existing inline handler re-filters)
      if (applied) {
        search.dispatchEvent(new Event('input', { bubbles: true }));
        if (prov) prov.dispatchEvent(new Event('change', { bubbles: true }));
        if (typ) typ.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateReset();
    }

    // ---------- Homepage: "Spots near you" ----------
    function nearbyCard(s, idx) {
      var color = CAT_COLOR[s.cat] || '#305e3c';
      var lang = FR ? 'fr' : 'en';
      var href = '/' + lang + '/' + s.cat + '/' + s.slug;
      var away = FR ? ' ' : ' away';
      var inTrip = inCart(s.cat, s.slug);
      return '<div class="oi-ny-card" data-i="' + idx + '" style="position:relative;background:#fff;border:1px solid rgba(28,43,33,.1);border-radius:14px;box-shadow:0 4px 12px rgba(62,49,39,.06);transition:transform .18s,box-shadow .18s">' +
        '<a href="' + href + '" style="display:block;text-decoration:none;padding:16px 16px 12px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
            '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:' + color + '">' + CAT_ICON[s.cat] + ' ' + catLabel(s.cat) + '</span>' +
            '<span style="flex-shrink:0;font-size:11px;font-weight:700;color:#305e3c;background:#eef4ec;padding:3px 9px;border-radius:10px">' + fmtDist(s.dist) + away + '</span>' +
          '</div>' +
          '<div style="font-size:16px;font-weight:700;color:#1c2b21;line-height:1.25">' + s.name + '</div>' +
          '<div style="font-size:12px;color:#5c6b5f;margin-top:2px">' + (s.province || '') + '</div>' +
          '<div class="oi-wx" style="margin-top:10px"></div>' +
        '</a>' +
        '<div style="display:flex;gap:8px;padding:0 16px 14px">' +
          '<button type="button" class="oi-ny-add" style="flex:1;padding:8px 0;border-radius:9px;border:1px solid ' + (inTrip ? '#a5d6a7' : 'rgba(48,94,60,.25)') + ';background:' + (inTrip ? '#e8f5e9' : '#fff') + ';color:#305e3c;font:700 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer;transition:all .15s">' + (inTrip ? '&#10003; ' + T.added : '&#43; ' + T.add) + '</button>' +
          '<a href="' + href + '" style="flex:1;text-align:center;padding:8px 0;border-radius:9px;border:1px solid rgba(48,94,60,.25);background:#fff;color:#305e3c;font:700 12px/1 system-ui,-apple-system,sans-serif;text-decoration:none">' + (FR ? 'Voir' : 'View') + '</a>' +
        '</div>' +
      '</div>';
    }

    function fillWeather(card, w) {
      if (!w || (!w.sat && !w.sun)) return;
      var box = card.querySelector('.oi-wx');
      if (!box) return;
      function chip(label, d) { return d ? '<span style="white-space:nowrap">' + label + ' ' + (WMO_ICON[d.code] || '') + ' ' + d.hi + '°</span>' : ''; }
      var satL = FR ? 'Sam' : 'Sat', sunL = FR ? 'Dim' : 'Sun';
      box.innerHTML = '<div style="display:flex;gap:10px;align-items:center;font-size:12px;color:#5c6b5f;border-top:1px solid #f0ede8;padding-top:9px">' +
        '<span style="font-weight:600;color:#7a9b8e">' + (FR ? 'Fin de semaine' : 'Weekend') + '</span>' +
        chip(satL, w.sat) + chip(sunL, w.sun) + '</div>';
    }

    function initNearby() {
      var grid = document.getElementById('near-you-grid');
      var btn = document.getElementById('near-you-btn');
      if (!grid || !btn) return;
      var status = document.getElementById('near-you-status');
      var sub = document.getElementById('near-you-sub');
      function setStatus(msg, show) { if (status) { status.innerHTML = msg; status.classList.toggle('hidden', !show); } }

      function render(list) {
        grid.innerHTML = list.map(nearbyCard).join('');
        list.forEach(function (s, i) {
          var card = grid.querySelector('[data-i="' + i + '"]');
          if (!card) return;
          card.addEventListener('mouseenter', function () { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 10px 24px rgba(62,49,39,.12)'; });
          card.addEventListener('mouseleave', function () { card.style.transform = 'none'; card.style.boxShadow = '0 4px 12px rgba(62,49,39,.06)'; });
          var add = card.querySelector('.oi-ny-add');
          if (add) add.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            var ok = addToCart(s.cat, s.slug);
            add.innerHTML = '&#10003; ' + T.added; add.style.background = '#e8f5e9'; add.style.borderColor = '#a5d6a7';
            decorateNav();
            toast(ok ? T.toastAdded : T.toastDup, true);
          });
          if (s.lat && s.lng) weekendWeather(s.lat, s.lng).then(function (w) { fillWeather(card, w); });
        });
      }

      btn.addEventListener('click', function () {
        btn.disabled = true; btn.style.opacity = '.7';
        setStatus(FR ? 'Localisation en cours…' : 'Getting your location…', true);
        getPosition().then(function (coords) {
          setStatus(FR ? 'Recherche des spots les plus proches…' : 'Finding the closest spots…', true);
          return loadAllSpots().then(function (spots) {
            var withD = spots.filter(function (s) { return s.lat && s.lng; }).map(function (s) {
              s.dist = haversine(coords.latitude, coords.longitude, s.lat, s.lng); return s;
            }).sort(function (a, b) { return a.dist - b.dist; });
            render(withD.slice(0, 8));
            setStatus('', false);
            if (sub) sub.textContent = FR ? 'Les 8 spots les plus proches de vous, tous types confondus.' : 'The 8 closest spots to you, across every activity.';
            var lbl = btn.childNodes[btn.childNodes.length - 1];
            if (lbl && lbl.nodeType === 3) lbl.textContent = FR ? ' Actualiser' : ' Update location';
          });
        }).catch(function () {
          setStatus(FR ? 'Localisation indisponible. Essayez la recherche ou explorez la carte.' : 'Location unavailable — try the search box or explore the map instead.', true);
        }).then(function () { btn.disabled = false; btn.style.opacity = '1'; });
      });
    }

    function run() {
      enhanceCards();
      enhanceHero();
      enhanceDirectory();
      initNearby();
      decorateNav();
      // keep the counter fresh if the user returns via back/forward cache
      window.addEventListener('pageshow', decorateNav);
      window.addEventListener('focus', decorateNav);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  } catch (e) { /* never break the page */ }
})();
