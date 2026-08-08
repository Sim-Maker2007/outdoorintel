// Every activity- and language-dependent string on a spot page, extracted
// verbatim from the legacy generated HTML (see scripts/parity/baseline.json).
// The FR pages deliberately reuse some English strings (species chips, gear
// item labels, search overlay, weather error text) — that is current-site
// behavior, preserved for parity; the data-quality track closes FR gaps.

export const ACTIVITIES = ['fishing', 'hunting', 'camping', 'hiking', 'kayaking', 'skiing'];

// Order used by the site chrome (header dropdown, mobile menu, footer),
// which differs from the data-file order: hiking renders last.
export const NAV_ACTIVITIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];

export const ACTIVITY = {
  fishing: {
    icon: '🎣',
    title: { en: 'Fishing', fr: 'Pêche' },
    badge: { en: 'Fishing Scout Report', fr: 'Rapport de pêche' },
    cta: { en: 'All Fishing', fr: 'Tout Pêche' },
    chipsHeading: { en: 'Primary Species', fr: 'Espèces principales' },
    chipsField: 'primary_species',
    descNoun: { en: 'Fishing', fr: 'pêche' },
    altNoun: 'fishing',
    stats: [
      { field: 'depth_max', en: 'Max Depth', fr: 'Profondeur max' },
    ],
  },
  hunting: {
    icon: '🦌',
    title: { en: 'Hunting', fr: 'Chasse' },
    badge: { en: 'Hunting Scout Report', fr: 'Rapport de chasse' },
    cta: { en: 'All Hunting', fr: 'Tout Chasse' },
    chipsHeading: { en: 'Primary Game', fr: 'Gibier principal' },
    chipsField: 'primary_game',
    descNoun: { en: 'Hunting', fr: 'chasse' },
    altNoun: 'hunting',
    stats: [
      { field: 'season', en: 'Season', fr: 'Saison' },
      { field: 'difficulty', en: 'Difficulty', fr: 'Difficulté' },
    ],
  },
  camping: {
    icon: '⛺',
    title: { en: 'Camping', fr: 'Camping' },
    badge: { en: 'Camping Scout Report', fr: 'Rapport de camping' },
    cta: { en: 'All Camping', fr: 'Tout Camping' },
    chipsHeading: { en: 'Key Features', fr: 'Caractéristiques' },
    chipsField: 'features',
    descNoun: { en: 'Camping', fr: 'camping' },
    altNoun: 'camping',
    stats: [
      { field: 'season', en: 'Season', fr: 'Saison' },
      { field: 'difficulty', en: 'Difficulty', fr: 'Difficulté' },
      { field: 'sites_count', en: 'Sites', fr: 'Emplacements' },
    ],
  },
  hiking: {
    icon: '🥾',
    title: { en: 'Hiking', fr: 'Randonnée' },
    badge: { en: 'Hiking Scout Report', fr: 'Rapport de randonnée' },
    cta: { en: 'All Hiking', fr: 'Tout Randonnée' },
    chipsHeading: { en: 'Key Features', fr: 'Caractéristiques' },
    chipsField: 'features',
    descNoun: { en: 'Hiking', fr: 'randonnée' },
    altNoun: 'hiking',
    stats: [
      { field: 'distance', en: 'Distance', fr: 'Distance' },
      { field: 'elevation_gain', en: 'Elevation', fr: 'Dénivelé' },
      { field: 'difficulty', en: 'Difficulty', fr: 'Difficulté' },
    ],
  },
  kayaking: {
    icon: '🛶',
    title: { en: 'Kayaking', fr: 'Kayak' },
    badge: { en: 'Kayaking Scout Report', fr: 'Rapport de kayak' },
    cta: { en: 'All Kayaking', fr: 'Tout Kayak' },
    chipsHeading: { en: 'Key Features', fr: 'Caractéristiques' },
    chipsField: 'features',
    descNoun: { en: 'Kayaking', fr: 'kayak' },
    altNoun: 'kayaking',
    stats: [
      { field: 'distance', en: 'Distance', fr: 'Distance' },
      { field: 'difficulty', en: 'Difficulty', fr: 'Difficulté' },
      { field: 'season', en: 'Season', fr: 'Saison' },
    ],
  },
  skiing: {
    icon: '⛷️',
    title: { en: 'Skiing', fr: 'Ski' },
    badge: { en: 'Skiing Scout Report', fr: 'Rapport de ski' },
    cta: { en: 'All Skiing', fr: 'Tout Ski' },
    chipsHeading: { en: 'Key Features', fr: 'Caractéristiques' },
    chipsField: 'features',
    descNoun: { en: 'Skiing', fr: 'ski' },
    altNoun: 'skiing',
    stats: [
      { field: 'vertical_drop', en: 'Vertical Drop', fr: 'Dénivelé' },
      { field: 'difficulty', en: 'Difficulty', fr: 'Difficulté' },
      { field: 'season', en: 'Season', fr: 'Saison' },
    ],
  },
};

// Hero paragraph uses the FULL sentence; meta/og/twitter descriptions are the
// same text hard-truncated at 160 chars (legacy generator behavior).
export function fullDescription(spot, activity, lang) {
  const noun = ACTIVITY[activity].descNoun[lang];
  return lang === 'en'
    ? `Detailed scouting intelligence for ${spot.name}, ${spot.province}. ${noun} data, seasonal tips, terrain info, and expert guidance for Canadian outdoor adventures.`
    : `Renseignements de terrain pour ${spot.name}, ${spot.province}. Données ${noun}, conseils saisonniers, topographie et guide expert pour le plein air canadien.`;
}

export function metaDescription(spot, activity, lang) {
  return fullDescription(spot, activity, lang).slice(0, 160);
}

export function pageTitle(spot, activity, lang) {
  return `${spot.name} | ${ACTIVITY[activity].title[lang]} | Outdoor Intel`;
}

export function imageAlt(spot, activity) {
  return `${spot.name} - ${ACTIVITY[activity].altNoun} destination in ${spot.province}, Canada`;
}

export const T = {
  scoutLevel: { en: 'Scout Level', fr: 'Niveau' },
  officialWebsite: { en: 'Official Website', fr: 'Site officiel' },
  seasonalTips: { en: 'Seasonal Tips', fr: 'Conseils de saison' },
  expertIntel: { en: '— Expert Field Intelligence', fr: '— Renseignement de terrain expert' },
  about: { en: 'About This Place', fr: 'À propos de ce lieu' },
  locationMap: { en: 'Location Map', fr: 'Localisation' },
  fullMap: { en: 'View on full map →', fr: 'Voir sur la carte complète →' },
  gettingThere: { en: 'How to Get There', fr: "Comment s'y rendre" },
  parking: { en: 'Parking & Access', fr: 'Stationnement et accès' },
  weather: { en: 'Current Weather', fr: 'Météo actuelle' },
  weatherSub: { en: 'Live conditions via Open-Meteo', fr: 'Conditions en temps réel via Open-Meteo' },
  weatherLoading: { en: 'Loading weather data...', fr: 'Chargement de la météo...' },
  bestTime: { en: 'Best Time to Visit', fr: 'Meilleur moment pour visiter' },
  terrain: { en: 'Terrain & Topography', fr: 'Terrain et topographie' },
  regulations: { en: 'Regulations & Permits', fr: 'Réglements et permis' },
  nearbyServices: { en: 'Nearby Services', fr: 'Services à proximité' },
  whereToStay: { en: 'Where to Stay', fr: 'Où séjourner' },
  cellSafety: { en: 'Cell Coverage & Safety', fr: 'Couverture cellulaire et sécurité' },
  nearbySpots: { en: 'Nearby Spots', fr: 'Spots à proximité' },
  viewProfile: { en: 'View Profile →', fr: 'Voir le profil →' },
  packTitle: { en: 'Pack This:', fr: 'À emporter:' },
  packSub: {
    en: 'Your personalized packing checklist. Tap any item to find it on Amazon.',
    fr: 'Votre liste personnalisée. Cliquez sur un article pour le trouver sur Amazon.',
  },
  checkAll: { en: 'Check All', fr: 'Tout cocher' },
  uncheckAll: { en: 'Uncheck All', fr: 'Tout décocher' },
  print: { en: 'Print Checklist', fr: 'Imprimer la liste' },
  disclosureAffiliate: {
    en: 'As an Amazon Associate, Outdoor Intel earns from qualifying purchases.',
    fr: 'En tant que partenaire Amazon, Outdoor Intel touche une commission sur les achats admissibles.',
  },
  disclosureRetail: {
    en: 'Gear links point to Ecotone, our retail partner in Gatineau, Québec.',
    fr: 'Les liens d’équipement pointent vers Écotone, notre partenaire détaillant à Gatineau (Québec).',
  },
  ciLoading: { en: 'Loading community intel…', fr: 'Chargement de l’intel communautaire…' },
  breadcrumbHome: { en: 'Home', fr: 'Accueil' },
  nav: {
    explore: { en: 'Explore', fr: 'Explorer' },
    map: { en: 'Map', fr: 'Carte' },
    planner: { en: 'Trip Planner', fr: 'Planificateur' },
    blog: { en: 'Blog', fr: 'Blogue' },
    trust: { en: 'Trust & sources', fr: 'Confiance et sources' },
    otherLang: { en: 'Français', fr: 'English' },
  },
  footer: {
    blurb: {
      en: 'Sourced outdoor data for better trips across Canada. Every spot is verified and cited.',
      fr: 'Des données de plein air sourcées pour de meilleures sorties partout au Canada. Chaque site est vérifié et cité.',
    },
    newsTitle: { en: 'Weekly intel, free', fr: 'Intel hebdo, gratuit' },
    newsPlaceholder: { en: 'Your email', fr: 'Votre courriel' },
    newsBtn: { en: 'Subscribe', fr: 'S’abonner' },
    newsMsg: { en: 'One email a week. No spam.', fr: 'Un courriel par semaine. Pas de spam.' },
    explore: { en: 'Explore', fr: 'Explorer' },
    product: { en: 'Product', fr: 'Produit' },
    aboutCol: { en: 'About', fr: 'À propos' },
    trust: { en: 'Trust & sources', fr: 'Confiance et sources' },
    about: { en: 'About', fr: 'À propos' },
    licenses: { en: 'Licenses & regs', fr: 'Permis et règlements' },
  },
  weatherStats: {
    feels: { en: 'Feels like', fr: 'Ressenti' },
    wind: { en: 'Wind', fr: 'Vent' },
    humidity: { en: 'Humidity', fr: 'Humidité' },
    precip: { en: 'Precip.', fr: 'Précip.' },
  },
};

// Nav link targets that differ by language on the CURRENT site. FR map and
// trip-planner pages do not exist yet, so FR chrome links to the EN pages —
// preserved for parity; flips to /fr/ when those pages ship.
export function chromeLinks(lang) {
  return {
    home: lang === 'en' ? '/' : '/fr/',
    map: '/en/map',
    planner: '/en/trip-planner',
    blog: `/${lang}/blog`,
    trust: `/${lang}/trust`,
    about: '/en/about',
    licenses: '/en/licenses',
    directory: act => `/${lang}/${act}/directory`,
  };
}
