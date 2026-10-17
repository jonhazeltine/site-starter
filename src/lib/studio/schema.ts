// The FENCE — the only fields the AI editor is allowed to touch.
//
// This is Stage 1's safety boundary. The editor (and, later, Claude) can read
// and change ONLY the paths listed here, inside content/site.json. Everything
// else on the site — layout, styling, code, config, and any content not on
// this list — is out of reach. New editable fields are opened up by adding a
// row here, deliberately, in code.

export type EditableField = {
	/** dot-path into content/site.json, e.g. "site.tagline" or "highlights.0.verb" */
	path: string;
	/** human label shown in the editor and given to the AI */
	label: string;
	/** grouping for display */
	group: string;
	/** longer copy fields render as a textarea */
	multiline?: boolean;
	/** one-line hint about what this field is / rules for it */
	hint?: string;
};

// Static (non-array) editable fields.
const STATIC_FIELDS: EditableField[] = [
	{ path: "site.name", label: "Site name", group: "Site basics" },
	{ path: "site.shortName", label: "Short name", group: "Site basics" },
	{ path: "site.tagline", label: "Tagline", group: "Site basics", hint: "The short line under the site name." },
	{ path: "site.location", label: "Location", group: "Contact", hint: 'e.g. "Portland, OR". Leave blank to hide.' },
	{ path: "site.phone", label: "Phone", group: "Contact" },
	{ path: "site.email", label: "Email", group: "Contact" },
];

/**
 * Build the full editable-field list against the current content, expanding
 * array-backed fields (like each homepage highlight) to their real indices.
 */
export function editableFields(content: any): EditableField[] {
	const fields = [...STATIC_FIELDS];

	const highlights = Array.isArray(content?.highlights) ? content.highlights : [];
	highlights.forEach((m: any, i: number) => {
		fields.push({
			path: `highlights.${i}.verb`,
			label: `Highlight ${m?.n ?? String(i + 1).padStart(2, "0")}`,
			group: "Highlights",
			hint: "One of the short highlights on the homepage.",
		});
	});

	return fields;
}

/** True if a dot-path is inside the fence for the given content. */
export function isEditable(content: any, path: string): boolean {
	return editableFields(content).some((f) => f.path === path);
}
