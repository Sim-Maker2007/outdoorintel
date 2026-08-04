// The gear bridge's link-resolution layer (merge roadmap Phase 2).
//
// One function turns a spot's gear checklist into concrete links. Which
// retail destination the links point to is decided by data/link-config.json:
//
//   link_source: "affiliate"  -> Amazon search links (today's behavior)
//   link_source: "ecotone"    -> ecotonegatineau.ca boutique links
//                                (the announcement-day flip: one config line,
//                                 push, Vercel rebuilds every page)
//
// Isomorphic on purpose: consumed at build time by GearChecklist.astro and
// later at runtime by the trip-planner island and Scout output. No Node APIs.

/**
 * @param {Array<{group: string, items: string[]}>} gear  spot.gear
 * @param {object} map      data/gear-map.json
 * @param {object} config   data/link-config.json
 * @param {string} lang     'en' | 'fr'
 * @returns {Array<{key, label, fill, icon, items: Array<{id, label, href, source, linkLabel}>}>}
 */
export function resolveGear(gear, map, config, lang) {
  const source = config.link_source === 'ecotone' ? 'ecotone' : 'affiliate';
  return gear.map(group => {
    const meta = map.groups.find(g => g.key === group.group) || {
      key: group.group, label_en: group.group, label_fr: group.group, fill: '#305e3c', icon: '',
    };
    return {
      key: meta.key,
      label: lang === 'fr' ? meta.label_fr : meta.label_en,
      fill: meta.fill,
      icon: meta.icon,
      items: group.items.map(id => {
        const item = map.items[id];
        if (!item) throw new Error(`gear item not in catalog: ${id}`);
        return {
          id,
          label: item.label,
          href: buildHref(item.targets[source], config, lang),
          source,
          linkLabel: source === 'ecotone' ? 'Ecotone' : 'Amazon',
        };
      }),
    };
  });
}

function buildHref(target, config, lang) {
  if (!target) return null;
  if (target.type === 'amazon-search') {
    return `https://www.amazon.ca/s?tag=${target.tag}&k=${target.q}`;
  }
  if (target.type === 'search' || target.type === 'category') {
    const base = config.ecotone_base || 'https://ecotonegatineau.ca';
    const utm = new URLSearchParams({ ...(config.utm || {}), utm_campaign: target.bucket || 'gear' });
    if (target.type === 'category' || (target.bucket && !target.q)) {
      const g = target.g ? `g=${encodeURIComponent(target.g)}&` : '';
      return `${base}/boutique/${target.bucket}?${g}${utm}`;
    }
    return `${base}/recherche?q=${encodeURIComponent(target.q)}&${utm}`;
  }
  return null;
}

/** Which disclosure line a page should show, per link-config. */
export function disclosureKey(config) {
  return config.link_source === 'ecotone' ? 'disclosureRetail' : 'disclosureAffiliate';
}
