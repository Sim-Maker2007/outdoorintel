/*! Outdoor Intel — Field Notes feed.
 * Latest community trip reports across every spot, from the public Supabase
 * view. Degrades gracefully (empty / error) if the backend is unreachable. */
(function () {
  'use strict';
  var grid = document.getElementById('fn-grid');
  if (!grid) return;
  var statusEl = document.getElementById('fn-status');
  var filtersEl = document.getElementById('fn-filters');
  var FR = document.documentElement.lang === 'fr' || location.pathname.indexOf('/fr/') === 0;

  var SB_URL = 'https://vbvsgwiyzjsmxawxyisn.supabase.co';
  var SB_ANON = 'sb_publishable_yZO5NfffLzXGjnFN9TyagQ_rgjRcF00';
  var CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
  var ICONS = { fishing: '🎣', hunting: '🦌', camping: '⛺', kayaking: '🛶', skiing: '⛷️', hiking: '🥾' };
  var LABELS = FR
    ? { fishing: 'Pêche', hunting: 'Chasse', camping: 'Camping', kayaking: 'Kayak', skiing: 'Ski', hiking: 'Randonnée' }
    : { fishing: 'Fishing', hunting: 'Hunting', camping: 'Camping', kayaking: 'Kayaking', skiing: 'Skiing', hiking: 'Hiking' };
  var T = FR
    ? { anon: 'Un éclaireur', all: 'Toutes', empty: 'Aucun rapport pour l’instant — soyez le premier à en publier un depuis une page de spot.', err: 'Impossible de charger les rapports pour le moment.', loading: 'Chargement des derniers rapports…', reports: 'rapports', just: 'à l’instant', m: ' min', h: ' h', d: ' j' }
    : { anon: 'A scout', all: 'All', empty: 'No field reports yet — be the first to post one from any spot page.', err: 'Unable to load reports right now.', loading: 'Loading the latest reports…', reports: 'reports', just: 'just now', m: 'm ago', h: 'h ago', d: 'd ago' };

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function titleCase(slug) { return String(slug || '').split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  function rel(ts) {
    var s = (Date.now() - new Date(ts).getTime()) / 1000;
    if (s < 90) return T.just;
    if (s < 3600) return Math.round(s / 60) + T.m;
    if (s < 86400) return Math.round(s / 3600) + T.h;
    return Math.round(s / 86400) + T.d;
  }

  var nameMap = {};
  function loadNames() {
    return Promise.all(CATS.map(function (cat) {
      return fetch('/data/' + cat + '.json').then(function (r) { return r.json(); }).then(function (d) {
        (d.spots || []).forEach(function (s) { nameMap[cat + '/' + s.slug] = { name: s.name, province: s.province }; });
      }).catch(function () {});
    }));
  }

  var allRows = [], activeCat = 'all';

  function card(rep) {
    var lang = FR ? 'fr' : 'en';
    var href = '/' + lang + '/' + rep.activity + '/' + rep.spot_slug;
    var meta = nameMap[rep.activity + '/' + rep.spot_slug];
    var name = meta ? meta.name : titleCase(rep.spot_slug);
    var prov = meta && meta.province ? ' · ' + esc(meta.province) : '';
    var body = (rep.body || '');
    if (body.length > 160) body = body.slice(0, 160).trim() + '…';
    var photo = rep.photo_url ? '<div class="h-40 overflow-hidden bg-[#e8eae2]"><img src="' + esc(rep.photo_url) + '" alt="" loading="lazy" class="w-full h-full object-cover"></div>' : '';
    var tags = '';
    if (Array.isArray(rep.condition_tags) && rep.condition_tags.length) {
      tags = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0">' + rep.condition_tags.slice(0, 4).map(function (t) {
        return '<span style="font-size:11px;font-weight:600;color:#305e3c;background:#eef4ec;border:1px solid rgba(48,94,60,.15);padding:3px 9px;border-radius:10px">' + esc(t) + '</span>';
      }).join('') + '</div>';
    }
    return '<a href="' + href + '" class="block bg-white border border-[#1c2b21]/10 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">' + photo +
      '<div class="p-5">' +
        '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#305e3c;margin-bottom:6px">' + (ICONS[rep.activity] || '') + ' ' + esc(LABELS[rep.activity] || rep.activity) + '</p>' +
        '<p class="font-bold text-[#1c2b21]">' + esc(name) + '<span class="text-[#5c6b5f] font-normal text-sm">' + prov + '</span></p>' +
        '<p class="text-sm text-[#5c6b5f] leading-relaxed mt-2">' + esc(body) + '</p>' + tags +
        '<p class="text-xs text-[#5c6b5f] mt-3"><span class="font-semibold text-[#305e3c]">' + esc(rep.author_name || T.anon) + '</span> · ' + rel(rep.created_at) + '</p>' +
      '</div></a>';
  }

  function renderFilters() {
    var cats = ['all'].concat(CATS.filter(function (c) { return allRows.some(function (r) { return r.activity === c; }); }));
    filtersEl.innerHTML = cats.map(function (c) {
      var on = c === activeCat;
      var label = c === 'all' ? T.all : (ICONS[c] + ' ' + LABELS[c]);
      return '<button type="button" data-cat="' + c + '" style="padding:7px 14px;border-radius:20px;border:1.5px solid ' + (on ? '#305e3c' : 'rgba(48,94,60,.2)') + ';background:' + (on ? '#305e3c' : '#fff') + ';color:' + (on ? '#fff' : '#305e3c') + ';font:600 13px/1 system-ui,-apple-system,sans-serif;cursor:pointer;transition:all .15s">' + label + '</button>';
    }).join('');
    filtersEl.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { activeCat = b.dataset.cat; renderFilters(); renderGrid(); });
    });
  }
  function renderGrid() {
    var rows = activeCat === 'all' ? allRows : allRows.filter(function (r) { return r.activity === activeCat; });
    grid.innerHTML = rows.map(card).join('');
    if (statusEl) statusEl.textContent = rows.length + ' ' + T.reports;
  }

  if (statusEl) statusEl.textContent = T.loading;
  loadNames().then(function () {
    return fetch(SB_URL + '/rest/v1/spot_reports_public?select=activity,spot_slug,author_name,body,condition_tags,photo_url,created_at&order=created_at.desc&limit=48', {
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON }
    });
  }).then(function (r) { if (!r.ok) throw new Error('unavailable'); return r.json(); }).then(function (rows) {
    allRows = Array.isArray(rows) ? rows : [];
    if (!allRows.length) { if (statusEl) statusEl.textContent = T.empty; return; }
    renderFilters();
    renderGrid();
  }).catch(function () { if (statusEl) statusEl.textContent = T.err; });
})();
