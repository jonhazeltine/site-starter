import type { APIRoute } from "astro";
import { publicPaths, sitemapXml } from "../lib/discovery";
import { publicSiteUrl } from "../lib/public-site";
import { listPages } from "../lib/studio/pages";
import { readSitePageStatuses, sitePageStatus } from "../lib/studio/site-page-state";
import { listHandBuiltPages } from "../lib/studio/site-pages";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const pages = await listPages(locals);
  const siteStatuses = (await readSitePageStatuses(locals)).value;
  const body = sitemapXml(
    publicSiteUrl(),
    publicPaths({ pages, sitePages: listHandBuiltPages().map((page) => page.path) })
      .filter((path) => sitePageStatus(path, siteStatuses) === "live"),
  );

  return new Response(body, {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/xml; charset=utf-8",
    },
  });
};
