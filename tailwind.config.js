/** Static CSS build for the whole site (replaces the Tailwind Play CDN).
 * Rebuild after content changes: npm run build:css
 */
module.exports = {
  content: [
    './index.html',
    './404.html',
    './en/**/*.html',
    './fr/**/*.html',
    './assets/js/*.js',
  ],
  theme: { extend: {} },
  plugins: [],
};
