// POST /api/workbench — in-browser workbench command runner.
// Supports: inspect <url>, pay <url>, curl <url>, help.
// "inspect" fetches the URL and parses the 402 challenge without paying.
// "pay" is UI-only — actual payment happens client-side via wallet; this just inspects.

import { NextRequest } from "next/server";
import { allowRateLimit } from "@/app/lib/db";
import { rateLimitResponse, requestIp } from "@/app/lib/request-security";

export const runtime = "nodejs";

interface WorkbenchResult {
  ok: boolean;
  cmd: string;
  output: string;
  data?: unknown;
  statusCode?: number;
}

function fmt(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}

async function inspectUrl(rawUrl: string): Promise<WorkbenchResult> {
  // Validate URL
  let url: URL;
  try {
    url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http/https allowed");
    // Block private ranges
    const host = url.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) && process.env.NODE_ENV === "production") {
      return { ok: false, cmd: `inspect ${rawUrl}`, output: "Error: private/loopback URLs are not allowed." };
    }
  } catch {
    return { ok: false, cmd: `inspect ${rawUrl}`, output: `Error: invalid URL — ${rawUrl}` };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "User-Agent": "Verge-Workbench/1.0" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const statusLine = `HTTP ${res.status} ${res.statusText}`;
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    let body: unknown;
    const ct = res.headers.get("content-type") || "";
    try {
      body = ct.includes("json") ? await res.json() : await res.text();
    } catch {
      body = "(unreadable body)";
    }

    if (res.status === 402) {
      // Parse x402 payment requirements
      const paymentRequired = res.headers.get("payment-required");
      const wwwAuth = res.headers.get("www-authenticate");
      let parsed: unknown = null;
      if (paymentRequired) {
        try { parsed = JSON.parse(Buffer.from(paymentRequired, "base64").toString()); } catch {}
      }

      const lines: string[] = [
        `▶ ${statusLine}`,
        ``,
        `HTTP 402 Payment Required — this endpoint is behind an x402 paywall.`,
        ``,
      ];
      if (parsed) {
        lines.push(`Payment requirements (PAYMENT-REQUIRED header):`);
        lines.push(fmt(parsed));
      } else if (wwwAuth) {
        lines.push(`WWW-Authenticate: ${wwwAuth}`);
      }
      if (body && typeof body === "object") {
        lines.push(``, `Response body:`, fmt(body));
      }
      lines.push(``, `→ To pay: connect your wallet in the app and use the Live Demo, or call this endpoint with an x402 client.`);
      return { ok: true, cmd: `inspect ${rawUrl}`, output: lines.join("\n"), data: { status: res.status, headers, paymentRequired: parsed, body }, statusCode: res.status };
    }

    const lines = [
      `▶ ${statusLine}`,
      ``,
      `Response headers:`,
      ...Object.entries(headers).slice(0, 12).map(([k, v]) => `  ${k}: ${v}`),
      ``,
      `Response body:`,
      typeof body === "string" ? body.slice(0, 800) : fmt(body),
    ];
    return { ok: true, cmd: `inspect ${rawUrl}`, output: lines.join("\n"), data: { status: res.status, headers, body }, statusCode: res.status };
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, cmd: `inspect ${rawUrl}`, output: `Error: ${msg}`, statusCode: 0 };
  }
}

function helpText(): WorkbenchResult {
  return {
    ok: true,
    cmd: "help",
    output: `Verge Workbench — available commands:

  inspect <url>          Fetch an endpoint and parse the HTTP 402 challenge.
                         Shows payment requirements without spending any funds.

  curl <url>             Alias for inspect.

  clear                  Clear the terminal output (client-side).

  help                   Show this help text.

Examples:
  inspect https://vergesnowy.com/x/random-joke-ab12cd34
  inspect https://api.example.com/v1/premium
  curl https://vergesnowy.com/api/health`,
  };
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`workbench:${requestIp(req)}`, 60))) return rateLimitResponse();

  let body: { command?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false, output: "Error: invalid request body." }); }

  const raw = (body.command ?? "").trim();
  const [cmd, ...args] = raw.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "inspect":
    case "curl": {
      const url = args.join(" ").trim();
      if (!url) return Response.json({ ok: false, cmd: raw, output: `Error: URL required. Usage: inspect <url>` });
      return Response.json(await inspectUrl(url));
    }
    case "help":
    case "?":
      return Response.json(helpText());
    case "clear":
      return Response.json({ ok: true, cmd: "clear", output: "", clear: true });
    case "":
      return Response.json({ ok: true, cmd: "", output: "" });
    default:
      return Response.json({
        ok: false,
        cmd: raw,
        output: `Unknown command: ${cmd}\nType "help" for available commands.`,
      });
  }
}
