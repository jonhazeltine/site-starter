// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
	// Your public address. Set PUBLIC_SITE_URL in Vercel (e.g. https://example.com).
	site: process.env.PUBLIC_SITE_URL ?? "https://example.com",
	integrations: [mdx(), react()],
	adapter: vercel(),
	// The Studio agent runs a build to verify its edits; don't let that build's
	// output disturb the dev server's file watcher (or its route manifest).
	vite: {
		server: { watch: { ignored: ["**/.vercel/**", "**/dist/**", "**/.studio/**"] } },
	},
	// Simple permanent redirects, e.g. "/old": "/new". (domain-redirects.mjs
	// handles anything that needs code, like domain changes.)
	redirects: {},
});
