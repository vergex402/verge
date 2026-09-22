// Same banner for Twitter's preferred image route.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Verge HTTP 402 for AI agents on Robinhood";
export const contentType = "image/jpeg";
export const size = { width: 1280, height: 426 };

export default async function TwitterImage() {
  const buffer = await readFile(join(process.cwd(), "public", "banner.jpg"));
  return new Response(buffer, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
