/**
 * Desktop PostCSS config — stops Vite from resolving the repo-root postcss.config.mjs
 * (which requires @tailwindcss/postcss from the Next.js package.json). Tailwind is
 * handled by @tailwindcss/vite in electron.vite.config.ts.
 */
export default {
  plugins: {},
};
