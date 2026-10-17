// The visual page builder app: Puck drag-and-drop + the AI co-editor.
// Staff pick or create a page, drag brand blocks around, edit text inline in
// the side panel, or type a request into the AI bar — the AI rewrites the same
// page document and the change appears in the editor for review. Publish saves.

import { useEffect, useRef, useState, useCallback } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { blocksConfig } from "./blocks";
import MenuEditor from "./MenuEditor";
import SharedContent from "./SharedContent";
import PagePreview from "./PagePreview";
import { allDirectoryPages, directoryTree, filterDirectoryPages, navigationLabels, pageEditHref, type DirectoryTreePage } from "../../lib/studio/directory";

type PageMeta = { slug: string; title: string; description: string; previewImage: string; status: "draft" | "live"; order: number; path: string; mounted: boolean };
type SitePageMeta = { path: string; title: string; previewImage: string; status: "draft" | "live" };
type PageFilter = "all" | "live" | "draft";
type NavItem = { label: string; href: string; blurb?: string };
type NavGroup = { label: string; href: string; items: NavItem[] };
type Nav = { groups: NavGroup[]; cta: { label: string; href: string } };

const EMPTY = (title: string) => ({
	status: "draft" as const,
	order: 0,
	root: { props: { title, kicker: "My Site" } },
	content: [],
	zones: {},
});

function slugify(s: string) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const api = (path: string, opts?: RequestInit) =>
	fetch(path, { headers: { "content-type": "application/json" }, ...opts }).then((r) => r.json());

type Appearance = "auto" | "light" | "dark";

function systemAppearance(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function StudioAppearance() {
	const [choice, setChoice] = useState<Appearance>(() => (localStorage.getItem("site-theme") as Appearance) || "auto");
	const [open, setOpen] = useState(false);

	const apply = (next: Appearance) => {
		localStorage.setItem("site-theme", next);
		document.documentElement.dataset.themeChoice = next;
		document.documentElement.dataset.theme = next === "auto" ? systemAppearance() : next;
		setChoice(next);
		setOpen(false);
	};

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			if ((localStorage.getItem("site-theme") || "auto") === "auto") {
				document.documentElement.dataset.theme = systemAppearance();
			}
		};
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);

	return (
		<div className="builder-appearance">
			<button className="builder-appearance__trigger" type="button" aria-expanded={open} aria-haspopup="true" aria-label="Choose appearance" onClick={() => setOpen((value) => !value)}>
				◐ <span>{choice[0].toUpperCase() + choice.slice(1)}</span>
			</button>
			{open && (
				<div className="builder-appearance__menu" role="menu">
					{(["auto", "light", "dark"] as Appearance[]).map((option) => (
						<button key={option} type="button" role="menuitemradio" aria-checked={choice === option} onClick={() => apply(option)}>
							{option[0].toUpperCase() + option.slice(1)}
							<span>{option === "auto" ? "Follows your device" : option === "light" ? "Warm and open" : "Evening atmosphere"}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export default function BuilderApp() {
	const [pages, setPages] = useState<PageMeta[]>([]);
	const [sitePages, setSitePages] = useState<SitePageMeta[]>([]);
	const [sitePagesVersion, setSitePagesVersion] = useState("seed");
	const [nav, setNav] = useState<Nav | null>(null);
	const [view, setView] = useState<"pages" | "navigation" | "shared">("pages");
	const [sharedDirty, setSharedDirty] = useState(false);
	const [navDirty, setNavDirty] = useState(false);
	const discardDirectoryEdits = () => !(sharedDirty || navDirty) || window.confirm("Leave the directory and discard unpublished shared content or navigation changes?");
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<PageFilter>("all");
	const [slug, setSlug] = useState<string | null>(null);
	const [data, setData] = useState<any>(null);
	const [versions, setVersions] = useState<Record<string, string>>({});
	const [rev, setRev] = useState(0); // bump to remount Puck after AI edits
	const [aiBusy, setAiBusy] = useState(false);
	const [aiNote, setAiNote] = useState<string>("");
	const [toast, setToast] = useState<string>("");
	const [dirty, setDirty] = useState(false); // true once the open page has edits not yet saved to its draft
	const [pendingPublish, setPendingPublish] = useState(false); // true once the draft has changes not yet published
	const live = useRef<any>(null); // latest editor data (from onChange)
	const directory = allDirectoryPages(pages, sitePages);
	const visiblePages = filterDirectoryPages(directoryTree(directory, nav), query, filter);
	const unlinkedPages = directory.filter((page) => page.path !== "/" && navigationLabels(page.path, nav).length === 0);

	const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
	const copyLink = async (path: string) => {
		try {
			await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
			say("Link copied ✓");
		} catch {
			say("Couldn't copy the link");
		}
	};

	const refresh = useCallback(async () => {
		setLoading(true); setLoadError("");
		try {
			const [res, navRes] = await Promise.all([api("/api/studio/pages"), api("/api/studio/nav")]);
			if (res.error || navRes.error) throw new Error(res.error || navRes.error);
			setPages(res.pages || []);
			setVersions(Object.fromEntries((res.pages || []).map((page: any) => [page.slug, page.version])));
			setSitePages(res.sitePages || []);
			setSitePagesVersion(res.sitePagesVersion || "seed");
			setNav(navRes.nav || null);
		} catch (error) { setLoadError((error as Error).message === "Unauthorized" ? "Your session expired. Reload and sign in again." : "Couldn't load the pages. Try again."); }
		finally { setLoading(false); }
	}, []);
	useEffect(() => { refresh(); }, [refresh]);

	async function openPage(s: string) {
		if (!discardDirectoryEdits()) return;
		const res = await api(`/api/studio/pages?slug=${encodeURIComponent(s)}`).catch(() => null);
		if (res?.data) {
			setSharedDirty(false); setNavDirty(false);
			setSlug(s); setData(res.data); setVersions((v) => ({ ...v, [s]: res.version })); live.current = res.data; setRev((r) => r + 1); setAiNote("");
			setDirty(false);
			// A page can arrive with a draft already ahead of what's published
			// (someone saved last session and never published) — reflect that
			// honestly instead of always starting the pill as if there's nothing
			// pending.
			setPendingPublish(Boolean(res.dirty));
			requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
		}
		else say(res?.error === "Unauthorized" ? "Your session expired — reload the page and sign in again." : (res?.error || "Couldn't load that page — reload and try again."));
	}

	function newPage() {
		if (!discardDirectoryEdits()) return;
		const title = window.prompt("Name the new page (e.g. Fall Retreat):");
		if (!title) return;
		const s = slugify(title);
		if (!s) return;
		setSharedDirty(false); setNavDirty(false);
		setSlug(s); setVersions((v) => ({ ...v, [s]: "seed" })); const d = EMPTY(title); setData(d); live.current = d; setRev((r) => r + 1); setAiNote("");
		setDirty(false);
		setPendingPublish(false);
		requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
	}

	// Saves to the page's DRAFT only — never what visitors see. Publish (below)
	// is the one action that pushes a draft live.
	async function save(d: any) {
		if (!slug) return;
		const res = await api("/api/studio/pages", { method: "POST", body: JSON.stringify({ slug, data: d, version: versions[slug], create: !pages.some((p) => p.slug === slug) }) });
		if (res.ok) {
			if (res.data) { setData(res.data); live.current = res.data; }
			setVersions((v) => ({ ...v, [slug]: res.version })); say("Saved ✓");
			setDirty(false);
			setPendingPublish(true);
			refresh();
		} else { say(res.error || "Couldn't save"); }
	}

	/** Push the current draft live. Used both for a page's first Publish and for pushing out edits to an already-live page. */
	async function publishPage(s: string) {
		const res = await api("/api/studio/pages", { method: "POST", body: JSON.stringify({ slug: s, publish: true }) });
		if (res.ok) {
			say(res.via === "git" ? "Publishing in a minute or two" : "Published ✓");
			if (slug === s && res.data) { setData(res.data); live.current = res.data; }
			if (slug === s) setPendingPublish(false);
			refresh();
		} else { say(res.error || "Couldn't publish"); }
	}

	/** Hide an already-live page. Content (draft and published) is untouched — this only flips visibility. */
	async function unpublishPage(s: string) {
		const res = await api("/api/studio/pages", { method: "POST", body: JSON.stringify({ slug: s, status: "draft" }) });
		if (res.ok) {
			say("Back to draft");
			if (slug === s && res.data) { setData(res.data); live.current = res.data; }
			refresh();
		} else { say(res.error || "Couldn't update"); }
	}

	/** The status pill's single action: publish when there's anything to publish, otherwise unpublish. */
	function togglePublish(s: string, status: "draft" | "live", hasPendingPublish = false) {
		return status === "live" && !hasPendingPublish ? unpublishPage(s) : publishPage(s);
	}

	async function setSiteStatus(path: string, status: "draft" | "live") {
		const res = await api("/api/studio/pages", { method: "POST", body: JSON.stringify({ sitePath: path, status, sitePagesVersion }) });
		if (res.ok) {
			setSitePagesVersion(res.version);
			setSitePages((current) => current.map((page) => page.path === path ? { ...page, status } : page));
			say(status === "live" ? "Published ✓" : "Saved as draft");
		} else {
			say(res.error || "Couldn't update");
			refresh();
		}
	}

	async function removePage(s: string, title: string) {
		if (!window.confirm(`Delete "${title}"? This removes the page completely.`)) return;
		const res = await api("/api/studio/pages", { method: "POST", body: JSON.stringify({ slug: s, delete: true, version: versions[s] }) });
		if (res.ok) { say("Deleted"); if (slug === s) { setSlug(null); setData(null); } refresh(); }
		else { say(res.error || "Couldn't delete"); }
	}

	async function askAI(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const input = (e.currentTarget.elements.namedItem("ai") as HTMLInputElement);
		const message = input.value.trim();
		if (!message || aiBusy) return;
		setAiBusy(true); setAiNote("Working on it — usually 15–30 seconds…");
		try {
			const res = await api("/api/studio/page-ai", {
				method: "POST",
				body: JSON.stringify({ message, data: live.current ?? data, title: slug }),
			});
			if (res.data) {
				setData(res.data); live.current = res.data; setRev((r) => r + 1); setDirty(true);
				setAiNote(res.reply || "Done — review the change, then Publish.");
				input.value = "";
			} else {
				setAiNote(res.reply || res.error || "That didn't work — try rewording.");
			}
		} catch {
			setAiNote("Couldn't reach the AI on this machine.");
		} finally { setAiBusy(false); }
	}

	function pageRow(p: DirectoryTreePage) {
		const labels = navigationLabels(p.path, nav);
		const explanation = p.slug ? "Edit text, images and section layout." : "Opens the page’s editor for supported text and image changes.";
		const edit = () => p.slug ? openPage(p.slug) : window.location.assign(pageEditHref(p.path));
		return <article key={p.path} className="builder-page-row" style={{ marginLeft: `${Math.min(p.depth || 0, 3) * 18}px` }}>
			<button className="builder-page-row__preview" type="button" onClick={edit} aria-label={`Edit preview of ${p.title}`}><PagePreview key={p.previewImage} src={p.status === "draft" ? "" : p.previewImage} draft={p.status === "draft"} /></button>
			<div className="builder-page-row__info">
				<button className="builder-page-row__open" type="button" onClick={edit}><strong>{p.title}</strong><small>{p.path}</small></button>
				{p.parentTitle && <small className="builder-page-row__parent">↳ Under {p.parentTitle}</small>}
				<p className="builder-page-row__help">{explanation}</p>
				<small className="builder-page-row__placement">{p.path === "/" ? "Home · linked from the logo" : labels.length ? `Header: ${labels.join(" · ")}` : "Not linked in the header"}</small>
			</div>
			<div className="builder-page-row__controls">
				<button className="builder-page-row__edit" type="button" onClick={edit} aria-label={`Edit ${p.title}`}>Edit</button>
				<a className="builder-button" href={p.path} target="_blank" rel="noreferrer" aria-label={`Preview ${p.title}`}>Preview ↗</a>
				<button className="builder-button" type="button" onClick={() => copyLink(p.path)} aria-label={`Copy link for ${p.title}`}>Copy link</button>
				<button className={`builder-page-row__status builder-page-row__action builder-page-row__status--${p.status}`} type="button" onClick={() => p.slug ? togglePublish(p.slug, p.status) : setSiteStatus(p.path, p.status === "live" ? "draft" : "live")} aria-label={`${p.title} is ${p.status === "live" ? "published" : "draft"}. Click to ${p.status === "live" ? "unpublish" : "publish"}.`}>
					<span>{p.status === "live" ? "Published" : "Draft"}</span><small>{p.status === "live" ? "Click to unpublish" : "Click to publish"}</small>
				</button>
				{p.slug && !p.mounted && <details className="builder-page-row__actions"><summary aria-label={`More actions for ${p.title}`}>•••</summary><div><button className="builder-danger" onClick={() => removePage(p.slug!, p.title)}>Delete page</button></div></details>}
			</div>
		</article>;
	}

	if (!slug || !data) {
		return <div className="builder-app builder-directory">
			<header className="builder-directory__header">
				<div><p className="builder-directory__eyebrow">✦ Studio</p><h1>Your website</h1><p>Edit pages, arrange navigation and update shared information.</p></div>
				<div className="builder-directory__header-actions"><button className="builder-button builder-button--primary" onClick={newPage}>+ New page</button><StudioAppearance /></div>
			</header>
			<main className="builder-directory__main">
				<nav className="builder-view-tabs" aria-label="Studio views">
					{([ ["pages", "All pages"], ["navigation", "Navigation"], ["shared", "Shared content"] ] as const).map(([id, label]) => <button type="button" key={id} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>{label}</button>)}
				</nav>
				{loadError && <p role="alert">{loadError} <button className="builder-button" onClick={refresh}>Try again</button></p>}
				{view === "pages" && <>
					<div className="builder-directory__section-heading"><div><h2>All pages</h2><p>Related pages sit beneath their parent with a slight indent. Main sections follow the header order.</p></div><span>{visiblePages.length} {visiblePages.length === 1 ? "page" : "pages"}</span></div>
					<div className="builder-directory__tools">
						<label className="builder-search"><span className="sr-only">Search pages</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages…" /></label>
						<div className="builder-filters" aria-label="Filter pages">{(["all", "live", "draft"] as PageFilter[]).map((option) => <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)}>{option === "all" ? "All" : option === "live" ? "Published" : "Drafts"}</button>)}</div>
					</div>
					<p className="builder-directory__hint">Previews are saved page screenshots. Open Preview to see the current page; drafts are visible only to signed-in staff.</p>
					<div className="builder-page-list">{visiblePages.map(pageRow)}</div>
					{loading && <p role="status">Loading pages…</p>}
					{!loading && !loadError && visiblePages.length === 0 && <div className="builder-empty"><strong>{directory.length ? "No matching pages" : "No pages yet"}</strong><p>{directory.length ? "Try another search or filter." : "Create a page to begin."}</p></div>}
				</>}
				<div hidden={view !== "navigation"}>
					<MenuEditor paths={directory} say={say} onSaved={refresh} onDirty={setNavDirty} />
					<section className="builder-unlinked"><h2>Not linked in the header</h2><p>These pages may still be reached through other pages or a direct link. Publishing a page does not add it to the menu.</p>
						<ul>{unlinkedPages.map((p) => <li key={p.path}><strong>{p.title}</strong> <span>{p.path}</span><button className="builder-button" onClick={() => copyLink(p.path)}>Copy link</button></li>)}</ul>
					</section>
				</div>
				<div hidden={view !== "shared"}><SharedContent onDirty={setSharedDirty} /></div>
				<a className="builder-directory__back" href="/">← Back to the site</a>
			</main>
			{toast && <div style={S.toast} role="status">{toast}</div>}
		</div>;
	}

	// ---- editor screen ----
	return (
		<div className="builder-app" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			<div className="builder-editor-bar">
				<button className="builder-button builder-button--secondary" onClick={() => { setSlug(null); setData(null); refresh(); }}>‹ Site pages</button>
				<span className="builder-editor-bar__title"><small>Editing</small><strong>{data?.root?.props?.title || slug}</strong></span>
				<a className="builder-button builder-button--secondary" href={pages.find((x) => x.slug === slug)?.path || `/p/${slug}`} target="_blank" rel="noreferrer">View ↗</a>
				<StudioAppearance />
				<form onSubmit={askAI} style={{ display: "flex", gap: 8, flex: 1, minWidth: 260 }}>
					<input name="ai" placeholder='Ask AI — e.g. "build this out for a fall retreat with 3 cards and a signup button"' style={S.aiInput} disabled={aiBusy} />
					<button style={{ ...S.btn, opacity: aiBusy ? 0.5 : 1 }} disabled={aiBusy}>{aiBusy ? "…" : "✦ Ask AI"}</button>
				</form>
			</div>
			{aiNote && <div style={S.note}>{aiNote}</div>}
			<div style={{ flex: 1, minHeight: 0 }}>
				<Puck
					key={rev}
					config={blocksConfig}
					data={data}
					onChange={(d: any) => { live.current = d; setDirty(true); }}
					onPublish={save}
					overrides={{
						// Puck's own built-in button always says "Publish" — but it's
						// wired to `save`, which only writes the DRAFT and never
						// touches what visitors see. The real draft/live control lives
						// right next to it: DRAFT → publish it for the first time;
						// PUBLISHED with a saved-but-unpublished edit → push that edit
						// live (status stays live); PUBLISHED with nothing pending →
						// unpublish. Save itself only ever reflects the draft.
						headerActions: () => (
							<>
								<button
									type="button"
									className={`builder-pub-btn builder-status builder-status--${data?.status === "live" ? (pendingPublish ? "pending" : "live") : "draft"}`}
									title={data?.status !== "live" ? "Click to publish" : pendingPublish ? "Click to publish your changes" : "Click to unpublish"}
									onClick={() => togglePublish(slug, data?.status, pendingPublish)}
								>
									{data?.status !== "live"
										? "Draft · Click to publish"
										: pendingPublish
											? "Published · Click to publish"
											: "Published · Click to unpublish"}
								</button>
								<button type="button" className="builder-pub-btn builder-save-btn" onClick={() => save(live.current)} disabled={!dirty}>
									<span aria-hidden="true">✓</span> {dirty ? "Save" : "Saved"}
								</button>
							</>
						),
					}}
				/>
			</div>
			{toast && <div style={S.toast}>{toast}</div>}
		</div>
	);
}

const S: Record<string, React.CSSProperties> = {
	shell: { minHeight: "100vh", background: "var(--studio-bg)", color: "var(--studio-text)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
	btn: { font: "inherit", fontWeight: 600, border: 0, borderRadius: 10, padding: "10px 16px", background: "linear-gradient(135deg,#ffe7bf,var(--studio-accent))", color: "var(--studio-accent-ink)", cursor: "pointer" },
	aiInput: { flex: 1, font: "inherit", fontSize: 14, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--studio-line)", background: "var(--studio-panel-raised)", color: "var(--studio-text)" },
	note: { padding: "8px 14px", fontSize: 13, background: "color-mix(in srgb, var(--studio-accent) 10%, transparent)", color: "var(--studio-accent)", borderBottom: "1px solid var(--studio-line)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
	toast: { position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", background: "linear-gradient(135deg,#ffe7bf,var(--studio-accent))", color: "var(--studio-accent-ink)", fontWeight: 600, padding: "10px 16px", borderRadius: 999, zIndex: 1000 },
};
