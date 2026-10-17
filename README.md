# Site Starter

A ready-to-customize website starter built with [Astro](https://astro.build), shared by Jon Hazeltine. It's the engine behind his UnifyGR site with all of that site's content taken out, so you get the working parts without anyone else's words, pictures or settings.

What's included:

- **A fast Astro site**: a homepage, an About page, a shared header and footer, and light/dark themes.
- **A drag-and-drop Page Builder** at `/studio/builder` (built on [Puck](https://puckeditor.com)). Make new pages from blocks like Hero, Text, Cards, FAQ, Gallery, Video, Buttons and Embed. Builder pages are served at `/p/<page-name>`.
- **The Studio**, a password-protected editing dock that appears on every page once you sign in at `/studio`. You can edit site text, publish or unpublish pages, edit the menu, upload images, and ask an AI assistant to rewrite a page for you.
- **One example of each kind of content**: `content/site.json` (site name, tagline, contact), `content/nav.json` (menu), and `content/pages/welcome.json` (a sample builder page).

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env   # then fill in STUDIO_PASSCODE at least
npm run dev
```

Open http://localhost:4321. To edit, go to http://localhost:4321/studio and enter your `STUDIO_PASSCODE`.

Other commands:

| Command         | What it does                                  |
| :-------------- | :-------------------------------------------- |
| `npm run build` | Builds the production site                    |
| `npm run check` | Builds and type-checks; run before you push   |
| `npm test`      | Runs the unit tests                           |

## Make it yours

Start with these files:

| What                                | Where                                           |
| :---------------------------------- | :---------------------------------------------- |
| Site name, tagline, contact info    | `content/site.json` (or Studio → Shared content) |
| Menu                                | `content/nav.json` (or Studio → Navigation)     |
| Homepage / About page               | `src/pages/index.astro`, `src/pages/about.astro` |
| Header / footer                     | `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro` |
| Colours, fonts, spacing             | `src/styles/site.css` (design tokens at the top), `src/styles/global.css` |
| Social links                        | `src/data/site.ts`                              |
| Share image and favicon             | `public/og.png` (1200×630), `public/favicon.svg` |
| Builder blocks                      | `src/components/builder/blocks.tsx`             |

### Customizing with AI

This repo is set up for AI coding tools like Claude Code, Cursor and Codex. `AGENTS.md` (which `CLAUDE.md` points to) explains how the project fits together, so open the folder in your tool and ask in plain English. For example:

- "Rename the site to Blue Door Coffee, use a warm brown and cream colour scheme, and rewrite the homepage for a neighborhood coffee shop."
- "Add a Menu page with three sections and link it from the header."
- "Add a new Page Builder block for a pricing table."

Run `npm run check` and `npm test` after big changes.

## Put it online (Vercel)

1. Push this repo to your own GitHub account. If you got here from GitHub, click **Use this template** (or **Fork**).
2. At [vercel.com](https://vercel.com), click **Add New → Project** and import the repo. Vercel detects Astro, so you don't need to change any build settings.
3. In the project, go to **Storage → Create → Blob** and connect the store. This sets `BLOB_READ_WRITE_TOKEN` for you, and it's where Studio edits are saved.
4. In **Settings → Environment Variables**, add `STUDIO_PASSCODE`, `ANTHROPIC_API_KEY` (for the AI assistant) and `PUBLIC_SITE_URL` (your address, e.g. `https://example.com`). Then redeploy.
5. Optionally, add your own domain in **Settings → Domains**.

After that, every push to `main` deploys automatically, and pull requests get preview links.

### How edits are saved

- Files in this repo (`content/`) are the **starting copy**.
- Edits made in the Studio on the live site are saved in Vercel Blob and show up right away, without a rebuild. They don't change the files in GitHub.
- Edits made by changing code (yourself or with an AI tool) go live when you push.

## Credit

This started from Astro's blog template, which was based on [Bear Blog](https://github.com/HermanMartinus/bearblog/). It was then grown into the UnifyGR site and turned back into a general-purpose starter.
