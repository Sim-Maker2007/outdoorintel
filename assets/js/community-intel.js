/*!
 * Outdoor Intel — Community Intel (Phase 1)
 * Structured trip reports, photos, helpful votes, flags, and corrections.
 * Renders into <div id="ci-root" data-activity data-spot data-lang>.
 *
 * Reads: Supabase anon client against the public views spot_reports_public /
 * spot_recent_intel. Writes: POST to /api/reports/* and /api/corrections/*
 * (server-gated). Photos pass a client-side NSFW classifier before upload.
 */
(function () {
  'use strict';

  var SB_URL = 'https://vbvsgwiyzjsmxawxyisn.supabase.co';
  var SB_ANON = 'sb_publishable_yZO5NfffLzXGjnFN9TyagQ_rgjRcF00';
  var PHOTO_BUCKET = 'spot-photos';
  var MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

  var root = document.getElementById('ci-root');
  if (!root) return;
  var ACT = root.getAttribute('data-activity') || 'fishing';
  var SPOT = root.getAttribute('data-spot') || '';
  var LANG = (root.getAttribute('data-lang') === 'fr') ? 'fr' : 'en';

  // ---------------------------------------------------------------- i18n ----
  var T = {
    en: {
      heading: 'Community Intel',
      sub: 'Real reports from people who’ve been to ' + (root.getAttribute('data-name') || 'this spot') + '. Fresh beats generic.',
      recent: 'Recent Intel', reports: 'reports', photos: 'photos', noReports: 'No reports yet',
      beFirst: 'Be the first scout to report conditions here — help everyone who plans a trip after you.',
      lastReport: 'Latest report', lastPhoto: 'Latest photo', noneYet: '—',
      addReport: 'Add your report', share: 'Share what you found',
      name: 'Your name (optional)', namePh: 'e.g. Sarah M.',
      visit: 'When did you visit?', visitPh: 'e.g. July 2026',
      conditions: 'Conditions you saw', parking: 'Parking', crowd: 'Crowds', signal: 'Cell signal',
      wildlife: 'Wildlife seen (optional)', wildlifePh: 'e.g. two moose, lots of loons',
      report: 'Your report', reportPh: 'Access, trail, water, bugs, fishing/hunting, hazards, tips…',
      photo: 'Add a photo (optional)', photoCaption: 'Photo caption (optional)', photoCaptionPh: 'e.g. Boat launch, 8 AM',
      post: 'Post report', posting: 'Posting…', checkingPhoto: 'Checking photo…', uploading: 'Uploading photo…',
      thanks: 'Thanks — your report is live and helping others.',
      errPost: 'Could not post. Please try again.', errShort: 'Please write a bit more.',
      helpful: 'Helpful', helpfulDone: 'Marked helpful', flag: 'Report', flagged: 'Reported',
      flagTitle: 'Report this content', flagWhy: 'Why are you reporting it?',
      fNsfw: 'Explicit / NSFW image', fSpam: 'Spam or advertising', fOff: 'Offensive', fInacc: 'Inaccurate', fOther: 'Other',
      submit: 'Submit', cancel: 'Cancel',
      photoTooBig: 'Photo is too large (max 8 MB).', photoBadType: 'Please choose an image file.',
      photoBlocked: 'That image looks explicit and was blocked. Please choose another.',
      photoCheckUnavail: 'Photo checks aren’t available right now — you can still post your report without a photo.',
      suggestFix: 'Suggest a correction', correctTitle: 'Suggest a correction',
      correctIntro: 'Spotted something wrong or out of date? Help us keep this page accurate.',
      whichField: 'What’s wrong?', fldAccess: 'Directions / access', fldParking: 'Parking', fldRegs: 'Regulations',
      fldSafety: 'Safety', fldServices: 'Nearby services', fldClosure: 'Closure / fire ban', fldOther: 'Other',
      details: 'What should it say?', detailsPh: 'Describe the correction…', sourceUrl: 'Source link (optional)',
      correctThanks: 'Thanks — sent to our editors for review.',
      loading: 'Loading community intel…', ago: {just: 'just now', m: 'm ago', h: 'h ago', d: 'd ago'},
      tags: {
        parking_full: '🅿️ Parking full', parking_ok: '🅿️ Parking OK', bugs_heavy: '🦟 Bugs heavy',
        bugs_light: '🦟 Bugs light', trail_dry: '🥾 Trail dry', trail_muddy: '🥾 Trail muddy',
        water_high: '🌊 Water high', water_low: '🌊 Water low', ice_unsafe: '🧊 Ice unsafe',
        ice_good: '🧊 Ice good', snow_deep: '❄️ Deep snow', crowded: '👥 Crowded', quiet: '🌲 Quiet',
        closure: '🚧 Closure', fire_ban: '🔥 Fire ban', poor_signal: '📵 Weak signal',
        good_fishing: '🎣 Good fishing', slow_fishing: '🎣 Slow fishing', wildlife_active: '🦌 Wildlife active'
      },
      parkOpts: {empty: 'Empty', some: 'Some space', full: 'Full', unknown: '—'},
      crowdOpts: {quiet: 'Quiet', moderate: 'Moderate', busy: 'Busy', unknown: '—'},
      sigOpts: {none: 'None', weak: 'Weak', ok: 'OK', good: 'Good', unknown: '—'}
    },
    fr: {
      heading: 'Intel communautaire',
      sub: 'De vrais rapports de gens qui y sont allés. Le frais bat le générique.',
      recent: 'Intel récent', reports: 'rapports', photos: 'photos', noReports: 'Aucun rapport',
      beFirst: 'Soyez le premier à rapporter les conditions ici — aidez tous ceux qui viendront après vous.',
      lastReport: 'Dernier rapport', lastPhoto: 'Dernière photo', noneYet: '—',
      addReport: 'Ajoutez votre rapport', share: 'Partagez ce que vous avez vu',
      name: 'Votre nom (optionnel)', namePh: 'p. ex. Sarah M.',
      visit: 'Quand y êtes-vous allé?', visitPh: 'p. ex. juillet 2026',
      conditions: 'Conditions observées', parking: 'Stationnement', crowd: 'Affluence', signal: 'Signal cellulaire',
      wildlife: 'Faune observée (optionnel)', wildlifePh: 'p. ex. deux orignaux',
      report: 'Votre rapport', reportPh: 'Accès, sentier, eau, insectes, pêche/chasse, dangers, conseils…',
      photo: 'Ajouter une photo (optionnel)', photoCaption: 'Légende (optionnel)', photoCaptionPh: 'p. ex. Rampe, 8 h',
      post: 'Publier', posting: 'Publication…', checkingPhoto: 'Vérification de la photo…', uploading: 'Téléversement…',
      thanks: 'Merci — votre rapport est en ligne.',
      errPost: 'Échec de la publication. Réessayez.', errShort: 'Écrivez un peu plus.',
      helpful: 'Utile', helpfulDone: 'Marqué utile', flag: 'Signaler', flagged: 'Signalé',
      flagTitle: 'Signaler ce contenu', flagWhy: 'Pourquoi le signalez-vous?',
      fNsfw: 'Image explicite', fSpam: 'Pourriel / publicité', fOff: 'Offensant', fInacc: 'Inexact', fOther: 'Autre',
      submit: 'Envoyer', cancel: 'Annuler',
      photoTooBig: 'Photo trop grande (max 8 Mo).', photoBadType: 'Choisissez une image.',
      photoBlocked: 'Cette image semble explicite et a été bloquée. Choisissez-en une autre.',
      photoCheckUnavail: 'La vérification des photos est indisponible — publiez votre rapport sans photo pour l’instant.',
      suggestFix: 'Suggérer une correction', correctTitle: 'Suggérer une correction',
      correctIntro: 'Une erreur ou une info périmée? Aidez-nous à garder cette page exacte.',
      whichField: 'Quoi corriger?', fldAccess: 'Accès / directions', fldParking: 'Stationnement', fldRegs: 'Règlements',
      fldSafety: 'Sécurité', fldServices: 'Services à proximité', fldClosure: 'Fermeture / feu', fldOther: 'Autre',
      details: 'Que devrait-on lire?', detailsPh: 'Décrivez la correction…', sourceUrl: 'Lien source (optionnel)',
      correctThanks: 'Merci — transmis à nos éditeurs.',
      loading: 'Chargement…', ago: {just: 'à l’instant', m: ' min', h: ' h', d: ' j'},
      tags: {
        parking_full: '🅿️ Stationnement plein', parking_ok: '🅿️ Stationnement OK', bugs_heavy: '🦟 Beaucoup d’insectes',
        bugs_light: '🦟 Peu d’insectes', trail_dry: '🥾 Sentier sec', trail_muddy: '🥾 Sentier boueux',
        water_high: '🌊 Eau haute', water_low: '🌊 Eau basse', ice_unsafe: '🧊 Glace non sécuritaire',
        ice_good: '🧊 Bonne glace', snow_deep: '❄️ Neige épaisse', crowded: '👥 Achalandé', quiet: '🌲 Tranquille',
        closure: '🚧 Fermeture', fire_ban: '🔥 Interdiction de feu', poor_signal: '📵 Signal faible',
        good_fishing: '🎣 Bonne pêche', slow_fishing: '🎣 Pêche lente', wildlife_active: '🦌 Faune active'
      },
      parkOpts: {empty: 'Vide', some: 'Un peu', full: 'Plein', unknown: '—'},
      crowdOpts: {quiet: 'Tranquille', moderate: 'Modéré', busy: 'Achalandé', unknown: '—'},
      sigOpts: {none: 'Aucun', weak: 'Faible', ok: 'Correct', good: 'Bon', unknown: '—'}
    }
  }[LANG];

  var TAG_KEYS = Object.keys(T.tags);

  // ------------------------------------------------------------- helpers ----
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
  }
  function timeAgo(d) {
    var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return T.ago.just;
    var m = Math.floor(s / 60); if (m < 60) return m + T.ago.m;
    var h = Math.floor(m / 60); if (h < 24) return h + T.ago.h;
    var dy = Math.floor(h / 24); if (dy < 30) return dy + T.ago.d;
    return new Date(d).toLocaleDateString(LANG, {year: 'numeric', month: 'short', day: 'numeric'});
  }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function lsKey(k) { return 'ci_' + ACT + '_' + SPOT + '_' + k; }
  async function api(path, body) {
    var r = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    var j = null; try { j = await r.json(); } catch (e) {}
    return {ok: r.ok, status: r.status, data: j || {}};
  }

  // Ensure the Supabase UMD client is available.
  function ensureSupabase() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () { resolve(window.supabase); };
      s.onerror = function () { reject(new Error('supabase load failed')); };
      document.head.appendChild(s);
    });
  }

  // ------------------------------------------------- NSFW image classifier ---
  var _nsfwModel = null, _nsfwFailed = false;
  async function getNsfwModel() {
    if (_nsfwModel) return _nsfwModel;
    if (_nsfwFailed) return null;
    try {
      await import('https://esm.sh/@tensorflow/tfjs@4');
      var nsfwjs = await import('https://esm.sh/nsfwjs@4');
      _nsfwModel = await (nsfwjs.load ? nsfwjs.load() : nsfwjs.default.load());
      return _nsfwModel;
    } catch (e) {
      _nsfwFailed = true;
      return null;
    }
  }
  // Returns {ok:true} | {ok:false, blocked:true} | {ok:false, unavailable:true}
  async function screenImage(file) {
    var model = await getNsfwModel();
    if (!model) return {ok: false, unavailable: true};
    var url = URL.createObjectURL(file);
    try {
      var img = await new Promise(function (res, rej) {
        var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = url;
      });
      var preds = await model.classify(img);
      var score = {};
      preds.forEach(function (p) { score[p.className] = p.probability; });
      var explicit = (score.Porn || 0) + (score.Hentai || 0);
      if (explicit > 0.5 || (score.Sexy || 0) > 0.85) return {ok: false, blocked: true};
      return {ok: true};
    } catch (e) {
      return {ok: false, unavailable: true};
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // --------------------------------------------------------------- state ----
  var sb = null;
  var pendingPhotoUrl = null;   // set after a successful gated upload
  var selectedTags = {};

  // --------------------------------------------------------------- render ---
  root.innerHTML =
    '<div class="max-w-4xl mx-auto">' +
      '<div class="flex items-center gap-2 mb-1"><span class="text-xs font-bold uppercase tracking-wider text-[#c97c5e]">' + esc(T.heading) + '</span>' +
      '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#c97c5e]/10 text-[#c97c5e] font-semibold">' + esc(LANG === 'fr' ? 'Généré par la communauté' : 'Community-sourced') + '</span></div>' +
      '<p class="text-[#6b6359] mb-6">' + esc(T.sub) + '</p>' +
      '<div id="ci-recent" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"></div>' +
      '<div id="ci-add"></div>' +
      '<div id="ci-list" class="mt-8"><div class="text-center py-8 text-[#6b6359]">' + esc(T.loading) + '</div></div>' +
      '<div class="mt-6 text-center"><button id="ci-correct-open" class="text-sm font-semibold text-[#2d5a3d] underline decoration-dotted hover:text-[#c97c5e]">✎ ' + esc(T.suggestFix) + '</button></div>' +
    '</div>';

  function statTile(label, value, sub) {
    return '<div class="bg-[#fef9f3] rounded-xl p-4 text-center">' +
      '<div class="text-2xl font-bold text-[#2d5a3d]">' + esc(value) + '</div>' +
      '<div class="text-xs font-semibold text-[#3e3127] mt-1">' + esc(label) + '</div>' +
      (sub ? '<div class="text-[11px] text-[#6b6359] mt-0.5">' + esc(sub) + '</div>' : '') + '</div>';
  }

  function renderRecent(intel) {
    var wrap = document.getElementById('ci-recent');
    var rc = intel && intel.report_count || 0;
    var pc = intel && intel.photo_count || 0;
    wrap.innerHTML =
      statTile(T.reports, rc, '') +
      statTile(T.photos, pc, '') +
      statTile(T.lastReport, intel && intel.last_report_at ? timeAgo(intel.last_report_at) : T.noneYet, '') +
      statTile(T.lastPhoto, intel && intel.last_photo_at ? timeAgo(intel.last_photo_at) : T.noneYet, '');
  }

  function tagChip(key, active) {
    return '<button type="button" data-tag="' + key + '" class="ci-tag px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ' +
      (active ? 'bg-[#2d5a3d] text-white border-[#2d5a3d]' : 'bg-white text-[#3e3127] border-[#2d5a3d]/25 hover:border-[#2d5a3d]') + '">' +
      esc(T.tags[key]) + '</button>';
  }

  function selectRow(id, label, opts) {
    var o = Object.keys(opts).map(function (k) { return '<option value="' + k + '">' + esc(opts[k]) + '</option>'; }).join('');
    return '<div><label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(label) + '</label>' +
      '<select id="' + id + '" class="w-full px-3 py-2 rounded-lg border border-[#2d5a3d]/20 bg-white text-[#3e3127] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40">' + o + '</select></div>';
  }

  function renderForm() {
    var host = document.getElementById('ci-add');
    host.innerHTML =
      '<form id="ci-form" class="bg-[#fef9f3] rounded-xl p-6" style="box-shadow:0 4px 12px rgba(62,49,39,0.08)">' +
        '<h3 class="text-lg font-bold text-[#2d5a3d] mb-1">' + esc(T.addReport) + '</h3>' +
        '<p class="text-sm text-[#6b6359] mb-4">' + esc(T.share) + '</p>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">' +
          '<div><label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(T.name) + '</label>' +
            '<input id="ci-name" type="text" placeholder="' + esc(T.namePh) + '" class="w-full px-3 py-2 rounded-lg border border-[#2d5a3d]/20 bg-white text-[#3e3127] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40"></div>' +
          '<div><label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(T.visit) + '</label>' +
            '<input id="ci-visit" type="text" placeholder="' + esc(T.visitPh) + '" class="w-full px-3 py-2 rounded-lg border border-[#2d5a3d]/20 bg-white text-[#3e3127] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40"></div>' +
        '</div>' +
        '<label class="block text-xs font-semibold text-[#2d5a3d] mb-2">' + esc(T.conditions) + '</label>' +
        '<div id="ci-tags" class="flex flex-wrap gap-2 mb-4">' + TAG_KEYS.map(function (k) { return tagChip(k, false); }).join('') + '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">' +
          selectRow('ci-parking', T.parking, T.parkOpts) +
          selectRow('ci-crowd', T.crowd, T.crowdOpts) +
          selectRow('ci-signal', T.signal, T.sigOpts) +
        '</div>' +
        '<div class="mb-4"><label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(T.wildlife) + '</label>' +
          '<input id="ci-wildlife" type="text" placeholder="' + esc(T.wildlifePh) + '" class="w-full px-3 py-2 rounded-lg border border-[#2d5a3d]/20 bg-white text-[#3e3127] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40"></div>' +
        '<div class="mb-4"><label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(T.report) + '</label>' +
          '<textarea id="ci-body" rows="4" required placeholder="' + esc(T.reportPh) + '" class="w-full px-3 py-2 rounded-lg border border-[#2d5a3d]/20 bg-white text-[#3e3127] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40 resize-none"></textarea></div>' +
        '<div class="mb-4">' +
          '<label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(T.photo) + '</label>' +
          '<input id="ci-photo" type="file" accept="image/*" class="block w-full text-sm text-[#3e3127] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#2d5a3d] file:text-white file:text-sm file:font-semibold hover:file:bg-[#c97c5e] file:cursor-pointer">' +
          '<div id="ci-photo-status" class="text-xs mt-2 hidden"></div>' +
          '<div id="ci-photo-preview" class="mt-3 hidden"><img class="rounded-lg max-h-40" alt=""></div>' +
          '<input id="ci-photo-caption" type="text" placeholder="' + esc(T.photoCaptionPh) + '" class="mt-2 w-full px-3 py-2 rounded-lg border border-[#2d5a3d]/20 bg-white text-[#3e3127] text-sm hidden focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/40">' +
        '</div>' +
        // honeypot
        '<div style="position:absolute;left:-5000px" aria-hidden="true"><input id="ci-hp" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<button type="submit" id="ci-submit" class="bg-[#2d5a3d] text-white px-8 py-3 font-semibold rounded-lg hover:bg-[#c97c5e] transition-colors">' + esc(T.post) + '</button>' +
        '<div id="ci-msg" class="mt-3 text-sm font-semibold hidden"></div>' +
      '</form>';

    // tag toggles
    host.querySelectorAll('.ci-tag').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-tag');
        selectedTags[k] = !selectedTags[k];
        btn.className = 'ci-tag px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ' +
          (selectedTags[k] ? 'bg-[#2d5a3d] text-white border-[#2d5a3d]' : 'bg-white text-[#3e3127] border-[#2d5a3d]/25 hover:border-[#2d5a3d]');
      });
    });

    document.getElementById('ci-photo').addEventListener('change', onPhotoPick);
    document.getElementById('ci-form').addEventListener('submit', onSubmit);
  }

  function photoStatus(msg, kind) {
    var s = document.getElementById('ci-photo-status');
    s.textContent = msg;
    s.className = 'text-xs mt-2 ' + (kind === 'err' ? 'text-red-600' : kind === 'ok' ? 'text-[#2d5a3d]' : 'text-[#6b6359]');
    s.classList.remove('hidden');
  }

  async function onPhotoPick(e) {
    pendingPhotoUrl = null;
    var file = e.target.files && e.target.files[0];
    var preview = document.getElementById('ci-photo-preview');
    var capField = document.getElementById('ci-photo-caption');
    preview.classList.add('hidden'); capField.classList.add('hidden');
    if (!file) { document.getElementById('ci-photo-status').classList.add('hidden'); return; }
    if (!/^image\//.test(file.type)) { photoStatus(T.photoBadType, 'err'); e.target.value = ''; return; }
    if (file.size > MAX_PHOTO_BYTES) { photoStatus(T.photoTooBig, 'err'); e.target.value = ''; return; }

    photoStatus(T.checkingPhoto, 'info');
    var check = await screenImage(file);
    if (check.blocked) { photoStatus(T.photoBlocked, 'err'); e.target.value = ''; return; }
    if (check.unavailable) { photoStatus(T.photoCheckUnavail, 'err'); e.target.value = ''; return; }

    // upload to storage
    photoStatus(T.uploading, 'info');
    try {
      if (!sb) sb = window.supabase.createClient(SB_URL, SB_ANON);
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
      var path = ACT + '/' + SPOT + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      var up = await sb.storage.from(PHOTO_BUCKET).upload(path, file, {contentType: file.type, upsert: false});
      if (up.error) throw up.error;
      pendingPhotoUrl = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      var img = preview.querySelector('img'); img.src = pendingPhotoUrl;
      preview.classList.remove('hidden'); capField.classList.remove('hidden');
      photoStatus('✓', 'ok');
      document.getElementById('ci-photo-status').classList.add('hidden');
    } catch (err) {
      photoStatus(T.errPost, 'err'); pendingPhotoUrl = null;
    }
  }

  function msg(text, kind) {
    var m = document.getElementById('ci-msg');
    m.textContent = text;
    m.className = 'mt-3 text-sm font-semibold ' + (kind === 'err' ? 'text-red-600' : 'text-[#2d5a3d]');
    m.classList.remove('hidden');
    setTimeout(function () { m.classList.add('hidden'); }, 6000);
  }

  async function onSubmit(e) {
    e.preventDefault();
    var body = document.getElementById('ci-body').value.trim();
    if (body.length < 3) { msg(T.errShort, 'err'); return; }
    var btn = document.getElementById('ci-submit');
    btn.disabled = true; var label = btn.textContent; btn.textContent = T.posting;

    var payload = {
      activity: ACT, spot_slug: SPOT,
      author_name: document.getElementById('ci-name').value.trim(),
      visit_date: document.getElementById('ci-visit').value.trim(),
      body: body,
      condition_tags: Object.keys(selectedTags).filter(function (k) { return selectedTags[k]; }),
      wildlife: document.getElementById('ci-wildlife').value.trim(),
      parking_status: document.getElementById('ci-parking').value,
      crowding: document.getElementById('ci-crowd').value,
      cell_signal: document.getElementById('ci-signal').value,
      photo_url: pendingPhotoUrl,
      photo_caption: document.getElementById('ci-photo-caption').value.trim(),
      website_url: document.getElementById('ci-hp').value // honeypot
    };

    var r = await api('/api/reports/create', payload);
    btn.disabled = false; btn.textContent = label;
    if (!r.ok) { msg(r.data.error || T.errPost, 'err'); return; }
    msg(T.thanks, 'ok');
    e.target.reset();
    selectedTags = {}; pendingPhotoUrl = null;
    document.getElementById('ci-photo-preview').classList.add('hidden');
    document.querySelectorAll('#ci-tags .ci-tag').forEach(function (b) {
      b.className = 'ci-tag px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors bg-white text-[#3e3127] border-[#2d5a3d]/25 hover:border-[#2d5a3d]';
    });
    load();
  }

  // --------------------------------------------------------- report cards ---
  function voted(id) { try { return localStorage.getItem(lsKey('v_' + id)) === '1'; } catch (e) { return false; } }
  function markVoted(id) { try { localStorage.setItem(lsKey('v_' + id), '1'); } catch (e) {} }

  function reportCard(c) {
    var tags = (c.condition_tags || []).map(function (k) {
      return '<span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2d5a3d]/8 text-[#2d5a3d]">' + esc(T.tags[k] || k) + '</span>';
    }).join(' ');
    var meta = [];
    if (c.parking_status && c.parking_status !== 'unknown') meta.push(T.parking + ': ' + (T.parkOpts[c.parking_status] || c.parking_status));
    if (c.crowding && c.crowding !== 'unknown') meta.push(T.crowd + ': ' + (T.crowdOpts[c.crowding] || c.crowding));
    if (c.cell_signal && c.cell_signal !== 'unknown') meta.push(T.signal + ': ' + (T.sigOpts[c.cell_signal] || c.cell_signal));
    var photo = c.photo_url ? '<a href="' + esc(c.photo_url) + '" target="_blank" rel="noopener" class="block mt-3">' +
      '<img src="' + esc(c.photo_url) + '" loading="lazy" alt="' + esc(c.photo_caption || '') + '" class="rounded-lg max-h-56 w-full object-cover">' +
      (c.photo_caption ? '<span class="block text-xs text-[#6b6359] mt-1">' + esc(c.photo_caption) + '</span>' : '') + '</a>' : '';
    var vd = c.visit_date ? ' <span class="text-[#c97c5e]">• ' + esc(c.visit_date) + '</span>' : '';
    var didVote = voted(c.id);

    return '<div class="border-b border-[#2d5a3d]/10 py-6" data-report="' + esc(c.id) + '">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="font-bold text-[#2d5a3d]">' + esc(c.author_name || (LANG === 'fr' ? 'Scout anonyme' : 'Anonymous scout')) + vd + '</div>' +
        '<div class="text-xs text-[#6b6359]">' + esc(timeAgo(c.created_at)) + '</div></div>' +
      (tags ? '<div class="flex flex-wrap gap-1.5 mb-3">' + tags + '</div>' : '') +
      '<p class="text-[#3e3127] leading-relaxed whitespace-pre-line">' + esc(c.body) + '</p>' +
      (c.wildlife ? '<p class="text-sm text-[#6b6359] mt-2">🦌 ' + esc(c.wildlife) + '</p>' : '') +
      (meta.length ? '<p class="text-xs text-[#6b6359] mt-2">' + esc(meta.join('  ·  ')) + '</p>' : '') +
      photo +
      '<div class="flex items-center gap-4 mt-3">' +
        '<button class="ci-helpful text-sm font-semibold ' + (didVote ? 'text-[#2d5a3d] cursor-default' : 'text-[#6b6359] hover:text-[#2d5a3d]') + '" data-id="' + esc(c.id) + '"' + (didVote ? ' disabled' : '') + '>' +
          '👍 <span class="ci-help-label">' + esc(didVote ? T.helpfulDone : T.helpful) + '</span> <span class="ci-help-count">' + (c.helpful_count ? '(' + c.helpful_count + ')' : '') + '</span></button>' +
        '<button class="ci-flag text-xs text-[#6b6359]/70 hover:text-red-600" data-id="' + esc(c.id) + '">⚑ ' + esc(T.flag) + '</button>' +
      '</div></div>';
  }

  function bindCardActions() {
    document.querySelectorAll('.ci-helpful').forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener('click', async function () {
        var id = b.getAttribute('data-id');
        if (voted(id)) return;
        b.disabled = true;
        var r = await api('/api/reports/vote', {report_id: id});
        if (r.ok) {
          markVoted(id);
          b.classList.remove('text-[#6b6359]'); b.classList.add('text-[#2d5a3d]', 'cursor-default');
          b.querySelector('.ci-help-label').textContent = T.helpfulDone;
          if (r.data.helpful_count) b.querySelector('.ci-help-count').textContent = '(' + r.data.helpful_count + ')';
        } else { b.disabled = false; }
      });
    });
    document.querySelectorAll('.ci-flag').forEach(function (b) {
      b.addEventListener('click', function () { openFlag(b.getAttribute('data-id')); });
    });
  }

  // --------------------------------------------------------------- modals ---
  function modal(inner) {
    var overlay = el('<div class="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4"></div>');
    var box = el('<div class="bg-white rounded-2xl w-full max-w-md p-6" style="box-shadow:0 25px 50px rgba(0,0,0,.25)"></div>');
    box.innerHTML = inner; overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
    return {overlay: overlay, box: box, close: function () { if (overlay.parentNode) document.body.removeChild(overlay); }};
  }

  function openFlag(id) {
    if (voted('flag_' + id)) return;
    var reasons = [['nsfw', T.fNsfw], ['spam', T.fSpam], ['offensive', T.fOff], ['inaccurate', T.fInacc], ['other', T.fOther]];
    var m = modal(
      '<h3 class="text-lg font-bold text-[#2d5a3d] mb-1">' + esc(T.flagTitle) + '</h3>' +
      '<p class="text-sm text-[#6b6359] mb-4">' + esc(T.flagWhy) + '</p>' +
      '<div class="space-y-2 mb-4">' + reasons.map(function (r) {
        return '<label class="flex items-center gap-2 text-sm text-[#3e3127]"><input type="radio" name="ci-fr" value="' + r[0] + '"> ' + esc(r[1]) + '</label>';
      }).join('') + '</div>' +
      '<div class="flex gap-3"><button id="ci-fx-submit" class="bg-[#2d5a3d] text-white px-5 py-2 rounded-lg font-semibold text-sm">' + esc(T.submit) + '</button>' +
      '<button id="ci-fx-cancel" class="px-5 py-2 rounded-lg text-sm text-[#6b6359]">' + esc(T.cancel) + '</button></div>');
    m.box.querySelector('#ci-fx-cancel').addEventListener('click', m.close);
    m.box.querySelector('#ci-fx-submit').addEventListener('click', async function () {
      var sel = m.box.querySelector('input[name="ci-fr"]:checked');
      if (!sel) return;
      await api('/api/reports/flag', {report_id: id, reason: sel.value});
      try { localStorage.setItem(lsKey('flag_' + id), '1'); } catch (e) {}
      m.close();
    });
  }

  function openCorrect() {
    var fields = [['getting_there', T.fldAccess], ['parking', T.fldParking], ['regulations', T.fldRegs],
      ['safety', T.fldSafety], ['nearby_services', T.fldServices], ['closure', T.fldClosure], ['other', T.fldOther]];
    var m = modal(
      '<h3 class="text-lg font-bold text-[#2d5a3d] mb-1">' + esc(T.correctTitle) + '</h3>' +
      '<p class="text-sm text-[#6b6359] mb-4">' + esc(T.correctIntro) + '</p>' +
      '<label class="block text-xs font-semibold text-[#2d5a3d] mb-1">' + esc(T.whichField) + '</label>' +
      '<select id="ci-cf-field" class="w-full mb-3 px-3 py-2 rounded-lg border border-[#2d5a3d]/20 text-sm">' +
        fields.map(function (f) { return '<option value="' + f[0] + '">' + esc(f[1]) + '</option>'; }).join('') + '</select>' +
      '<textarea id="ci-cf-text" rows="4" placeholder="' + esc(T.detailsPh) + '" class="w-full mb-3 px-3 py-2 rounded-lg border border-[#2d5a3d]/20 text-sm resize-none"></textarea>' +
      '<input id="ci-cf-src" type="url" placeholder="' + esc(T.sourceUrl) + '" class="w-full mb-3 px-3 py-2 rounded-lg border border-[#2d5a3d]/20 text-sm">' +
      '<div style="position:absolute;left:-5000px" aria-hidden="true"><input id="ci-cf-hp" tabindex="-1" autocomplete="off"></div>' +
      '<div id="ci-cf-msg" class="text-sm font-semibold mb-2 hidden"></div>' +
      '<div class="flex gap-3"><button id="ci-cf-submit" class="bg-[#2d5a3d] text-white px-5 py-2 rounded-lg font-semibold text-sm">' + esc(T.submit) + '</button>' +
      '<button id="ci-cf-cancel" class="px-5 py-2 rounded-lg text-sm text-[#6b6359]">' + esc(T.cancel) + '</button></div>');
    m.box.querySelector('#ci-cf-cancel').addEventListener('click', m.close);
    m.box.querySelector('#ci-cf-submit').addEventListener('click', async function () {
      var text = m.box.querySelector('#ci-cf-text').value.trim();
      var cm = m.box.querySelector('#ci-cf-msg');
      if (text.length < 5) { cm.textContent = T.errShort; cm.className = 'text-sm font-semibold mb-2 text-red-600'; cm.classList.remove('hidden'); return; }
      var r = await api('/api/corrections/create', {
        activity: ACT, spot_slug: SPOT,
        field: m.box.querySelector('#ci-cf-field').value,
        suggestion: text,
        source_url: m.box.querySelector('#ci-cf-src').value.trim(),
        website_url: m.box.querySelector('#ci-cf-hp').value
      });
      if (r.ok) { cm.textContent = T.correctThanks; cm.className = 'text-sm font-semibold mb-2 text-[#2d5a3d]'; cm.classList.remove('hidden'); setTimeout(m.close, 1500); }
      else { cm.textContent = r.data.error || T.errPost; cm.className = 'text-sm font-semibold mb-2 text-red-600'; cm.classList.remove('hidden'); }
    });
  }

  // ----------------------------------------------------------------- load ---
  async function load() {
    var list = document.getElementById('ci-list');
    try {
      var intelRes = await sb.from('spot_recent_intel').select('*').eq('activity', ACT).eq('spot_slug', SPOT).maybeSingle();
      renderRecent(intelRes.data);
      var res = await sb.from('spot_reports_public').select('*').eq('activity', ACT).eq('spot_slug', SPOT)
        .order('created_at', {ascending: false}).limit(60);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        list.innerHTML = '<div class="text-center py-10 px-4 bg-[#fef9f3] rounded-xl">' +
          '<div class="text-3xl mb-2">🧭</div>' +
          '<div class="font-bold text-[#2d5a3d] mb-1">' + esc(T.noReports) + '</div>' +
          '<p class="text-sm text-[#6b6359] max-w-md mx-auto">' + esc(T.beFirst) + '</p></div>';
        return;
      }
      list.innerHTML = '<div class="text-sm text-[#6b6359] mb-2 font-semibold">' + rows.length + ' ' + esc(T.reports) + '</div>' +
        rows.map(reportCard).join('');
      bindCardActions();
    } catch (e) {
      list.innerHTML = '<div class="text-center py-8 text-[#6b6359]">' + esc(LANG === 'fr' ? 'Impossible de charger les rapports.' : 'Unable to load reports right now.') + '</div>';
    }
  }

  // ------------------------------------------------------------------ init --
  ensureSupabase().then(function () {
    sb = window.supabase.createClient(SB_URL, SB_ANON);
    renderForm();
    document.getElementById('ci-correct-open').addEventListener('click', openCorrect);
    load();
  }).catch(function () {
    document.getElementById('ci-list').innerHTML =
      '<div class="text-center py-8 text-[#6b6359]">' + esc(LANG === 'fr' ? 'Service communautaire indisponible.' : 'Community service unavailable.') + '</div>';
  });
})();
