import { defineConfig } from 'astro/config';

// Static build with byte-identical URL layout to the legacy hand-rolled site:
// format:'file' emits dist/en/fishing/lake-superior.html so Vercel's
// cleanUrls:true keeps serving the exact same clean paths.
//
// No publicDir: scripts/build/merge-legacy.mjs copies assets/, data/, root
// files, and every not-yet-templated legacy HTML page into dist/ after the
// build, so `npm run build` always produces the COMPLETE site.
export default defineConfig({
  site: 'https://outdoorintel.ca',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Point publicDir at a nonexistent path — merge-legacy.mjs owns static
  // passthrough, and a root public/ would change Vercel's static behavior.
  publicDir: './.no-public',
  devToolbar: { enabled: false },
});
