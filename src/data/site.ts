// Central, site-wide content. The editable basics live in content/site.json
// (and can be changed from the Studio); technical links stay here in code.

import siteContent from "../../content/site.json";
import { readContent } from "../lib/studio/store";

export type Highlight = { n: string; verb: string };

function siteFor(content: any) {
	const s = content?.site ?? {};
	return {
		name: s.name ?? "My Site",
		shortName: s.shortName ?? s.name ?? "My Site",
		tagline: s.tagline ?? "",
		email: s.email ?? "",
		phone: s.phone ?? "",
		location: s.location ?? "",
		// Replace these with your own profiles, or delete the ones you don't use.
		social: {
			instagram: "https://www.instagram.com/",
			youtube: "https://www.youtube.com/",
		} as Record<string, string>,
	};
}

/** Build-time copy (the seed in content/site.json). */
export const site = siteFor(siteContent);
export const highlights: Highlight[] = (siteContent as any).highlights ?? [];

/** Runtime copy for hosted pages: includes anything published from the Studio. */
export async function runtimeSite(locals?: Record<string, any>) {
	const content = await readContent(locals);
	return { site: siteFor(content), highlights: (content?.highlights ?? []) as Highlight[] };
}
