// Renders the shared LandLink header + footer. Call renderNav() after importing.
import { getCurrentUser, signOut } from './supabase-client.js';

const LANG = document.documentElement.lang === 'fr' ? 'fr' : 'en';
const BASE = `/${LANG}/landlink`;

const T = {
  en: {
    browse: 'Browse Land', listYourLand: 'List Your Land', howItWorks: 'How It Works',
    login: 'Log In', signup: 'Sign Up', dashboard: 'Dashboard', profile: 'Profile',
    logout: 'Log Out', trust: 'Trust & Safety', legal: 'Legal', lang: 'Français',
    tagline: 'Canada\u2019s marketplace for private hunting access.',
    copy: '\u00a9 2026 LandLink. Part of OutdoorIntel.'
  },
  fr: {
    browse: 'Parcourir les terres', listYourLand: 'Inscrire ma terre', howItWorks: 'Fonctionnement',
    login: 'Connexion', signup: 'S\u2019inscrire', dashboard: 'Tableau de bord', profile: 'Profil',
    logout: 'D\u00e9connexion', trust: 'Confiance et s\u00e9curit\u00e9', legal: 'L\u00e9gal', lang: 'English',
    tagline: 'Le march\u00e9 canadien d\u2019acc\u00e8s \u00e0 la chasse sur terres priv\u00e9es.',
    copy: '\u00a9 2026 LandLink. Partie d\u2019OutdoorIntel.'
  }
}[LANG];

const OTHER_LANG = LANG === 'en' ? 'fr' : 'en';
const OTHER = `/${OTHER_LANG}/landlink`;

export async function renderNav() {
  const user = await getCurrentUser();

  const header = document.createElement('header');
  header.id = 'll-nav';
  header.innerHTML = `
    <div class="ll-nav-inner">
      <a href="${BASE}/" class="ll-logo">
        <span class="ll-logo-mark">\u25B3</span>
        <span class="ll-logo-text">LandLink</span>
      </a>
      <nav class="ll-nav-links">
        <a href="${BASE}/parcels">${T.browse}</a>
        <a href="${BASE}/list-your-land">${T.listYourLand}</a>
        <a href="${BASE}/how-it-works">${T.howItWorks}</a>
      </nav>
      <div class="ll-nav-right">
        <a href="${OTHER}/" class="ll-lang">${T.lang}</a>
        ${user ? `
          <div class="ll-user-menu">
            <button id="ll-user-btn" aria-label="User menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <div class="ll-avatar">${(user.email || '?')[0].toUpperCase()}</div>
            </button>
            <div id="ll-user-drop" class="ll-dropdown hidden">
              <a href="${BASE}/dashboard">${T.dashboard}</a>
              <a href="${BASE}/profile">${T.profile}</a>
              <hr/>
              <a href="#" id="ll-logout">${T.logout}</a>
            </div>
          </div>
        ` : `
          <a href="${BASE}/login" class="ll-btn-ghost">${T.login}</a>
          <a href="${BASE}/signup" class="ll-btn">${T.signup}</a>
        `}
      </div>
    </div>
  `;
  document.body.prepend(header);

  // Dropdown behaviour
  const btn = document.getElementById('ll-user-btn');
  const drop = document.getElementById('ll-user-drop');
  if (btn) {
    btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('hidden'); });
    document.addEventListener('click', () => drop.classList.add('hidden'));
  }
  const logout = document.getElementById('ll-logout');
  if (logout) logout.addEventListener('click', e => { e.preventDefault(); signOut(); });

  // Footer
  const footer = document.createElement('footer');
  footer.id = 'll-footer';
  footer.innerHTML = `
    <div class="ll-footer-inner">
      <div class="ll-footer-col">
        <div class="ll-logo-text" style="color:#fff;font-weight:800;font-size:18px">LandLink</div>
        <p>${T.tagline}</p>
      </div>
      <div class="ll-footer-col">
        <a href="${BASE}/how-it-works">${T.howItWorks}</a>
        <a href="${BASE}/trust-safety">${T.trust}</a>
        <a href="${BASE}/legal">${T.legal}</a>
      </div>
      <div class="ll-footer-col">
        <a href="https://outdoorintel.ca" target="_blank" rel="noopener">OutdoorIntel</a>
        <a href="${OTHER}/">${T.lang}</a>
      </div>
    </div>
    <div class="ll-footer-copy">${T.copy}</div>
  `;
  document.body.appendChild(footer);
}
