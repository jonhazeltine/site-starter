import { useState } from "react";

/** A page screenshot, never a share card or artwork; missing captures stay explicit. */
export default function PagePreview({ src, draft = false }: { src: string; draft?: boolean }) {
	const [failed, setFailed] = useState(false);
	return src && !failed
		? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
		: <span className="builder-page-row__placeholder"><span aria-hidden="true">▤</span><small>{draft ? "Draft page" : "Preview not captured"}</small></span>;
}
