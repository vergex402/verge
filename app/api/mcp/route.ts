// POST /api/mcp — MCP-over-HTTP server for AI agents.
// Exposes tools: inspect_endpoint, list_marketplace, create_invoice, get_reputation.
// Agents (Claude, ChatGPT, Cursor) can add this as an MCP server.

import { NextRequest } from 'next/server';
import { allowRateLimit } from '@/app/lib/db';
import { rateLimitResponse, requestIp } from '@/app/lib/request-security';

export const runtime = 'nodejs';

const TOOLS = [
  {
    name: 'inspect_endpoint',
    description: 'Fetch an x402 endpoint URL and parse the HTTP 402 payment requirements without spending any funds. Returns the challenge, required network, asset, amount, and recipient.',
    inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'The endpoint URL to inspect' } }, required: ['url'] }
  },
  {
    name: 'list_marketplace',
    description: 'List all verified paid API endpoints in the Verge marketplace. Returns name, URL, price in USDG, network, and stats.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Max results (default 20)' } } }
  },
  {
    name: 'create_invoice',
    description: 'Create a shareable payment link (invoice) for a given amount of USDG. Returns a /pay/<id> URL that anyone can pay via wallet or x402.',
    inputSchema: { type: 'object', properties: { amount: { type: 'number', description: 'Amount in USDG' }, description: { type: 'string', description: 'What this payment is for' }, wallet: { type: 'string', description: 'Recipient wallet address on Robinhood Chain' } }, required: ['amount', 'wallet'] }
  },
  {
    name: 'get_reputation',
    description: 'Look up the on-chain reputation score (0-100) for a wallet address based on verified x402 settlements through Verge.',
    inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'EVM wallet address (0x...)' } }, required: ['address'] }
  },
];

async function callTool(name: string, args: Record<string, unknown>, req: NextRequest): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://vergesnowy.com';

  if (name === 'inspect_endpoint') {
    const url = String(args.url || '');
    if (!url) throw new Error('url required');
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Verge-MCP/1.0' }, signal: AbortSignal.timeout(8000) });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    const paymentRequired = res.headers.get('payment-required');
    let challenge = null;
    if (paymentRequired) { try { challenge = JSON.parse(Buffer.from(paymentRequired, 'base64').toString()); } catch {} }
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    return { status: res.status, paymentRequired: res.status === 402, challenge, headers: Object.fromEntries(Object.entries(headers).slice(0, 8)), body };
  }

  if (name === 'list_marketplace') {
    const limit = Number(args.limit) || 20;
    const res = await fetch(`${base}/api/marketplace`, { headers: { 'User-Agent': 'Verge-MCP/1.0' } });
    const d = await res.json();
    const eps = (d.endpoints || []).slice(0, limit);
    return { count: eps.length, endpoints: eps.map((e: Record<string, unknown>) => ({ id: e.id, name: e.name, url: e.url, price: e.price, network: e.network, paidCalls: e.paidCallsCount })) };
  }

  if (name === 'create_invoice') {
    const amount = Number(args.amount);
    const wallet = String(args.wallet || '');
    const description = String(args.description || '');
    if (!amount || amount <= 0) throw new Error('amount must be positive');
    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) throw new Error('wallet must be a valid EVM address');
    // Create invoice directly in DB without requiring a session
    const { randomBytes } = await import('node:crypto');
    const { query } = await import('@/app/lib/db');
    const id = `inv_${randomBytes(10).toString('base64url').replace(/[^a-z0-9]/gi,'').slice(0, 14)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    await query(`INSERT INTO invoices(id, wallet, description, amount_usdg, network, status, expires_at, created_at) VALUES ($1,$2,$3,$4,'robinhood-mainnet','pending',$5,$6)`, [id, wallet.toLowerCase(), description, amount, expiresAt, now]);
    return { id, url: `${base}/pay/${id}`, description, amountUsdg: amount, network: 'robinhood-mainnet', expiresAt };
  }

  if (name === 'get_reputation') {
    const address = String(args.address || '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Invalid EVM address');
    const res = await fetch(`${base}/api/reputation?address=${encodeURIComponent(address)}`, { headers: { 'User-Agent': 'Verge-MCP/1.0' } });
    const d = await res.json();
    return d;
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function GET() {
  // MCP server discovery — return list of tools
  return Response.json({ name: 'Verge MCP Server', version: '1.0', tools: TOOLS });
}

export async function POST(req: NextRequest) {
  if (!(await allowRateLimit(`mcp:${requestIp(req)}`, 60))) return rateLimitResponse();

  let body: { method?: string; params?: { name?: string; arguments?: Record<string, unknown> }; id?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: { code: -32700, message: 'Parse error' } }, { status: 400 }); }

  const id = body.id ?? null;

  // MCP protocol methods
  if (body.method === 'tools/list') {
    return Response.json({ id, result: { tools: TOOLS } });
  }

  if (body.method === 'tools/call') {
    const toolName = body.params?.name || '';
    const toolArgs = body.params?.arguments || {};
    try {
      const result = await callTool(toolName, toolArgs, req);
      return Response.json({ id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
    } catch (err) {
      return Response.json({ id, error: { code: -32603, message: err instanceof Error ? err.message : 'Tool error' } });
    }
  }

  // Legacy JSON-RPC shape
  if (body.method === 'initialize') {
    return Response.json({ id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'Verge MCP Server', version: '1.0' } } });
  }

  return Response.json({ id, error: { code: -32601, message: `Method not found: ${body.method}` } });
}
