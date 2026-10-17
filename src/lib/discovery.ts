type BuilderPage = { path: string; status: "draft" | "live" };

/** Hand-built routes that should always be in the sitemap. */
const PUBLIC_ROUTES = ["/", "/about"] as const;

export function publicPaths(input: { pages: BuilderPage[]; sitePages?: string[] }): string[] {
  const paths = new Set<string>(PUBLIC_ROUTES);
  for (const path of input.sitePages ?? []) paths.add(path);
  for (const page of input.pages) {
    if (page.status === "live") paths.add(page.path);
  }
  return [...paths].sort();
}

function xmlEscape(value: string): string {
  return value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character]!,
  );
}

export function sitemapXml(origin: string, paths: string[]): string {
  const urls = paths
    .map(
      (path) =>
        `  <url><loc>${xmlEscape(new URL(path, origin).href)}</loc></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
