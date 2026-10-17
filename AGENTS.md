# AGENTS.md: guide for AI coding agents

This is an **Astro 5 website starter** with a drag-and-drop Page Builder and a
password-protected editing "Studio". The person you're working with is probably
customizing it into their own site, and may not be a developer, so explain
outcomes in plain English and keep changes small and working.

## Stack

- Astro 5 with server rendering on Vercel (`@astrojs/vercel`), plus React
  (for the builder) and MDX.
- [Puck](https://puckeditor.com) (`@measured/puck`) powers the Page Builder.
- Studio edits are saved at runtime in **Vercel Blob** (`@vercel/blob`). The
  JSON files in `content/` are only the starting seed.
- The Studio's AI assistant calls the **Anthropic API** (`ANTHROPIC_API_KEY`)
  when hosted, and the local Claude Code CLI during `npm run dev`.

## Commands

- `npm run dev`: local site at http://localhost:4321
- `npm run check`: build + TypeScript check. Run it before you finish.
- `npm test`: unit tests (`test/*.test.ts`, `domain-redirects.test.mjs`)
- `npm run build`: production build

## Where things live

- `src/pages/`: routes. `index.astro` (homepage) and `about.astro` are
  hand-coded pages. `p/[slug].astro` serves Page Builder pages.
  `studio/builder.astro` is the builder UI, and `api/studio/*` is the Studio
  backend.
- `src/layouts/`: `Site.astro` (homepage-style), `Interior.astro` (content
  pages; supports `?embed=1`), and `Bare.astro` (no header/footer).
- `src/components/`: `SiteHeader`, `SiteFooter`, `ThemeControl`, `StudioDock`
  (the floating editor), and `builder/` (the Puck app and **all block
  definitions in `blocks.tsx`**).
- `src/data/site.ts`: reads `content/site.json` and holds social links.
- `src/lib/studio/`: Studio internals (auth, storage, AI "brains", page
  storage and sanitizing, nav, media).
- `src/styles/`: `site.css` holds design tokens and layout, `global.css` holds
  blocks and builder page styles, and `tap.css` is for link-in-bio style pages.
- `content/site.json`: site name, tagline and contact details. Fields the
  Studio may edit are listed in `src/lib/studio/schema.ts`.
- `content/nav.json`: header menu.
- `content/pages/*.json`: Page Builder pages (seed copies).
- `domain-redirects.mjs`: optional old-URL and domain redirects, run from
  `src/middleware.ts`.

## Common tasks

- **Rebrand:** edit `content/site.json`, `src/consts.ts`, colours and fonts in
  `src/styles/site.css`, and `public/og.png` / `public/favicon.svg`.
- **Add a hand-coded page:** create `src/pages/<name>.astro` using
  `Interior.astro` (or `Site.astro`), then add it to `content/nav.json`.
- **Add a builder block:** add it to `blocksConfig` in
  `src/components/builder/blocks.tsx` **and** to `ALLOWED_BLOCKS` in
  `src/lib/studio/pages.ts`. The sanitizer drops unknown block types.
- **Let the Studio edit a new site-wide field:** add it to `content/site.json`
  and add a row to `STATIC_FIELDS` in `src/lib/studio/schema.ts`.
- **Mount a builder page at a real URL** (instead of `/p/<slug>`): add it to
  `MOUNTED` in `src/lib/studio/page-routes.ts` and create a matching
  `.astro` file that renders `MountedPage.astro`.

## Rules

- Never commit secrets. Configuration goes in `.env` (gitignored; see
  `.env.example`) and in Vercel environment variables.
- Don't weaken the Studio fences: `isAuthed` checks on `api/studio/*`, the
  editable-field list in `schema.ts`, and `sanitizeData()` in `pages.ts`.
- Keep `import.meta.glob(...)` calls literal and direct so Vite can transform
  them. Don't alias or guard them, or the production bundle loses its page
  and media lists.
- Run `npm run check` and `npm test` before saying a change is done.
