/*! Outdoor Intel — Scout chat UI.
 * Talks to /api/scout/plan (grounded AI planner) and renders itineraries that
 * drop into the Trip Planner. Degrades gracefully if Scout isn't configured. */
(function () {
  'use strict';
  var log = document.getElementById('scout-log');
  var form = document.getElementById('scout-form');
  var input = document.getElementById('scout-input');
  if (!log || !form || !input) return;

  var FR = document.documentElement.lang === 'fr' || location.pathname.indexOf('/fr/') === 0;
  var LANG = FR ? 'fr' : 'en';
  var ICONS = { fishing: '🎣', hunting: '🦌', camping: '⛺', kayaking: '🛶', skiing: '⛷️', hiking: '🥾' };
  var LABELS = FR ? { fishing: 'Pêche', hunting: 'Chasse', camping: 'Camping', kayaking: 'Kayak', skiing: 'Ski', hiking: 'Randonnée' }
    : { fishing: 'Fishing', hunting: 'Hunting', camping: 'Camping', kayaking: 'Kayaking', skiing: 'Skiing', hiking: 'Hiking' };
  var T = FR ? {
    thinking: 'Scout explore le terrain…', addAll: 'Ajouter au planificateur', view: 'Voir', notes: 'À savoir',
    err: 'Scout a eu un souci. Réessayez.', warmup: 'Scout se prépare — revenez bientôt.',
    you: 'Vous', placeholder: 'Décrivez votre sortie idéale…',
    regTitle: 'Règlement officiel', regSrc: 'Source officielle (MELCCFP)', regFetched: 'Données du',
    regZonePage: 'Tous les règlements de la zone', regSpecies: 'Espèce', regLimit: 'Limite',
    regLength: 'Longueur', regGear: 'Engin', regMore: 'autres règles sur la page de zone'
  } : {
    thinking: 'Scout is scouting the map…', addAll: 'Add to Trip Planner', view: 'View', notes: 'Good to know',
    err: 'Scout hit a snag. Please try again.', warmup: 'Scout is warming up — check back soon.',
    you: 'You', placeholder: 'Describe your ideal trip…',
    regTitle: 'Official regulation', regSrc: 'Official source (MELCCFP)', regFetched: 'Data from',
    regZonePage: 'All zone regulations', regSpecies: 'Species', regLimit: 'Limit',
    regLength: 'Length', regGear: 'Gear', regMore: 'more rules on the zone page'
  };

  var history = [];
  var busy = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function scroll() { log.scrollTop = log.scrollHeight; }

  function bubble(who, inner, cls) {
    var row = document.createElement('div');
    row.className = 'scout-row ' + (who === 'user' ? 'scout-row-user' : 'scout-row-ai');
    row.innerHTML = inner;
    log.appendChild(row);
    scroll();
    return row;
  }

  function userMsg(text) { bubble('user', '<div class="scout-bubble scout-bubble-user">' + esc(text) + '</div>'); }
  function aiText(text) { bubble('ai', '<div class="scout-bubble scout-bubble-ai">' + esc(text).replace(/\n/g, '<br>') + '</div>'); }

  function typing() {
    var row = bubble('ai', '<div class="scout-bubble scout-bubble-ai scout-typing"><span></span><span></span><span></span> ' + esc(T.thinking) + '</div>');
    return row;
  }

  function renderPlan(plan, addParam) {
    var stopsHtml = plan.stops.map(function (s, i) {
      var href = '/' + LANG + '/' + s.activity + '/' + s.slug;
      return '<div class="scout-stop">' +
        '<div class="scout-stop-num">' + (i + 1) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#305e3c">' + (ICONS[s.activity] || '') + ' ' + esc(LABELS[s.activity] || s.activity) + (s.province ? ' · ' + esc(s.province) : '') + '</div>' +
          '<div style="font-weight:700;color:#1c2b21;margin-top:2px">' + esc(s.name) + '</div>' +
          (s.why ? '<div style="font-size:13px;color:#5c6b5f;margin-top:3px;line-height:1.5">' + esc(s.why) + '</div>' : '') +
        '</div>' +
        '<a href="' + href + '" class="scout-stop-view">' + esc(T.view) + '</a>' +
      '</div>';
    }).join('');
    var notes = plan.notes ? '<div class="scout-notes"><div class="scout-notes-h">' + esc(T.notes) + '</div>' + esc(plan.notes).replace(/\n/g, '<br>') + '</div>' : '';
    var planUrl = '/en/trip-planner?add=' + encodeURIComponent(addParam);
    var html = '<div class="scout-bubble scout-bubble-ai" style="max-width:none;width:100%">' +
      (plan.summary ? '<p style="margin-bottom:14px;line-height:1.6">' + esc(plan.summary).replace(/\n/g, '<br>') + '</p>' : '') +
      '<div style="font-weight:800;color:#1c2b21;font-size:15px;margin-bottom:10px">' + esc(plan.title) + '</div>' +
      '<div class="scout-stops">' + stopsHtml + '</div>' + notes +
      '<a href="' + planUrl + '" class="scout-addall">🧭 ' + esc(T.addAll) + ' (' + plan.stops.length + ')</a>' +
    '</div>';
    bubble('ai', html);
  }

  // Official rule cards: verbatim regulation data returned by the API — the
  // model never authors this content, we render it straight from the source.
  function ruleRows(rules, cap) {
    return rules.slice(0, cap).map(function (r) {
      return '<div style="padding:8px 0;border-top:1px solid rgba(48,94,60,.12)">' +
        '<div style="font-weight:700;color:#1c2b21;font-size:13px">' + esc(r.species) + (r.period ? ' <span style="font-weight:400;color:#5c6b5f">· ' + esc(r.period) + '</span>' : '') + '</div>' +
        '<div style="font-size:13px;color:#1c2b21;margin-top:2px">' +
          (r.limit ? '<strong>' + esc(T.regLimit) + ':</strong> ' + esc(r.limit) + ' ' : '') +
          (r.length ? '<strong>' + esc(T.regLength) + ':</strong> ' + esc(r.length) + ' ' : '') +
          (r.gear ? '<strong>' + esc(T.regGear) + ':</strong> ' + esc(r.gear) : '') +
          (r.notes ? '<div style="color:#5c6b5f">' + esc(r.notes) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderRegs(regs) {
    regs.forEach(function (c) {
      var zoneHref = '/' + LANG + '/fishing/regulations/zone-' + c.zone.id;
      var rules = (c.waterbody && c.waterbody.rules && c.waterbody.rules.length) ? c.waterbody.rules : (c.general_rules || []);
      var extra = rules.length > 6 ? '<div style="font-size:12px;color:#5c6b5f;margin-top:6px">+' + (rules.length - 6) + ' ' + esc(T.regMore) + '</div>' : '';
      var html = '<div class="scout-bubble scout-bubble-ai" style="max-width:none;width:100%;border-left:4px solid #305e3c">' +
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#305e3c">📋 ' + esc(T.regTitle) + ' — Zone ' + esc(c.zone.id) + (c.waterbody ? ' · ' + esc(c.waterbody.name) : '') + '</div>' +
        ruleRows(rules, 6) + extra +
        '<div style="font-size:12px;color:#5c6b5f;margin-top:10px;border-top:1px solid rgba(48,94,60,.12);padding-top:8px">' +
          '<a href="' + esc((c.waterbody && c.waterbody.source) || c.citation.source) + '" target="_blank" rel="noopener noreferrer" style="color:#305e3c;text-decoration:underline">' + esc(T.regSrc) + '</a>' +
          ' · ' + esc(T.regFetched) + ' ' + esc(c.citation.fetched_at) +
          ' · <a href="' + zoneHref + '" style="color:#305e3c;text-decoration:underline">' + esc(T.regZonePage) + '</a>' +
          '<div style="margin-top:4px">' + esc(c.disclaimer || '') + '</div>' +
        '</div>' +
      '</div>';
      bubble('ai', html);
    });
  }

  function send(text) {
    if (busy || !text.trim()) return;
    busy = true;
    userMsg(text);
    history.push({ role: 'user', content: text });
    input.value = '';
    var typer = typing();
    var payload = { messages: history };
    if (window.__scoutOrigin) payload.origin = window.__scoutOrigin;

    fetch('/api/scout/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (res) {
        typer.remove();
        var d = res.d || {};
        if (res.status === 503) { aiText(T.warmup); busy = false; return; }
        if (!d.ok) { aiText(d.error || T.err); busy = false; return; }
        if (d.type === 'plan' && d.plan) {
          renderPlan(d.plan, d.addParam || '');
          history.push({ role: 'assistant', content: d.plan.summary || d.plan.title || 'Here is a plan.' });
        } else {
          aiText(d.reply || '');
          history.push({ role: 'assistant', content: d.reply || '' });
        }
        if (d.regulations && d.regulations.length) renderRegs(d.regulations);
        busy = false;
      })
      .catch(function () { typer.remove(); aiText(T.err); busy = false; });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });

  document.querySelectorAll('.scout-example').forEach(function (b) {
    b.addEventListener('click', function () { send(b.textContent.trim()); });
  });

  // Optional: use geolocation when the user asks for "near me"
  var geoBtn = document.getElementById('scout-geo');
  if (geoBtn) geoBtn.addEventListener('click', function () {
    if (!navigator.geolocation) return;
    geoBtn.textContent = FR ? 'Localisation…' : 'Locating…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      window.__scoutOrigin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      geoBtn.textContent = FR ? '📍 Position activée' : '📍 Location on';
      geoBtn.classList.add('scout-geo-on');
    }, function () { geoBtn.textContent = FR ? 'Localisation indisponible' : 'Location unavailable'; });
  });

  input.setAttribute('placeholder', T.placeholder);
})();
