/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Present only on platforms that expose runtime bindings (e.g. Cloudflare). */
    runtime?: { env?: { BLOB_READ_WRITE_TOKEN?: string } & Record<string, string | undefined> };
  }
}
