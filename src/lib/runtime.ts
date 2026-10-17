/**
 * True when running on a hosted deployment (Vercel, Cloudflare Workers, or any
 * production server) rather than `npm run dev` on your own computer. Hosted
 * deployments can't run local CLI tools, so the Studio uses the Anthropic API.
 */
export function isCloudflareWorker(
  userAgent = globalThis.navigator?.userAgent,
): boolean {
  if (userAgent === "Cloudflare-Workers") return true;
  if (typeof process !== "undefined" && process.env?.VERCEL) return true;
  return false;
}
