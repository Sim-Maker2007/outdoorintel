// LandLink shared utilities

/**
 * Escape HTML to prevent XSS in template literals.
 * Use this on ALL user-generated content before inserting into innerHTML.
 */
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a date string (YYYY-MM-DD) for display.
 */
export function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Relative time (e.g. "3 hours ago", "2 days ago").
 */
export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso.slice(0, 10));
}

/**
 * Simple toast notification (injects itself into the DOM).
 */
export function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `ll-toast ll-toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

/**
 * Simple confirmation modal. Returns a promise that resolves true/false.
 */
export function confirm(title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'll-modal-overlay';
    overlay.innerHTML = `
      <div class="ll-modal">
        <h3>${esc(title)}</h3>
        <p>${esc(body)}</p>
        <div class="ll-modal-actions">
          <button class="ll-btn-ghost" data-action="cancel">${esc(cancelLabel)}</button>
          <button class="ll-btn-accent" data-action="confirm">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    overlay.addEventListener('click', e => {
      const action = e.target.dataset.action;
      if (action === 'confirm' || action === 'cancel') {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(action === 'confirm');
      }
    });
  });
}
