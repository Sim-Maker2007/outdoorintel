// Season Intel landing: waitlist by default. When Stripe env is live,
// GET /api/stripe/checkout returns 200 and we swap in the subscribe CTA.
// Missing keys → 503 checkout_not_configured → leave waitlist in place.
(function () {
  var wait = document.getElementById('waitlist');
  var checkout = document.getElementById('checkout');
  var cancelled = document.getElementById('checkout-cancelled');
  var bottomCta = document.querySelector('.js-si-bottom-cta');
  var bottomWait = document.querySelector('.js-si-bottom-wait');
  var newsToggle = document.querySelector('.js-si-show-news');

  function show(el, on) {
    if (!el) return;
    if (on) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }

  function swapLive(on) {
    show(wait, !on);
    show(checkout, on);
    document.querySelectorAll('.js-si-badge-wait, .js-si-price-wait').forEach(function (el) {
      el.classList.toggle('hidden', on);
    });
    document.querySelectorAll('.js-si-badge-live, .js-si-price-live, .js-si-checkout-only').forEach(function (el) {
      el.classList.toggle('hidden', !on);
    });
    show(bottomCta, on);
    show(bottomWait, !on);
  }

  if (cancelled && /[?&]checkout=cancelled/.test(window.location.search)) {
    show(cancelled, true);
    cancelled.setAttribute('tabindex', '-1');
    try { cancelled.focus({ preventScroll: true }); } catch (e) {}
    if (typeof cancelled.scrollIntoView === 'function') {
      cancelled.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (newsToggle && wait) {
    newsToggle.addEventListener('click', function () {
      show(wait, true);
      wait.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var email = wait.querySelector('input[name=email]');
      if (email) email.focus();
    });
  }

  fetch('/api/stripe/checkout', { method: 'GET', headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
    .then(function (res) {
      if (res.ok && res.body && res.body.configured) swapLive(true);
      else swapLive(false);
    })
    .catch(function () { swapLive(false); });

  document.querySelectorAll('.js-season-checkout-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var lang = form.getAttribute('data-lang') === 'fr' ? 'fr' : 'en';
      var msgEl = form.parentElement.querySelector('.js-checkout-msg');
      var err = form.getAttribute('data-err-msg') || 'Checkout could not start.';
      var btn = form.querySelector('button[type=submit]');
      var email = (form.querySelector('input[name=email]') || {}).value || '';
      var honeypot = (form.querySelector('input[name=website]') || {}).value || '';
      var say = function (text, good) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.style.color = good ? '#2e5d3b' : '#b3452e';
      };
      if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
      fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, lang: lang, website: honeypot })
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
      }).then(function (res) {
        if (res.status === 503) {
          swapLive(false);
          return;
        }
        if (res.ok && res.body && res.body.url) {
          window.location.href = res.body.url;
          return;
        }
        say(err, false);
      }).catch(function () {
        say(err, false);
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      });
    });
  });
})();
