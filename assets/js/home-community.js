// Homepage "Latest reports" strip. Reads the newest visible community reports
// from the public Supabase view and reveals the strip; stays hidden if the
// backend isn't configured, errors, or there are no reports yet.
(function () {
  var wrap = document.getElementById('community-recent');
  if (!wrap) return;
  var grid = document.getElementById('community-recent-grid');
  var LANG = wrap.getAttribute('data-lang') === 'fr' ? 'fr' : 'en';

  var SB_URL = 'https://vbvsgwiyzjsmxawxyisn.supabase.co';
  var SB_ANON = 'sb_publishable_yZO5NfffLzXGjnFN9TyagQ_rgjRcF00';

  var ICONS = { fishing: '🎣', hunting: '🦌', camping: '⛺', kayaking: '🛶', skiing: '⛷️', hiking: '🥾' };
  var T = LANG === 'fr'
    ? { anon: 'Un éclaireur', ago: { just: 'à l’instant', m: ' min', h: ' h', d: ' j' } }
    : { anon: 'A scout', ago: { just: 'just now', m: 'm ago', h: 'h ago', d: 'd ago' } };

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function spotName(slug) {
    return String(slug || '').split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function rel(ts) {
    var s = (Date.now() - new Date(ts).getTime()) / 1000;
    if (s < 90) return T.ago.just;
    if (s < 3600) return Math.round(s / 60) + T.ago.m;
    if (s < 86400) return Math.round(s / 3600) + T.ago.h;
    return Math.round(s / 86400) + T.ago.d;
  }

  fetch(SB_URL + '/rest/v1/spot_reports_public?select=activity,spot_slug,author_name,body,created_at,photo_url&order=created_at.desc&limit=3', {
    headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON }
  }).then(function (r) {
    if (!r.ok) throw new Error('unavailable');
    return r.json();
  }).then(function (rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    grid.innerHTML = rows.map(function (rep) {
      var href = '/' + LANG + '/' + rep.activity + '/' + rep.spot_slug;
      var body = (rep.body || '').length > 140 ? rep.body.slice(0, 140).trim() + '…' : (rep.body || '');
      var photo = rep.photo_url
        ? '<div class="h-32 overflow-hidden"><img src="' + esc(rep.photo_url) + '" alt="" loading="lazy" class="w-full h-full object-cover"></div>'
        : '';
      return '<a href="' + href + '" class="block bg-white border border-[#1c2b21]/10 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">' +
        photo +
        '<div class="p-5">' +
        '<p class="text-sm font-bold text-[#1c2b21] mb-1">' + (ICONS[rep.activity] || '') + ' ' + esc(spotName(rep.spot_slug)) + '</p>' +
        '<p class="text-sm text-[#5c6b5f] leading-relaxed mb-3">' + esc(body) + '</p>' +
        '<p class="text-xs text-[#5c6b5f]"><span class="font-semibold text-[#305e3c]">' + esc(rep.author_name || T.anon) + '</span> · ' + rel(rep.created_at) + '</p>' +
        '</div></a>';
    }).join('');
    wrap.classList.remove('hidden');
  }).catch(function () { /* leave hidden */ });
})();
