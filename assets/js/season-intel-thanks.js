// Season Intel thanks page: confirm Stripe session and set member cookie.
// Public regs stay visible either way — this never paywalls zone/FMZ pages.
(function () {
  var statusEl = document.getElementById('si-thanks-status');
  var perkEl = document.querySelector('[data-perk-member]');
  var badgeEl = document.querySelector('.js-si-thanks-badge');
  var h1El = document.querySelector('.js-si-thanks-h1');
  var subscribeEl = document.querySelector('.js-si-thanks-subscribe');
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('session_id') || '';

  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function applyText(el, isMember) {
    if (!el) return;
    var next = el.getAttribute(isMember ? 'data-member' : 'data-guest');
    if (next) el.textContent = next;
  }

  function applyPerk(isMember) {
    if (perkEl) {
      perkEl.textContent = isMember
        ? (perkEl.getAttribute('data-perk-member') || perkEl.textContent)
        : (perkEl.getAttribute('data-perk-guest') || perkEl.textContent);
    }
    applyText(badgeEl, isMember);
    applyText(h1El, isMember);
    if (subscribeEl) {
      if (isMember) {
        subscribeEl.classList.add('hidden');
        subscribeEl.style.display = 'none';
      } else {
        subscribeEl.classList.remove('hidden');
        subscribeEl.style.display = 'inline-block';
      }
    }
  }

  if (!sessionId) {
    say('');
    applyPerk(false);
    return;
  }

  say((statusEl && statusEl.getAttribute('data-pending')) || 'Confirming your Stripe checkout…');

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
