import test from "node:test";
import assert from "node:assert/strict";
import { redirectForPath, redirectForRequest } from "./domain-redirects.mjs";

const redirects = { "/old-page": "/about", "/elsewhere": "https://example.org/x" };
const req = (url) => new Request(url);

test("maps an old path and keeps the query string", () => {
	assert.equal(redirectForPath("/old-page", "?a=1", "", redirects), "/about?a=1");
});

test("unknown paths are not redirected", () => {
	assert.equal(redirectForPath("/nope", "", "", redirects), null);
	assert.equal(redirectForRequest(req("https://example.com/nope"), "https://example.com", { redirects }), null);
});

test("external targets are returned as-is", () => {
	assert.equal(redirectForRequest(req("https://example.com/elsewhere"), undefined, { redirects }), "https://example.org/x");
});

test("www and extra hosts go to the canonical domain when PUBLIC_SITE_URL is set", () => {
	const extraHosts = new Set(["old-name.com"]);
	assert.equal(redirectForRequest(req("https://www.example.com/about"), "https://example.com", { redirects, extraHosts }), "https://example.com/about");
	assert.equal(redirectForRequest(req("https://old-name.com/old-page"), "https://example.com", { redirects, extraHosts }), "https://example.com/about");
});

test("without PUBLIC_SITE_URL, hosts are left alone", () => {
	assert.equal(redirectForRequest(req("https://www.example.com/about"), "", { redirects }), null);
});

test("API requests are never redirected", () => {
	assert.equal(redirectForRequest(req("https://www.example.com/api/studio/session"), "https://example.com", { redirects: { "/api/studio/session": "/" } }), null);
});
