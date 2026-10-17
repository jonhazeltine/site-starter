/**
 * Redirects, run from src/middleware.ts on every request.
 *
 * Two optional jobs, both off until you fill them in:
 *  1. PATH_REDIRECTS: old URLs → new URLs (handy when you move a page or
 *     replace an old website and printed links / QR codes still point at it).
 *  2. Host canonicalisation: if PUBLIC_SITE_URL is set (e.g.
 *     https://example.com), visits to any host listed in EXTRA_HOSTS, or to
 *     the www. version of that domain, are sent to the one canonical domain.
 *
 * This file has no Astro dependency, so it's easy to unit-test
 * (see domain-redirects.test.mjs).
 */

/** Other domains you own that should forward to the main one, e.g. "old-name.com". */
export const EXTRA_HOSTS = new Set([]);

/** Old path → new path (or full URL). Example entries are commented out. */
export const PATH_REDIRECTS = Object.freeze({
	// "/old-page": "/about",
	// "/home": "/",
});

function canonicalHost(siteUrl = process.env.PUBLIC_SITE_URL) {
	if (!siteUrl) return null;
	try {
		return new URL(siteUrl).hostname;
	} catch {
		return null;
	}
}

/** Return the mapped path, preserving the incoming query string and fragment. */
export function redirectForPath(pathname, search = "", hash = "", redirects = PATH_REDIRECTS) {
	const target = redirects[pathname];
	if (!target || target === pathname) return null;
	const targetUrl = new URL(target, "https://redirect.invalid");
	if (search) targetUrl.search = search;
	if (hash) targetUrl.hash = hash;
	return /^https?:\/\//.test(target)
		? targetUrl.toString()
		: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

/** Return an absolute redirect target for this request, or null for "serve it". */
export function redirectForRequest(request, siteUrl = process.env.PUBLIC_SITE_URL, options = {}) {
	const redirects = options.redirects ?? PATH_REDIRECTS;
	const extraHosts = options.extraHosts ?? EXTRA_HOSTS;
	const incoming = new URL(request.url);
	// Never redirect API calls: POST bodies and webhook signatures would be lost.
	if (incoming.pathname === "/api" || incoming.pathname.startsWith("/api/")) return null;

	const finalHost = canonicalHost(siteUrl);
	const canonicalizeHost = Boolean(finalHost) && incoming.hostname !== finalHost
		&& (extraHosts.has(incoming.hostname) || incoming.hostname === `www.${finalHost}`);
	const mapped = redirectForPath(incoming.pathname, incoming.search, incoming.hash, redirects);
	if (!mapped && !canonicalizeHost) return null;
	if (mapped && /^https?:\/\//.test(mapped)) return mapped;

	const destination = mapped ? new URL(mapped, incoming.origin) : new URL(incoming);
	if (canonicalizeHost) {
		destination.protocol = "https:";
		destination.hostname = finalHost;
		destination.port = "";
	}
	return destination.toString() === incoming.toString() ? null : destination.toString();
}
