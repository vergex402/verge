// Favicon (Next 16 file convention) — served from public/verge-logo.jpeg
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 256, height: 256 };
export const contentType = "image/jpeg";

export default async function Icon() {
  const buffer = await readFile(join(process.cwd(), "public", "verge-logo.jpeg"));
  return new Response(buffer, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
