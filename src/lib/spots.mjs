// Build-time loader for the spot dataset. Reads the six data/*.json files
// (the single source of truth) and validates every record against a zod
// schema — the build-blocking data gate on top of `npm run quality`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'astro/zod';
import { ACTIVITIES } from './labels.mjs';

// astro build runs from the project root; import.meta.url is unreliable here
// because Vite rewrites module URLs into dist/ during bundling.
const REPO = process.cwd();

const SpotSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  province: z.string().min(1),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  description: z.string().min(1),
  seasonal_tips: z.string().min(1),
  scout_level: z.enum(['Explorer', 'Pro', 'Elite', 'Legendary']),
  intel_grade: z.string(),
  hero_image: z.string().min(1),
  related_spots: z.array(z.string()).default([]),
  website: z.string().url(),
  // provenance block (docs/REFERENCE_OPERATING_PLAN.md)
  source_url: z.string(),
  verification_status: z.enum(['needs_review', 'verified']),
  // migration Phase 0 additions
  noindex: z.boolean().optional(),
  noindex_reason: z.string().optional(),
  schema_description: z.string().optional(),
  schema_keywords: z.string().optional(),
  gear: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
}).passthrough();

let cache = null;

export function loadSpots() {
  if (cache) return cache;
  const byActivity = {};
  const index = new Map(); // "activity/slug" -> spot
  for (const activity of ACTIVITIES) {
    const raw = JSON.parse(readFileSync(join(REPO, 'data', `${activity}.json`), 'utf-8'));
    byActivity[activity] = raw.spots.map(s => {
      const parsed = SpotSchema.safeParse(s);
      if (!parsed.success) {
        throw new Error(`data/${activity}.json :: ${s.slug || '?'} failed validation:\n` +
          parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
      }
      index.set(`${activity}/${s.slug}`, s);
      return s;
    });
  }
  cache = { byActivity, index };
  return cache;
}

export function gearMap() {
  return JSON.parse(readFileSync(join(REPO, 'data', 'gear-map.json'), 'utf-8'));
}

export function linkConfig() {
  return JSON.parse(readFileSync(join(REPO, 'data', 'link-config.json'), 'utf-8'));
}
