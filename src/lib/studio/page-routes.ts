// Builder pages can be "mounted" at a real route (an .astro file under
// src/pages renders the page JSON with MountedPage.astro). Everything else is
// served at /p/<slug>. Example: { "about-us": "/about-us" } with a matching
// src/pages/about-us.astro file.
export const MOUNTED: Record<string, string> = {};

// Slugs rendered with the Bare layout (no header/footer): good for link-in-bio
// or QR-code landing pages.
export const BARE = new Set<string>([]);

export const pagePath = (slug: string) => MOUNTED[slug] || `/p/${slug}`;
