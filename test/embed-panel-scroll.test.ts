import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	clampEmbedHeight,
	parseEmbedHeightMessage,
	findEmbedFrame,
	MIN_EMBED_HEIGHT,
	MAX_EMBED_HEIGHT,
} from "../src/lib/embed/panel-height";
import { blocksConfig } from "../src/components/builder/blocks.tsx";
import fs from "node:fs";

// The inline tap/next-steps panels used to nest three scrollers (page, panel,
// iframe content). The fix: a frame we control posts its real height up via
// postMessage, and the panel listener in MountedPage.astro (backed by these
// pure helpers) grows the panel to match instead of giving the frame its own
// scrollbar. These tests cover the two things most likely to regress
// silently — clamping to a sane minimum/maximum, and only ever trusting the
// iframe that actually sent the message.

test("parseEmbedHeightMessage accepts only a well-formed nlgr-embed-height payload", () => {
	assert.equal(parseEmbedHeightMessage({ type: "nlgr-embed-height", height: 480 }), 480);
	assert.equal(parseEmbedHeightMessage({ type: "nlgr-embed-height", height: "612" }), 612);
	assert.equal(parseEmbedHeightMessage(null), null);
	assert.equal(parseEmbedHeightMessage(undefined), null);
	assert.equal(parseEmbedHeightMessage("just a string"), null);
	assert.equal(parseEmbedHeightMessage({ type: "something-else", height: 480 }), null);
	assert.equal(parseEmbedHeightMessage({ type: "nlgr-embed-height", height: 0 }), null);
	assert.equal(parseEmbedHeightMessage({ type: "nlgr-embed-height", height: -40 }), null);
	assert.equal(parseEmbedHeightMessage({ type: "nlgr-embed-height", height: "not a number" }), null);
});

test("clampEmbedHeight never collapses the panel to nothing or lets it run away", () => {
	assert.equal(clampEmbedHeight(1), MIN_EMBED_HEIGHT);
	assert.equal(clampEmbedHeight(0), MIN_EMBED_HEIGHT);
	assert.equal(clampEmbedHeight(-500), MIN_EMBED_HEIGHT);
	assert.equal(clampEmbedHeight(612), 612);
	assert.equal(clampEmbedHeight(612.4), 612);
	assert.equal(clampEmbedHeight(500000), MAX_EMBED_HEIGHT);
});

test("the maximum is a sanity bound only, high enough that a long page like Growth Track never scrolls inside its panel", () => {
	assert.equal(MAX_EMBED_HEIGHT, 20000);
	assert.equal(clampEmbedHeight(12000), 12000);
});

test("findEmbedFrame matches only the iframe whose contentWindow sent the message", () => {
	const ours = { contentWindow: { id: "ours" } };
	const thirdParty = { contentWindow: { id: "third-party" } };
	const frames = [ours, thirdParty];

	assert.equal(findEmbedFrame(frames, ours.contentWindow), ours);
	assert.equal(findEmbedFrame(frames, thirdParty.contentWindow), thirdParty);
	// A message whose source is some other window (e.g. an ad inside
	// fixed-height (e.g. donation form), or a stray message from elsewhere on the page) matches
	// nothing, so it can never resize a panel it didn't come from.
	assert.equal(findEmbedFrame(frames, { id: "not one of ours" }), null);
	assert.equal(findEmbedFrame(frames, null), null);
	assert.equal(findEmbedFrame([], ours.contentWindow), null);
});

test("a fixed-height (e.g. donation form) button with no explicit height falls back to a phone-tuned fixed height", () => {
	const tapButtons = blocksConfig.components.TapButtons;
	const html = renderToStaticMarkup(
		tapButtons.render({
			links: [{ label: "Give", href: "https://donate.example.com/x", embed: "securegive" }],
		} as any),
	);
	assert.match(html, /--tapbtn-embed-panel-height:760px/);
});

test("an explicit embedHeight still overrides the fixed-height (e.g. donation form) default", () => {
	const tapButtons = blocksConfig.components.TapButtons;
	const html = renderToStaticMarkup(
		tapButtons.render({
			links: [{ label: "Give", href: "https://donate.example.com/x", embed: "securegive", embedHeight: "500px" }],
		} as any),
	);
	assert.match(html, /--tapbtn-embed-panel-height:500px/);
});
