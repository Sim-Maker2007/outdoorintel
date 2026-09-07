// Outfitter guest-prep samples (~C$199/mo pilots).
// Public-web facts only. Regulation hrefs must resolve to live Outdoor Intel pages.
// Do not invent bag limits, WMU 12, coverage numbers, or paid partnerships.

export const PREP_SAMPLE_SLUGS = ['kenauk', 'eastern-canadian-outfitters', 'legendes-des-bois'];

export const PREP_UI = {
  bannerKicker: { en: 'Sample / pilot preview', fr: 'Aperçu échantillon / pilote' },
  demoBannerKicker: { en: 'Outfitter product demo', fr: 'Démo produit pourvoirie' },
  bannerTitle: {
    en: 'This is a sample guest-prep page, not a live paid partnership or booking.',
    fr: 'Ceci est une page échantillon de préparation-invités, pas un partenariat payant ni une réservation.',
  },
  demoBannerTitle: {
    en: 'This is a demo guest-prep page, not a live lodge booking.',
    fr: 'Ceci est une page démo de préparation-invités, pas une réservation réelle.',
  },
  arrivalTitle: { en: 'Arrival notes', fr: 'Notes d’arrivée' },
  arrivalIntro: {
    en: 'Example trip-prep copy an outfitter would customize — check-in, meals, and camp rules. These are not regulations and not a confirmed booking.',
    fr: 'Exemple de copie de préparation qu’une pourvoirie personnaliserait — enregistrement, repas et règles de camp. Ce ne sont pas des règlements ni une réservation confirmée.',
  },
  regsTitle: { en: 'Relevant regulations (live pages)', fr: 'Règlements pertinents (pages en ligne)' },
  regsIntro: {
    en: 'Outdoor Intel is not a legal authority. These links open public, cited pages already on outdoorintel.ca. Catch limits, seasons, and gear rules live on those pages — not here. Public regs are never paywalled. Confirm which published hunting split applies with the lodge before you hunt.',
    fr: 'Outdoor Intel n’est pas une autorité juridique. Ces liens ouvrent des pages publiques et citées déjà sur outdoorintel.ca. Les limites, saisons et engins sont sur ces pages — pas ici. Les règlements publics ne sont jamais derrière un paywall. Confirmez auprès de la pourvoirie quel segment de chasse publié s’applique.',
  },
  fish10: {
    en: 'Québec fishing zone 10 (Outaouais) — live Outdoor Intel page',
    fr: 'Zone de pêche 10 du Québec (Outaouais) — page Outdoor Intel en ligne',
  },
  hunt10e: {
    en: 'Québec hunting zone 10 East — live Outdoor Intel page',
    fr: 'Zone de chasse 10 est du Québec — page Outdoor Intel en ligne',
  },
  hunt10w: {
    en: 'Québec hunting zone 10 West — live Outdoor Intel page',
    fr: 'Zone de chasse 10 ouest du Québec — page Outdoor Intel en ligne',
  },
  fishHub: { en: 'All harvested fishing zone pages', fr: 'Toutes les pages de zones de pêche récupérées' },
  huntHub: { en: 'All harvested hunting zone pages', fr: 'Toutes les pages de zones de chasse récupérées' },
  nextTitle: { en: 'Plan extra days with Scout', fr: 'Planifier des journées de plus avec Scout' },
  nextBody: {
    en: 'Scout and the trip planner are Outdoor Intel’s multi-trip motor. They suggest sourced registry spots only — not this lodge’s private water, and not secret honey-holes. Confirm each public spot page before you go.',
    fr: 'Scout et le planificateur sont le moteur multi-sorties d’Outdoor Intel. Ils ne suggèrent que des spots du registre sourcé — pas les eaux privées de cette pourvoirie, et pas de « spots secrets ». Confirmez chaque page publique avant de partir.',
  },
  scoutCta: { en: 'Open Scout', fr: 'Ouvrir Scout' },
  plannerCta: { en: 'Add sample spots to the trip planner', fr: 'Ajouter des spots exemples au planificateur' },
  pilotsTitle: { en: 'For outfitters', fr: 'Pour les pourvoyeurs' },
  pilotsBody: {
    en: 'This is what a ~C$199/month guest-prep pilot looks like: branded arrival notes, live links into free public regs, a packing list, and a Scout handoff. It is a sample page for outreach — not a live paid partnership and not a Stripe checkout. If you want a page like this for your pourvoirie, write to hello@outdoorintel.ca. We will not scrape Forêt ouverte, Fish ON-Line, or Sépaq, and we will not clone iHunter maps.',
    fr: 'Voici à quoi ressemble un pilote de préparation-invités à environ 199 $ CA/mois : notes d’arrivée à votre image, liens vers les règlements publics gratuits, une liste d’équipement, et un passage vers Scout. C’est une page échantillon pour la prospection — pas un partenariat payant ni un paiement Stripe. Si vous voulez une page comme celle-ci pour votre pourvoirie, écrivez à hello@outdoorintel.ca. Nous ne moissonnerons pas Forêt ouverte, Fish ON-Line ni Sépaq, et nous ne clonerons pas les cartes iHunter.',
  },
  contactCta: { en: 'Email hello@outdoorintel.ca', fr: 'Écrire à hello@outdoorintel.ca' },
  websiteCta: { en: 'Public lodge website', fr: 'Site public de la pourvoirie' },
  samplesTitle: { en: 'Outaouais sample pages', fr: 'Pages échantillon en Outaouais' },
  samplesIntro: {
    en: 'Three lodge-specific pilots for outreach screenshots. Each URL is a sample / pilot preview — not a live booking and not a claimed paid partnership.',
    fr: 'Trois pages de pourvoirie pour les captures d’écran de prospection. Chaque URL est un aperçu échantillon / pilote — pas une réservation réelle ni un partenariat payant revendiqué.',
  },
  moreSamplesTitle: { en: 'Other sample pages', fr: 'Autres pages échantillon' },
  demoIndexNote: {
    en: 'Start here if you want the generic product shape, then open a branded sample.',
    fr: 'Commencez ici pour la forme générique du produit, puis ouvrez un échantillon à l’image d’une pourvoirie.',
  },
};

const DEMO_PACK = {
  en: [
    {
      h: 'Licences & papers',
      items: [
        'Valid Québec fishing licence for the dates you are on the water',
        'Valid hunting licence and any required tags if you intend to hunt',
        'Written confirmation of current zone rules from the linked Outdoor Intel pages (print or offline copy)',
      ],
    },
    {
      h: 'Fishing kit',
      items: [
        'Rod, reel, and a small tackle box — use only gear that is legal on the water you fish',
        'Personal flotation device for each person in the boat',
        'Landing net and measuring board so you can comply with length rules published on the zone page',
      ],
    },
    {
      h: 'Hunting kit',
      items: [
        'Firearm or bow only if you are licensed and in season — confirm weapon class and dates on the hunting zone page',
        'Blaze orange as required by current Québec rules (see the hunting page, do not guess from this list)',
        'Day pack, headlamp, and a means to mark your way back to camp',
      ],
    },
    {
      h: 'Camp & weather',
      items: [
        'Layered clothing for cool Outaouais mornings and wet weather',
        'Waterproof boots and rain shell',
        'Personal first-aid kit, water bottle, and insect protection in season',
      ],
    },
  ],
  fr: [
    {
      h: 'Permis et papiers',
      items: [
        'Permis de pêche du Québec valide pour les dates où vous serez sur l’eau',
        'Permis de chasse valide et tout tag requis si vous comptez chasser',
        'Confirmation écrite des règles de zone actuelles depuis les pages Outdoor Intel liées (impression ou copie hors ligne)',
      ],
    },
    {
      h: 'Kit pêche',
      items: [
        'Canne, moulinet et petite boîte — n’utilisez que les engins légaux sur l’eau que vous pêchez',
        'Vêtement de flottaison pour chaque personne dans l’embarcation',
        'Épuisette et planche de mesure pour respecter les longueurs publiées sur la page de zone',
      ],
    },
    {
      h: 'Kit chasse',
      items: [
        'Arme à feu ou arc seulement si vous êtes licencié et en saison — confirmez la classe d’arme et les dates sur la page de chasse',
        'Orange fluorescent selon les règles québécoises en vigueur (voir la page de chasse, ne pas deviner depuis cette liste)',
        'Sac de jour, lampe frontale et un moyen de retrouver le camp',
      ],
    },
    {
      h: 'Camp et météo',
      items: [
        'Vêtements en couches pour les matins frais et le temps mouillé de l’Outaouais',
        'Bottes étanches et coquille de pluie',
        'Trousse de premiers soins, gourde et protection contre les insectes en saison',
      ],
    },
  ],
};

/** @type {Record<string, object>} */
export const PREP_LODGES = {
  demo: {
    slug: 'demo',
    kind: 'demo',
    website: null,
    name: { en: 'Demo Outfitter', fr: 'Pourvoirie Démo' },
    region: { en: 'Outaouais, Québec', fr: 'Outaouais, Québec' },
    offer: 'mixed',
    fishZones: ['zone-10'],
    huntZones: ['qc-h-10w', 'qc-h-10e'],
    plannerStops: ['fishing:poisson-blanc-lac-du', 'fishing:baskatong-reservoir', 'hunting:laurentian-mountains'],
    scoutQuery: {
      en: 'Outaouais fishing and hunting weekend in Quebec',
      fr: 'Fin de semaine pêche et chasse en Outaouais au Québec',
    },
    title: {
      en: 'Demo guest-prep — Demo Outfitter, Outaouais | Outdoor Intel',
      fr: 'Démo préparation-invités — Pourvoirie Démo, Outaouais | Outdoor Intel',
    },
    metaDesc: {
      en: 'Public demo of Outdoor Intel’s outfitter guest-prep pages (~C$199/month pilots). Placeholder lodge branding for Demo Outfitter in the Outaouais. Live links to Québec fishing zone 10 and hunting zones 10 East / 10 West. Not a real booking. Public regs stay free.',
      fr: 'Démo publique des pages de préparation-invités pour pourvoiries (~199 $ CA/mois en pilote). Marque fictive : Pourvoirie Démo, Outaouais. Liens vers la zone de pêche 10 et les zones de chasse 10 est / 10 ouest. Pas une vraie réservation. Les règlements publics restent gratuits.',
    },
    bannerBody: {
      en: 'Outdoor Intel’s first B2B offer is branded guest-prep for Québec outfitters — about C$199/month for pilots. This page shows the shape: lodge notes, live regulation links, a mixed hunt/fish checklist, and a soft handoff to Scout and the trip planner. Season Intel and public regs stay free. We do not invent bag limits here. Gmail outreach is not part of this page.',
      fr: 'La première offre B2B d’Outdoor Intel est une page de préparation-invités à l’image de la pourvoirie — environ 199 $ CA/mois en pilote. Cette page montre la forme : notes d’arrivée, liens vers les règlements en ligne, liste mixte chasse/pêche, et un passage vers Scout et le planificateur. Season Intel et les règlements publics restent gratuits. Nous n’inventons pas de limites de prise ici. La prospection Gmail n’est pas dans cette page.',
    },
    h1: { en: 'Welcome to Demo Outfitter', fr: 'Bienvenue à la Pourvoirie Démo' },
    lead: {
      en: 'A placeholder lodge page for guests heading to the Outaouais. Use it to see what an outfitter could send before arrival. The lodge details below are demo copy. The regulation links are live Outdoor Intel pages.',
      fr: 'Une page de pourvoirie fictive pour des invités qui se rendent en Outaouais. Elle montre ce qu’un pourvoyeur pourrait envoyer avant l’arrivée. Les détails du lodge ci-dessous sont de la copie démo. Les liens de règlements sont des pages Outdoor Intel en ligne.',
    },
    arrivalIntro: {
      en: 'Lodge-style placeholders for this demo. A real outfitter would replace these with their check-in, meals, and camp rules. They are not regulations.',
      fr: 'Placeholders de lodge pour cette démo. Une vraie pourvoirie remplacerait ces notes par son enregistrement, ses repas et ses règles de camp. Ce ne sont pas des règlements.',
    },
    arrival: {
      en: [
        'Check-in Friday from 3:00 p.m. at the main lodge (demo placeholder).',
        'Meals: breakfast 6:30 a.m., packed lunch, dinner 6:00 p.m. (demo placeholder).',
        'Cell coverage is weak at the water. Download maps and this page before you leave town.',
        'Boat and camp orientation Saturday morning. Ask the lodge which waters are theirs versus public access.',
        'This demo does not sell licences, book rooms, or confirm seasons. Confirm current rules on the linked Outdoor Intel pages, then with the official source on each of those pages.',
      ],
      fr: [
        'Enregistrement le vendredi dès 15 h au pavillon principal (placeholder de démo).',
        'Repas : déjeuner 6 h 30, lunch à emporter, souper 18 h (placeholder de démo).',
        'La couverture cellulaire est faible au bord de l’eau. Téléchargez les cartes et cette page avant de quitter la ville.',
        'Orientation bateau et camp le samedi matin. Demandez au lodge quelles eaux sont les siennes versus l’accès public.',
        'Cette démo ne vend pas de permis, ne réserve pas de chambres et ne confirme pas les saisons. Confirmez les règles en vigueur sur les pages Outdoor Intel liées, puis auprès de la source officielle indiquée sur chacune.',
      ],
    },
    packTitle: { en: 'Equipment checklist (mixed hunt / fish)', fr: 'Liste d’équipement (chasse et pêche)' },
    packIntro: {
      en: 'A guest packing list for a mixed Outaouais weekend. Items are gear and licence reminders, not invented bag limits. Legal tackle, seasons, and blaze-orange rules belong on the linked zone pages.',
      fr: 'Une liste d’invité pour une fin de semaine mixte en Outaouais. Ce sont des rappels d’équipement et de permis, pas des limites de prise inventées. Les engins légaux, saisons et règles d’orange fluorescent appartiennent aux pages de zone liées.',
    },
    packGroups: DEMO_PACK,
    spotsNote: {
      en: 'Sample stops: Poisson Blanc (fishing), Baskatong Reservoir (fishing), Laurentian Mountains (hunting). Confirm each spot page before you go.',
      fr: 'Arrêts exemples : Poisson Blanc (pêche), réservoir Baskatong (pêche), Laurentides (chasse). Confirmez chaque page de spot avant de partir.',
    },
    pilotsBody: {
      en: 'If you run a pourvoirie and want a branded guest-prep page like this, with your arrival notes and links into the free public regs, write to hello@outdoorintel.ca. Pilots are about C$199/month. This demo is honest placeholder copy — we will not scrape Forêt ouverte, Fish ON-Line, or Sépaq, and we will not clone iHunter maps.',
      fr: 'Si vous exploitez une pourvoirie et voulez une page de préparation-invités à votre image, avec vos notes d’arrivée et des liens vers les règlements publics gratuits, écrivez à hello@outdoorintel.ca. Les pilotes sont d’environ 199 $ CA/mois. Cette démo est une copie placeholder honnête — nous ne moissonnerons pas Forêt ouverte, Fish ON-Line ni Sépaq, et nous ne clonerons pas les cartes iHunter.',
    },
  },

  kenauk: {
    slug: 'kenauk',
    kind: 'sample',
    website: 'https://kenauk.com/',
    name: { en: 'Kenauk Nature', fr: 'Kenauk Nature' },
    region: { en: 'Montebello, Outaouais, Québec', fr: 'Montebello, Outaouais, Québec' },
    offer: 'mixed',
    fishZones: ['zone-10'],
    huntZones: ['qc-h-10e', 'qc-h-10w'],
    plannerStops: ['fishing:poisson-blanc-lac-du', 'hunting:laurentian-mountains'],
    scoutQuery: {
      en: 'Fishing extra days in the Outaouais, Quebec',
      fr: 'Journées de pêche de plus en Outaouais au Québec',
    },
    title: {
      en: 'Sample guest-prep — Kenauk Nature, Montebello | Outdoor Intel',
      fr: 'Préparation-invités échantillon — Kenauk Nature, Montebello | Outdoor Intel',
    },
    metaDesc: {
      en: 'Sample Outdoor Intel guest-prep page for Kenauk Nature near Montebello, Outaouais (~C$199/month pilot preview). Public-web blurb, example arrival notes, and live links to Québec fishing zone 10 and hunting zones 10 East / 10 West. Not a paid partnership or booking.',
      fr: 'Page échantillon de préparation-invités Outdoor Intel pour Kenauk Nature, près de Montebello, Outaouais (aperçu pilote ~199 $ CA/mois). Texte public, notes d’arrivée exemples, et liens vers la zone de pêche 10 et les zones de chasse 10 est / 10 ouest. Pas un partenariat payant ni une réservation.',
    },
    bannerBody: {
      en: 'Outdoor Intel built this branded preview so outreach can share a real URL. It is a sample / pilot page for Kenauk Nature — not a live paid partnership, not a booking, and not Stripe checkout. Pilots are about C$199/month. Public regs stay free. We do not invent bag limits or hunting-zone splits here.',
      fr: 'Outdoor Intel a bâti cet aperçu à l’image de la pourvoirie pour partager une vraie URL. C’est une page échantillon / pilote pour Kenauk Nature — pas un partenariat payant, pas une réservation, et pas un paiement Stripe. Les pilotes sont d’environ 199 $ CA/mois. Les règlements publics restent gratuits. Nous n’inventons pas de limites de prise ni de segments de chasse ici.',
    },
    h1: { en: 'Welcome to Kenauk Nature', fr: 'Bienvenue à Kenauk Nature' },
    lead: {
      en: 'Kenauk Nature is a large private reserve in the Outaouais near Montebello — about an hour from Ottawa and an hour and a half from Montreal, at 1000 chemin Kenauk. Public pages describe off-grid chalets on private lakes, year-round outdoor time, fishing for trout, bass, and pike, and guided moose, deer, and small-game hunts. This page is Outdoor Intel sample copy adapted from kenauk.com. Ask the lodge what is actually included on your dates.',
      fr: 'Kenauk Nature est une vaste réserve privée en Outaouais, près de Montebello — environ une heure d’Ottawa et une heure et demie de Montréal, au 1000, chemin Kenauk. Les pages publiques parlent de chalets hors réseau sur des lacs privés, d’activités quatre saisons, de pêche à la truite, à l’achigan et au brochet, et de chasses guidées à l’orignal, au cerf et au petit gibier. Cette page est une copie échantillon Outdoor Intel adaptée de kenauk.com. Demandez à la pourvoirie ce qui est vraiment inclus à vos dates.',
    },
    arrival: {
      en: [
        'Example check-in: Friday afternoon at the main gate / reception on chemin Kenauk (customize — not a confirmed Kenauk hour).',
        'Example stay shape: private chalet on a reserve lake; some units are a long drive from the gate. Confirm which lake and whether boats or PFDs are supplied.',
        'Cell coverage is often weak inside a private reserve. Download this page, maps, and the linked zone pages before you leave Montebello or Ottawa.',
        'Fishing and hunting on Kenauk water or territory are lodge-managed. This sample does not list private quotas, QDM rules, or lake assignments. Ask Kenauk what is open on your dates.',
        'Outdoor Intel does not sell licences, book chalets, or confirm seasons. Read the linked zone pages, then the official source cited on each page, then the lodge.',
      ],
      fr: [
        'Exemple d’enregistrement : vendredi après-midi à la barrière / réception du chemin Kenauk (à personnaliser — pas une heure confirmée de Kenauk).',
        'Exemple de séjour : chalet privé sur un lac de la réserve; certains unités sont loin de la barrière. Confirmez le lac et si bateaux ou VFI sont fournis.',
        'La couverture cellulaire est souvent faible dans une réserve privée. Téléchargez cette page, les cartes et les pages de zone liées avant de quitter Montebello ou Ottawa.',
        'La pêche et la chasse sur le territoire Kenauk sont gérées par la pourvoirie. Cet échantillon n’inscrit pas de quotas privés, de règles QDM ni d’attribution de lacs. Demandez à Kenauk ce qui est ouvert à vos dates.',
        'Outdoor Intel ne vend pas de permis, ne réserve pas de chalets et ne confirme pas les saisons. Lisez les pages de zone liées, puis la source officielle citée, puis la pourvoirie.',
      ],
    },
    packTitle: { en: 'Equipment checklist (mixed trout / deer / moose)', fr: 'Liste d’équipement (truite / cerf / orignal)' },
    packIntro: {
      en: 'A sample list for a Kenauk-style mixed stay: private-lake trout or bass days plus a guided deer or moose hunt. Gear reminders only — no invented bag limits. Lodge harvest rules stay with Kenauk; legal seasons and blaze orange stay on the linked zone pages.',
      fr: 'Une liste échantillon pour un séjour mixte façon Kenauk : journées de truite ou d’achigan sur lac privé, plus une chasse guidée au cerf ou à l’orignal. Rappels d’équipement seulement — pas de limites inventées. Les règles de récolte de la pourvoirie restent chez Kenauk; les saisons légales et l’orange fluorescent restent sur les pages de zone liées.',
    },
    packGroups: {
      en: [
        {
          h: 'Licences & papers',
          items: [
            'Valid Québec fishing licence if you will fish reserve lakes or rivers',
            'Valid hunting licence and any required tags if your package includes a hunt',
            'Offline copy of the linked Outdoor Intel fishing zone 10 and hunting zone 10 pages',
          ],
        },
        {
          h: 'Fishing kit (trout, bass, pike)',
          items: [
            'Rod and reel suited to trout or warm-water fish — use only gear that is legal on the water you fish',
            'Personal flotation device for each person in a boat or canoe',
            'Landing net and a way to measure fish against the lengths published on the fishing zone page',
          ],
        },
        {
          h: 'Hunting kit (deer / moose)',
          items: [
            'Firearm or bow only if you are licensed and in season — Kenauk’s public hunt pages emphasize guided rifle packages; confirm weapon class with the lodge and on the hunting zone page',
            'Blaze orange as required by current Québec rules (read the hunting page; do not guess from this list)',
            'Day pack, headlamp, and a way to return to your chalet after dark',
          ],
        },
        {
          h: 'Camp & weather',
          items: [
            'Layers for cool Petite-Nation mornings and wet weather on an off-grid chalet stay',
            'Waterproof boots and a rain shell for dock and trail time',
            'Personal first-aid kit, water bottle, and insect protection in season',
          ],
        },
      ],
      fr: [
        {
          h: 'Permis et papiers',
          items: [
            'Permis de pêche du Québec si vous pêchez les lacs ou rivières de la réserve',
            'Permis de chasse valide et tout tag requis si votre forfait inclut une chasse',
            'Copie hors ligne des pages Outdoor Intel liées (pêche zone 10 et chasse zone 10)',
          ],
        },
        {
          h: 'Kit pêche (truite, achigan, brochet)',
          items: [
            'Canne et moulinet adaptés à la truite ou aux poissons d’eau chaude — seulement les engins légaux sur l’eau pêchée',
            'Vêtement de flottaison pour chaque personne dans l’embarcation',
            'Épuisette et un moyen de mesurer le poisson selon les longueurs de la page de zone',
          ],
        },
        {
          h: 'Kit chasse (cerf / orignal)',
          items: [
            'Arme à feu ou arc seulement si vous êtes licencié et en saison — les pages publiques de Kenauk parlent de forfaits guidés à la carabine; confirmez la classe d’arme avec la pourvoirie et sur la page de chasse',
            'Orange fluorescent selon les règles québécoises en vigueur (lire la page de chasse; ne pas deviner)',
            'Sac de jour, lampe frontale et un moyen de rentrer au chalet après la tombée du jour',
          ],
        },
        {
          h: 'Camp et météo',
          items: [
            'Couches pour les matins frais de la Petite-Nation et le temps mouillé en chalet hors réseau',
            'Bottes étanches et coquille de pluie pour le quai et les sentiers',
            'Trousse de premiers soins, gourde et protection contre les insectes en saison',
          ],
        },
      ],
    },
    spotsNote: {
      en: 'Public extra-day samples only (not Kenauk private lakes): Poisson Blanc fishing page and Laurentian Mountains hunting page.',
      fr: 'Exemples de journées publiques seulement (pas les lacs privés de Kenauk) : page pêche Poisson Blanc et page chasse Laurentides.',
    },
  },

  'eastern-canadian-outfitters': {
    slug: 'eastern-canadian-outfitters',
    kind: 'sample',
    website: 'https://www.easterncanadianoutfitters.com/',
    name: { en: 'Eastern Canadian Outfitters (Mer Bleue)', fr: 'Eastern Canadian Outfitters (Mer Bleue)' },
    region: { en: 'Cayamant, Outaouais, Québec', fr: 'Cayamant, Outaouais, Québec' },
    offer: 'mixed',
    fishZones: ['zone-10'],
    huntZones: ['qc-h-10w', 'qc-h-10e'],
    plannerStops: ['fishing:baskatong-reservoir', 'hunting:laurentian-mountains'],
    scoutQuery: {
      en: 'Walleye and bass fishing near Baskatong, Outaouais, Quebec',
      fr: 'Pêche au doré et à l’achigan près de Baskatong, Outaouais, Québec',
    },
    title: {
      en: 'Sample guest-prep — Eastern Canadian Outfitters, Cayamant | Outdoor Intel',
      fr: 'Préparation-invités échantillon — Eastern Canadian Outfitters, Cayamant | Outdoor Intel',
    },
    metaDesc: {
      en: 'Sample Outdoor Intel guest-prep page for Eastern Canadian Outfitters at Lac Mer Bleue, Cayamant, Outaouais (~C$199/month pilot preview). English-first mixed hunt/fish camp. Live links to Québec fishing zone 10 and hunting zones 10 West / 10 East. Not a paid partnership or booking.',
      fr: 'Page échantillon de préparation-invités Outdoor Intel pour Eastern Canadian Outfitters au lac Mer Bleue, Cayamant, Outaouais (aperçu pilote ~199 $ CA/mois). Camp mixte chasse/pêche, d’abord en anglais. Liens vers la zone de pêche 10 et les zones de chasse 10 ouest / 10 est. Pas un partenariat payant ni une réservation.',
    },
    bannerBody: {
      en: 'This URL is a sample / pilot preview for Eastern Canadian Outfitters’ Mer Bleue camp in Cayamant — not ECO Ontario, not Camachigama, not a live paid partnership, and not a booking. Outdoor Intel pilots are about C$199/month. Public regs stay free. We do not invent bag limits or copy lodge-only harvest slots onto this page.',
      fr: 'Cette URL est un aperçu échantillon / pilote pour le camp Mer Bleue d’Eastern Canadian Outfitters à Cayamant — pas ECO Ontario, pas Camachigama, pas un partenariat payant, et pas une réservation. Les pilotes Outdoor Intel sont d’environ 199 $ CA/mois. Les règlements publics restent gratuits. Nous n’inventons pas de limites de prise et nous ne copions pas les quotas internes de la pourvoirie sur cette page.',
    },
    h1: {
      en: 'Welcome to Eastern Canadian Outfitters — Mer Bleue',
      fr: 'Bienvenue chez Eastern Canadian Outfitters — Mer Bleue',
    },
    lead: {
      en: 'Eastern Canadian Outfitters’ Mer Bleue camp sits at 47 chemin de la Mer Bleue in Cayamant, Outaouais — about 1.5 hours north of Ottawa, in the Gatineau Valley. Public pages describe an exclusive-rights territory around Lac Mer Bleue, mixed fishing (bass, pike, walleye, lake trout) and hunting (white-tailed deer, moose, black bear, and other game listed on their site), plus waterfront cabins. This sample is English-first, like their site. It covers the Québec Mer Bleue camp only — not their Ontario or Camachigama locations.',
      fr: 'Le camp Mer Bleue d’Eastern Canadian Outfitters est au 47, chemin de la Mer Bleue, Cayamant, Outaouais — environ 1 h 30 au nord d’Ottawa, dans la vallée de la Gatineau. Les pages publiques décrivent un territoire à droits exclusifs autour du lac Mer Bleue, une offre mixte (achigan, brochet, doré, touladi; cerf, orignal, ours noir et autre gibier nommé sur leur site) et des cabines au bord de l’eau. Cet échantillon est d’abord en anglais, comme leur site. Il couvre seulement le camp québécois Mer Bleue — pas leurs sites en Ontario ni à Camachigama.',
    },
    arrival: {
      en: [
        'Example check-in: Saturday after 2:00 p.m., checkout by 10:00 a.m. (shape taken from public package notes — confirm current hours with the lodge).',
        'Example drive: Route 105 north of Gatineau, toward Gracefield / Lac Cayamant, then chemin de la Mer Bleue. Pavement ends at camp — download maps first.',
        'Ask which cabin, boat, and lake access are in your package. Lodge pages mention Mer Bleue and nearby waters; this sample does not assign private water.',
        'Fishing and hunting licences are not sold here and public pages say they are not included in trip pricing. Buy them yourself and read the linked Outdoor Intel zone pages.',
        'This page does not book rooms, confirm baited-bear or deer dates, or publish lodge-only harvest rules. Confirm seasons on the live zone pages, then with ECO.',
      ],
      fr: [
        'Exemple d’enregistrement : samedi après 14 h, départ avant 10 h (forme tirée de notes publiques de forfait — confirmez les heures actuelles auprès de la pourvoirie).',
        'Exemple de trajet : route 105 au nord de Gatineau, vers Gracefield / lac Cayamant, puis le chemin de la Mer Bleue. Le bitume s’arrête au camp — téléchargez les cartes d’abord.',
        'Demandez quelle cabine, quel bateau et quel accès au lac sont dans votre forfait. Les pages de la pourvoirie parlent de Mer Bleue et d’eaux voisines; cet échantillon n’attribue pas d’eau privée.',
        'Les permis de pêche et de chasse ne se vendent pas ici, et les pages publiques indiquent qu’ils ne sont pas inclus dans le prix. Achetez-les vous-même et lisez les pages de zone Outdoor Intel liées.',
        'Cette page ne réserve pas de chambres, ne confirme pas les dates d’ours ou de cerf, et ne publie pas les règles de récolte internes. Confirmez les saisons sur les pages de zone, puis auprès d’ECO.',
      ],
    },
    packTitle: { en: 'Equipment checklist (mixed hunt / fish)', fr: 'Liste d’équipement (chasse et pêche)' },
    packIntro: {
      en: 'A sample list for a Mer Bleue mixed weekend: bass, pike, walleye, or lake-trout days plus deer, moose, or bear if that is what you booked. Gear and licence reminders only. Lodge-only slots and numeric harvest rules stay with ECO; legal seasons stay on the linked zone pages.',
      fr: 'Une liste échantillon pour une fin de semaine mixte à Mer Bleue : journées d’achigan, de brochet, de doré ou de touladi, plus cerf, orignal ou ours si c’est ce que vous avez réservé. Rappels d’équipement et de permis seulement. Les quotas internes restent chez ECO; les saisons légales restent sur les pages de zone liées.',
    },
    packGroups: {
      en: [
        {
          h: 'Licences & papers',
          items: [
            'Valid Québec fishing licence for the days you are on Mer Bleue or other waters you are allowed to fish',
            'Valid hunting licence and any required tags if you booked a hunt',
            'Offline copy of Québec fishing zone 10 and hunting zone 10 East / 10 West from Outdoor Intel',
          ],
        },
        {
          h: 'Fishing kit (bass, pike, walleye, lake trout)',
          items: [
            'Rod, reel, and tackle suited to the species you will fish — use only gear that is legal on that water',
            'Personal flotation device for each person in the boat (public pages mention boats with packages; confirm what is supplied)',
            'Landing net and a measuring board so you can follow length rules on the fishing zone page, plus any extra lodge rules they give you',
          ],
        },
        {
          h: 'Hunting kit (deer / moose / bear)',
          items: [
            'Firearm, bow, or muzzleloader only if you are licensed and in season — confirm weapon class on the hunting zone page and with ECO',
            'Blaze orange as required by current Québec rules (see the hunting page, do not guess from this list)',
            'Day pack, headlamp, and a plan to get back to the cabin from a stand or trail',
          ],
        },
        {
          h: 'Camp & weather',
          items: [
            'Layers for cool Gatineau Valley mornings and wet weather on the lake',
            'Waterproof boots; optional ATV gear only if the lodge says you may use trails',
            'Personal first-aid kit, water bottle, and insect protection in season',
          ],
        },
      ],
      fr: [
        {
          h: 'Permis et papiers',
          items: [
            'Permis de pêche du Québec pour les jours où vous serez sur Mer Bleue ou d’autres eaux autorisées',
            'Permis de chasse valide et tout tag requis si vous avez réservé une chasse',
            'Copie hors ligne de la zone de pêche 10 et des zones de chasse 10 est / 10 ouest sur Outdoor Intel',
          ],
        },
        {
          h: 'Kit pêche (achigan, brochet, doré, touladi)',
          items: [
            'Canne, moulinet et boîte adaptés aux espèces visées — seulement les engins légaux sur cette eau',
            'Vêtement de flottaison pour chaque personne dans le bateau (les pages publiques mentionnent des bateaux; confirmez ce qui est fourni)',
            'Épuisette et planche de mesure pour les longueurs de la page de zone, plus toute règle interne que la pourvoirie vous donne',
          ],
        },
        {
          h: 'Kit chasse (cerf / orignal / ours)',
          items: [
            'Arme à feu, arc ou arme à poudre noire seulement si vous êtes licencié et en saison — confirmez la classe d’arme sur la page de chasse et auprès d’ECO',
            'Orange fluorescent selon les règles québécoises en vigueur (voir la page de chasse, ne pas deviner)',
            'Sac de jour, lampe frontale et un plan pour rentrer à la cabine depuis un poste ou un sentier',
          ],
        },
        {
          h: 'Camp et météo',
          items: [
            'Couches pour les matins frais de la vallée de la Gatineau et le temps mouillé sur le lac',
            'Bottes étanches; équipement VTT seulement si la pourvoirie dit que les sentiers sont permis',
            'Trousse de premiers soins, gourde et protection contre les insectes en saison',
          ],
        },
      ],
    },
    spotsNote: {
      en: 'Public extra-day samples only (not Mer Bleue exclusive water): Baskatong Reservoir fishing page and Laurentian Mountains hunting page.',
      fr: 'Exemples de journées publiques seulement (pas l’eau exclusive de Mer Bleue) : page pêche du réservoir Baskatong et page chasse Laurentides.',
    },
  },

  'legendes-des-bois': {
    slug: 'legendes-des-bois',
    kind: 'sample',
    website: 'https://pourvoirielegendesdesbois.com/',
    name: { en: 'Pourvoirie Légendes des Bois', fr: 'Pourvoirie Légendes des Bois' },
    region: { en: 'Duhamel / Lac-des-Plages, Outaouais, Québec', fr: 'Duhamel / Lac-des-Plages, Outaouais, Québec' },
    offer: 'mixed',
    fishZones: ['zone-10'],
    huntZones: ['qc-h-10e', 'qc-h-10w'],
    plannerStops: ['fishing:poisson-blanc-lac-du', 'hunting:laurentian-mountains'],
    scoutQuery: {
      en: 'Brook trout lakes and extra days in the Outaouais, Quebec',
      fr: 'Lacs à truite mouchetée et journées de plus en Outaouais au Québec',
    },
    title: {
      en: 'Sample guest-prep — Légendes des Bois, Outaouais | Outdoor Intel',
      fr: 'Préparation-invités échantillon — Légendes des Bois, Outaouais | Outdoor Intel',
    },
    metaDesc: {
      en: 'Sample Outdoor Intel guest-prep page for Pourvoirie Légendes des Bois near Duhamel / Lac-des-Plages, Outaouais (~C$199/month pilot preview). Public-web blurb, example arrival notes, and live links to Québec fishing zone 10 and hunting zones 10 East / 10 West. Not a paid partnership or booking.',
      fr: 'Page échantillon de préparation-invités Outdoor Intel pour la Pourvoirie Légendes des Bois, près de Duhamel / Lac-des-Plages, Outaouais (aperçu pilote ~199 $ CA/mois). Texte public, notes d’arrivée exemples, et liens vers la zone de pêche 10 et les zones de chasse 10 est / 10 ouest. Pas un partenariat payant ni une réservation.',
    },
    bannerBody: {
      en: 'This URL is a sample / pilot preview for Pourvoirie Légendes des Bois — not a live paid partnership, not a booking, and not Stripe checkout. Their public site places the camp in the Outaouais on exclusive territory next to the Papineau-Labelle wildlife reserve, with fishing and hunting in zone 10. Outdoor Intel pilots are about C$199/month. Public regs stay free. We do not invent bag limits.',
      fr: 'Cette URL est un aperçu échantillon / pilote pour la Pourvoirie Légendes des Bois — pas un partenariat payant, pas une réservation, et pas un paiement Stripe. Leur site public situe le camp en Outaouais, sur un territoire exclusif adossé à la réserve faunique Papineau-Labelle, avec pêche et chasse en zone 10. Les pilotes Outdoor Intel sont d’environ 199 $ CA/mois. Les règlements publics restent gratuits. Nous n’inventons pas de limites de prise.',
    },
    h1: {
      en: 'Welcome to Pourvoirie Légendes des Bois',
      fr: 'Bienvenue à la Pourvoirie Légendes des Bois',
    },
    lead: {
      en: 'Pourvoirie Légendes des Bois is a bilingual Outaouais camp about two hours from Montréal and Ottawa, near Duhamel / Lac-des-Plages. Public pages describe a 15 km² exclusive territory, private lakes with brook trout, rainbow trout, and bass, hunting in zone 10 for white-tailed deer, moose, and black bear, chalets and a lodge on Lac Galette, and a setting next to the Papineau-Labelle wildlife reserve. This sample is adapted from pourvoirielegendesdesbois.com. It is not their booking page.',
      fr: 'La Pourvoirie Légendes des Bois est un camp bilingue en Outaouais, à environ deux heures de Montréal et d’Ottawa, près de Duhamel / Lac-des-Plages. Les pages publiques décrivent un territoire exclusif de 15 km², des lacs privés à truite mouchetée, truite arc-en-ciel et achigan, la chasse en zone 10 au cerf, à l’orignal et à l’ours, des chalets et un pavillon au lac Galette, adossés à la réserve faunique Papineau-Labelle. Cet échantillon est adapté de pourvoirielegendesdesbois.com. Ce n’est pas leur page de réservation.',
    },
    arrival: {
      en: [
        'Example check-in: Friday from 3:00 p.m. at the lodge / Lac Galette (customize — not a confirmed lodge hour).',
        'Example stay: chalet or main lodge on exclusive territory. Ask which lake you may fish and whether boats or PFDs come with the package.',
        'Papineau-Labelle is next door and is not this pourvoirie’s private water. Do not treat reserve access as included unless the lodge says so.',
        'Cell coverage can be thin in the Duhamel / Lac-des-Plages woods. Download this page and the linked zone 10 pages before you leave town.',
        'This sample does not sell licences, book chalets, or confirm seasons. Read Québec fishing zone 10 and hunting zone 10 on Outdoor Intel, then the official source on those pages, then the lodge.',
      ],
      fr: [
        'Exemple d’enregistrement : vendredi dès 15 h au pavillon / lac Galette (à personnaliser — pas une heure confirmée).',
        'Exemple de séjour : chalet ou pavillon sur territoire exclusif. Demandez quel lac vous pouvez pêcher et si bateaux ou VFI sont inclus.',
        'Papineau-Labelle est à côté et n’est pas l’eau privée de cette pourvoirie. N’assumez pas l’accès à la réserve sauf si le lodge le dit.',
        'La couverture cellulaire peut être faible dans les bois de Duhamel / Lac-des-Plages. Téléchargez cette page et les pages de zone 10 avant de quitter la ville.',
        'Cet échantillon ne vend pas de permis, ne réserve pas de chalets et ne confirme pas les saisons. Lisez la zone de pêche 10 et la zone de chasse 10 sur Outdoor Intel, puis la source officielle, puis la pourvoirie.',
      ],
    },
    packTitle: { en: 'Equipment checklist (trout / deer / moose)', fr: 'Liste d’équipement (truite / cerf / orignal)' },
    packIntro: {
      en: 'A sample list for a Légendes-style mixed stay: private-lake trout or bass plus zone 10 deer, moose, or bear if that is what you booked. Gear reminders only — no invented bag limits. Lodge lake rules stay with the pourvoirie; legal seasons stay on the linked zone pages.',
      fr: 'Une liste échantillon pour un séjour mixte façon Légendes : truite ou achigan sur lac privé, plus cerf, orignal ou ours en zone 10 si c’est ce que vous avez réservé. Rappels d’équipement seulement — pas de limites inventées. Les règles de lacs restent chez la pourvoirie; les saisons légales restent sur les pages de zone liées.',
    },
    packGroups: {
      en: [
        {
          h: 'Licences & papers',
          items: [
            'Valid Québec fishing licence for zone 10 dates you will be on the water',
            'Valid hunting licence and any required tags if you booked a zone 10 hunt',
            'Offline copy of the Outdoor Intel fishing zone 10 page and hunting zone 10 East / 10 West pages',
          ],
        },
        {
          h: 'Fishing kit (brook trout, rainbow trout, bass)',
          items: [
            'Light trout outfit and a bass setup if you will fish both — use only gear that is legal on the water you fish',
            'Personal flotation device for each person in the boat',
            'Landing net and a measuring board so you can follow lengths on the fishing zone page',
          ],
        },
        {
          h: 'Hunting kit (deer / moose / bear)',
          items: [
            'Firearm or bow only if you are licensed and in season — confirm weapon class and dates on the hunting zone page',
            'Blaze orange as required by current Québec rules (see the hunting page, do not guess from this list)',
            'Day pack, headlamp, and a way to mark your return to Lac Galette / camp',
          ],
        },
        {
          h: 'Camp & weather',
          items: [
            'Layers for cool Outaouais mornings beside Papineau-Labelle',
            'Waterproof boots and a rain shell for lake and wood edges',
            'Personal first-aid kit, water bottle, and insect protection in season',
          ],
        },
      ],
      fr: [
        {
          h: 'Permis et papiers',
          items: [
            'Permis de pêche du Québec pour les dates en zone 10 où vous serez sur l’eau',
            'Permis de chasse valide et tout tag requis si vous avez réservé une chasse en zone 10',
            'Copie hors ligne de la page de pêche zone 10 et des pages de chasse 10 est / 10 ouest',
          ],
        },
        {
          h: 'Kit pêche (omble de fontaine, truite arc-en-ciel, achigan)',
          items: [
            'Ensemble léger à truite et une canne à achigan si vous pêchez les deux — seulement les engins légaux sur l’eau pêchée',
            'Vêtement de flottaison pour chaque personne dans l’embarcation',
            'Épuisette et planche de mesure pour les longueurs de la page de zone',
          ],
        },
        {
          h: 'Kit chasse (cerf / orignal / ours)',
          items: [
            'Arme à feu ou arc seulement si vous êtes licencié et en saison — confirmez la classe d’arme et les dates sur la page de chasse',
            'Orange fluorescent selon les règles québécoises en vigueur (voir la page de chasse, ne pas deviner)',
            'Sac de jour, lampe frontale et un moyen de retrouver le lac Galette / le camp',
          ],
        },
        {
          h: 'Camp et météo',
          items: [
            'Couches pour les matins frais d’Outaouais au bord de Papineau-Labelle',
            'Bottes étanches et coquille de pluie pour le lac et la lisière',
            'Trousse de premiers soins, gourde et protection contre les insectes en saison',
          ],
        },
      ],
    },
    spotsNote: {
      en: 'Public extra-day samples only (not exclusive lodge lakes): Poisson Blanc fishing page and Laurentian Mountains hunting page. Poisson Blanc is a sourced public reservoir near this part of the Outaouais — not Légendes private water.',
      fr: 'Exemples de journées publiques seulement (pas les lacs exclusifs) : page pêche Poisson Blanc et page chasse Laurentides. Poisson Blanc est un réservoir public sourcé près de ce secteur de l’Outaouais — pas l’eau privée de Légendes.',
    },
  },
};

export function listPrepLodges() {
  return Object.values(PREP_LODGES);
}

export function listSampleLodges() {
  return PREP_SAMPLE_SLUGS.map(slug => PREP_LODGES[slug]);
}

export function getPrepLodge(slug) {
  return PREP_LODGES[slug] || null;
}

export function prepHref(lang, slug) {
  return `/${lang}/prep/${slug}`;
}

export function prepRegHref(lang, kind, id) {
  if (kind === 'fish') return `/${lang}/fishing/regulations/${id}`;
  if (kind === 'hunt') return `/${lang}/hunting/regulations/${id}`;
  if (kind === 'fishHub') return `/${lang}/fishing/regulations`;
  if (kind === 'huntHub') return `/${lang}/hunting/regulations`;
  return `/${lang}`;
}

export function plannerAddHref(stops) {
  return '/en/trip-planner?add=' + encodeURIComponent(stops.join(','));
}

export function scoutHref(lang, query) {
  const base = `/${lang}/scout`;
  if (!query) return base;
  return `${base}?q=${encodeURIComponent(query)}`;
}

export function localizeLodge(lodge, lang) {
  const L = lang === 'fr' ? 'fr' : 'en';
  const pick = (obj) => (obj && typeof obj === 'object' && (obj.en || obj.fr) ? obj[L] : obj);
  return {
    ...lodge,
    lang: L,
    name: pick(lodge.name),
    region: pick(lodge.region),
    title: pick(lodge.title),
    metaDesc: pick(lodge.metaDesc),
    bannerBody: pick(lodge.bannerBody),
    h1: pick(lodge.h1),
    lead: pick(lodge.lead),
    arrivalIntro: pick(lodge.arrivalIntro || PREP_UI.arrivalIntro),
    arrival: lodge.arrival[L],
    packTitle: pick(lodge.packTitle),
    packIntro: pick(lodge.packIntro),
    packGroups: lodge.packGroups[L],
    spotsNote: pick(lodge.spotsNote),
    pilotsBody: pick(lodge.pilotsBody || PREP_UI.pilotsBody),
    scoutQuery: pick(lodge.scoutQuery),
  };
}
