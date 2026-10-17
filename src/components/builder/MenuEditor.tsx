// The Menu editor — staff edit the site's top navigation: add/remove links,
// drag to reorder, dropdown items under each, and the "Plan a Visit" button.
// Saves through the same pipeline as pages (instant locally, ~1–2 min live).

import { useEffect, useRef, useState } from "react";

type NavItem = { label: string; href: string; blurb?: string };
type NavGroup = { label: string; href: string; items: NavItem[]; _open?: boolean };
type Nav = { groups: NavGroup[]; cta: { label: string; href: string } };

const api = (path: string, opts?: RequestInit) =>
	fetch(path, { headers: { "content-type": "application/json" }, ...opts }).then((r) => r.json());

export default function MenuEditor({ paths, say, onSaved, onDirty }: {
	paths: Array<{ path: string; title: string }>;
	say: (m: string) => void;
	onSaved: () => void;
	onDirty: (dirty: boolean) => void;
}) {
	const [nav, setNav] = useState<Nav | null>(null);
	const [version, setVersion] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [loadError, setLoadError] = useState("");
	useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
	useEffect(() => {
		if (!dirty) return;
		const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);
	const dragFrom = useRef<number | null>(null);

	async function load() {
		setLoadError("");
		try { const r = await api("/api/studio/nav"); if (!r.nav) throw new Error(r.error || "Couldn’t load navigation."); setNav(r.nav); setVersion(r.version); }
		catch (e) { setLoadError((e as Error).message); }
	}
	useEffect(() => { load(); }, []);

	if (!nav) return <div style={{ padding: 24, color: "var(--studio-muted)" }}>{loadError ? <p role="alert">{loadError} <button className="builder-button" onClick={load}>Try again</button></p> : "Loading the menu…"}</div>;
	const uniquePaths = Array.from(new Map(paths.map((path) => [path.path, path])).values());

	const up = (fn: (n: Nav) => void, contentChange = true) => { if (saving) return; if (contentChange) setDirty(true); setNav((prev) => { const n = structuredClone(prev!); fn(n); return n; }); };

	async function save() {
		setSaving(true);
		try {
			const res = await api("/api/studio/nav", { method: "POST", body: JSON.stringify({ nav, version }) });
			if (res.ok) { setNav(res.nav); setVersion(res.version); setDirty(false); say("Header saved ✓"); onSaved(); }
			else say(res.error || "Couldn't save the menu");
		} catch { say("Couldn’t save the header. Your changes are still here."); } finally { setSaving(false); }
	}

	return (
		<div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 60px" }}>
			<datalist id="me-paths">
				{uniquePaths.map((p) => <option value={p.path} key={p.path}>{p.title}</option>)}
			</datalist>

			<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>

				<h2 style={{ margin: 0, fontSize: 20 }}>Navigation</h2>
				<div style={{ flex: 1 }} />
				<button style={{ ...S.btn, opacity: saving ? 0.5 : 1 }} disabled={saving || !dirty} onClick={save}>
					{saving ? "Saving…" : "Save header"}
				</button>
			</div>
			<p style={{ color: "var(--studio-muted)", fontSize: 13, margin: "0 0 18px" }}>
				Arrange the public header here. Drag sections to reorder; open one to arrange its dropdown links. All pages groups related pages beneath their parent. Changes go live only when you save the header.
			</p>

			<fieldset disabled={saving} style={{ border: 0, padding: 0, minWidth: 0 }}>
			{nav.groups.map((g, i) => (
				<div
					key={i}
					draggable
					onDragStart={() => { dragFrom.current = i; }}
					onDragOver={(e) => e.preventDefault()}
					onDrop={() => {
						const from = dragFrom.current; dragFrom.current = null;
						if (from == null || from === i) return;
						up((n) => { const [m] = n.groups.splice(from, 1); n.groups.splice(i, 0, m); });
					}}
					style={S.group}
				>
					<div className="menu-editor__group-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<span style={{ color: "var(--studio-muted)", cursor: "grab", userSelect: "none" }}>⠿</span>
						<input className="menu-editor__main-input" style={{ ...S.input, flex: 1 }} value={g.label} placeholder="Menu label"
							onChange={(e) => up((n) => { n.groups[i].label = e.target.value; })} />
						<input className="menu-editor__main-input" style={{ ...S.input, flex: 1.4 }} value={g.href} list="me-paths" placeholder="/link"
							onChange={(e) => up((n) => { n.groups[i].href = e.target.value; })} />
						<button style={S.small} onClick={() => up((n) => { (n.groups[i] as any)._open = !(n.groups[i] as any)._open; }, false)}>
							{g.items.length} dropdown {g.items.length === 1 ? "page" : "pages"} {(g as any)._open ? "▴" : "▾"}
						</button>
						<button style={{ ...S.small, color: "var(--studio-danger)" }} title="Remove this menu entry"
							onClick={() => { if (window.confirm(`Remove "${g.label}" from the menu?`)) up((n) => { n.groups.splice(i, 1); }); }}>✕</button>
					</div>

					{(g as any)._open && (
						<div style={{ marginTop: 10, display: "grid", gap: 8, paddingLeft: 22 }}>
							{g.items.map((it, j) => (
								<div className="menu-editor__item" key={j} style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr auto", alignItems: "start" }}>
									<input style={S.input} value={it.label} placeholder="Link label"
										onChange={(e) => up((n) => { n.groups[i].items[j].label = e.target.value; })} />
									<input style={S.input} value={it.href} list="me-paths" placeholder="/link"
										onChange={(e) => up((n) => { n.groups[i].items[j].href = e.target.value; })} />
									<button style={{ ...S.small, color: "var(--studio-danger)" }} title="Remove link"
										onClick={() => up((n) => { n.groups[i].items.splice(j, 1); })}>✕</button>
									<input className="menu-editor__blurb" style={{ ...S.input, gridColumn: "1 / 3", fontSize: 12 }} value={it.blurb || ""} placeholder="One-line description shown under the link (optional)"
										onChange={(e) => up((n) => { n.groups[i].items[j].blurb = e.target.value; })} />
								</div>
							))}
							<button style={{ ...S.small, justifySelf: "start" }}
								onClick={() => up((n) => { n.groups[i].items.push({ label: "New link", href: "/", blurb: "" }); (n.groups[i] as any)._open = true; })}>
								+ Add dropdown link
							</button>
						</div>
					)}
				</div>
			))}

			<button style={{ ...S.small, marginTop: 4 }}
				onClick={() => up((n) => { n.groups.push({ label: "New entry", href: "/", items: [] }); })}>
				+ Add header section
			</button>

			<h2 style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#9aa3b2", margin: "26px 0 8px" }}>Highlighted button</h2>
			<div style={{ display: "flex", gap: 8 }}>
				<input style={{ ...S.input, flex: 1 }} value={nav.cta.label}
					onChange={(e) => up((n) => { n.cta.label = e.target.value; })} />
				<input style={{ ...S.input, flex: 1.4 }} value={nav.cta.href} list="me-paths"
					onChange={(e) => up((n) => { n.cta.href = e.target.value; })} />
			</div>
			</fieldset>
		</div>
	);
}

const S: Record<string, React.CSSProperties> = {
	group: { border: "1px solid var(--studio-line)", background: "var(--studio-panel)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 },
	input: { minWidth: 0, font: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--studio-line)", background: "var(--studio-panel-raised)", color: "var(--studio-text)" },
	small: { font: "inherit", fontSize: 13, background: "transparent", color: "var(--studio-muted)", border: "1px solid var(--studio-line)", borderRadius: 8, padding: "6px 10px", cursor: "pointer" },
	btn: { font: "inherit", fontWeight: 600, border: 0, borderRadius: 10, padding: "9px 16px", background: "linear-gradient(135deg,#ffe7bf,var(--studio-accent))", color: "var(--studio-accent-ink)", cursor: "pointer" },
};
