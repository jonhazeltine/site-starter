import assert from "node:assert/strict";
import test from "node:test";
import { publicPaths, sitemapXml } from "../src/lib/discovery.ts";

test("sitemap includes core routes, hand-built pages and only live builder pages", () => {
	const paths = publicPaths({
		pages: [{ path: "/p/welcome", status: "live" }, { path: "/p/secret", status: "draft" }],
		sitePages: ["/", "/contact"],
	});
	assert.deepEqual(paths, ["/", "/about", "/contact", "/p/welcome"]);
});

test("sitemap XML escapes URLs against the configured origin", () => {
	const xml = sitemapXml("https://example.com", ["/a&b"]);
	assert.match(xml, /<loc>https:\/\/example\.com\/a&amp;b<\/loc>/);
});
