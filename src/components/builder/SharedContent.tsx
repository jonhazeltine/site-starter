import { useEffect, useState } from "react";

type Field = { path: string; label: string; group: string; hint: string | null; value: string };

export default function SharedContent({ onDirty }: { onDirty: (dirty: boolean) => void }) {
	const [fields, setFields] = useState<Field[]>([]);
	const [values, setValues] = useState<Record<string, string>>({});
	const [version, setVersion] = useState("");
	const [busy, setBusy] = useState(false);
	const [review, setReview] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loaded, setLoaded] = useState(false);
	const edits = fields.filter((f) => values[f.path] !== f.value).map((f) => ({ path: f.path, from: f.value, to: values[f.path] }));

	async function load() {
		setBusy(true); setError(""); setMessage("");
		try {
			const response = await fetch("/api/studio/content");
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || "Couldn't load shared content.");
			const next = result.fields.map((f: Field) => ({ ...f, value: String(f.value ?? "") }));
			setFields(next); setValues(Object.fromEntries(next.map((f: Field) => [f.path, f.value])));
			setVersion(result.version); setReview(false); setLoaded(true);
		} catch (e) { setError((e as Error).message); }
		finally { setBusy(false); }
	}
	useEffect(() => { load(); }, []);
	useEffect(() => { onDirty(edits.length > 0); }, [edits.length, onDirty]);
	useEffect(() => {
		if (!edits.length) return;
		const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [edits.length]);

	async function publish() {
		if (!review || !edits.length || busy) return;
		setBusy(true); setError("");
		try {
			const response = await fetch("/api/studio/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ edits, version, summary: "Shared content updated in Studio" }) });
			const result = await response.json();
			if (!response.ok || !result.ok) throw new Error(result.error || "Couldn't publish. Your edits are still here.");
			setFields((current) => current.map((field) => ({ ...field, value: values[field.path] })));
			setVersion(result.version.id); setReview(false); setMessage("Shared content published. These changes now appear wherever the site uses these details.");
		} catch (e) { setError((e as Error).message); }
		finally { setBusy(false); }
	}

	return <section className="builder-shared">
		<div className="builder-directory__section-heading"><div><h2>Shared content</h2><p>Update site details once for the pages that use them.</p></div></div>
		{error && <p role="alert">{error} <button className="builder-button" disabled={busy} onClick={() => { if (!edits.length || window.confirm("Discard your unpublished changes and reload the latest details?")) load(); }}>Reload latest details</button></p>}
		{message && <p role="status">{message}</p>}
		{!loaded && busy && <p role="status">Loading shared content…</p>}
		{loaded && <form onSubmit={(e) => { e.preventDefault(); setReview(true); setMessage(""); }}>
			<fieldset disabled={busy || review} className="builder-shared__fields">
				{[...new Set(fields.map((f) => f.group))].map((group) => <section key={group}><h3>{group}</h3>{fields.filter((f) => f.group === group).map((field) => <label key={field.path}>{field.label}<input type={field.path === "site.email" ? "email" : "text"} value={values[field.path] ?? ""} onChange={(e) => { setValues((current) => ({ ...current, [field.path]: e.target.value })); setMessage(""); }} />{field.hint && <small>{field.hint}</small>}</label>)}</section>)}
			</fieldset>
			{!review && <div className="builder-shared__actions"><p>Changes stay here until you review and publish them.</p><button type="submit" className="builder-button builder-button--primary" disabled={busy || !edits.length}>Review changes{edits.length ? ` (${edits.length})` : ""}</button></div>}
			{review && <section className="builder-shared__review" aria-label="Review shared content changes"><h3>Review before publishing</h3>{edits.map((edit) => <div key={edit.path}><strong>{fields.find((f) => f.path === edit.path)?.label}</strong><p>Before: {edit.from || "(empty)"}</p><p>After: {edit.to || "(empty)"}</p></div>)}<div className="builder-shared__actions"><button type="button" className="builder-button" disabled={busy} onClick={() => setReview(false)}>Keep editing</button><button type="button" className="builder-button builder-button--primary" disabled={busy} onClick={publish}>{busy ? "Publishing…" : "Publish shared content"}</button></div></section>}
		</form>}
	</section>;
}
