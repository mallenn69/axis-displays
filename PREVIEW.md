# Axis Displays design preview

The GitHub Pages deployment is a static review version of the current concept landing page. The quote form is visibly disabled, and admin is excluded. No Supabase credentials are required or bundled. This is a design preview; specifications and product naming remain provisional.

Run `npm ci` then `npm run build:preview` to create `dist-preview`. GitHub Actions publishes that directory on changes to main.

The full application remains available via `npm run dev` and `npm run build`; it needs server hosting and backend configuration for live quote submissions and admin access.

Based on the Axis Glow project. The original repository and history remain intact in mallenn69/axis-glow.
