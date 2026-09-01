// Season Intel thanks page: confirm Stripe session and set member cookie.
// Public regs stay visible either way — this never paywalls zone/FMZ pages.
(function () {
  var statusEl = document.getElementById('si-thanks-status');
  var perkEl = document.querySelector('[data-perk-member]');
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('session_id') || '';

  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function applyPerk(isMember) {
    if (!perkEl) return;
    perkEl.textContent = isMember
      ? (perkEl.getAttribute('data-perk-member') || perkEl.textContent)
      : (perkEl.getAttribute('data-perk-guest') || perkEl.textContent);
  }

  if (!sessionId) {
    say('');
    applyPerk(false);
    return;
  }

  fetch('/api/stripe/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId })
  }).then(function (r) {
    return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
  }).then(function (res) {
    if (res.status === 503) {
      say('');
      applyPerk(false);
      return;
    }
    if (res.ok && res.body && res.body.member) {
      say('');
      applyPerk(true);
      return;
    }
    say('');
    applyPerk(false);
  }).catch(function () {
    say('');
    applyPerk(false);
  });
})();
