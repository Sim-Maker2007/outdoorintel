// Wires every .js-newsletter-form to POST /api/newsletter/subscribe.
// Shows inline success/error in the sibling .js-newsletter-msg element.
(function () {
  var MSG = {
    en: {
      ok: 'You’re in! Watch for the next issue.',
      invalid: 'That email doesn’t look right — try again?',
      err: 'Couldn’t subscribe right now. Please try again later.'
    },
    fr: {
      ok: 'C’est fait ! Surveillez le prochain numéro.',
      invalid: 'Ce courriel semble invalide — réessayez ?',
      err: 'Impossible de s’abonner pour le moment. Réessayez plus tard.'
    }
  };

  function attach(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var lang = form.getAttribute('data-lang') === 'fr' ? 'fr' : 'en';
      var msgEl = form.parentElement.querySelector('.js-newsletter-msg');
      var btn = form.querySelector('button[type=submit]');
      var email = (form.querySelector('input[name=email]') || {}).value || '';
      var honeypot = (form.querySelector('input[name=website]') || {}).value || '';
      var source = form.getAttribute('data-source') || window.location.pathname || 'site';
      var onDark = form.hasAttribute('data-on-dark') || !!form.closest('footer');
      var okMsg = form.getAttribute('data-ok-msg') || MSG[lang].ok;
      var say = function (text, good) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.style.color = good ? (onDark ? '#a2c99a' : '#2e5d3b') : (onDark ? '#e8b4a0' : '#b3452e');
      };
      if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
      fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          lang: lang,
          source: source,
          website: honeypot
        })
      }).then(function (r) {
        if (r.ok) { say(okMsg, true); form.reset(); }
        else if (r.status === 400) { say(MSG[lang].invalid, false); }
        else { say(MSG[lang].err, false); }
      }).catch(function () {
        say(MSG[lang].err, false);
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      });
    });
  }

  var forms = document.querySelectorAll('.js-newsletter-form');
  for (var i = 0; i < forms.length; i++) attach(forms[i]);
})();
