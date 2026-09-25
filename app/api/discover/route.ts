import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export async function GET(_req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://vergesnowy.com';
  return Response.json({
    name: 'Verge',
    description: 'HTTP 402 payment gateway for AI agents. Pay-per-request APIs on Robinhood Chain (USDG) and 6 other rails.',
    version: '0.7',
    protocol: 'x402-v2',
    facilitator: `${base}/api/facilitator`,
    catalog: `${base}/api/catalog`,
    mcp: `${base}/api/mcp`,
    llmsTxt: `${base}/llms.txt`,
    docs: `${base}/docs`,
    sdk: {
      fetch: '@vergex402/fetch',
      express: '@vergex402/express',
      hono: '@vergex402/hono',
      npm: 'https://www.npmjs.com/search?q=%40vergex402'
    },
    rails: [
      { id: 'robinhood-mainnet', chain: 4663, asset: 'USDG', default: true },
      { id: 'base-mainnet', chain: 8453, asset: 'USDC' },
      { id: 'ethereum-mainnet', chain: 1, asset: 'USDC' },
      { id: 'arbitrum-mainnet', chain: 42161, asset: 'USDC' },
      { id: 'polygon-mainnet', chain: 137, asset: 'USDC' },
      { id: 'solana-mainnet', chain: null, asset: 'USDC' },
      { id: 'sui-mainnet', chain: null, asset: 'USDC' },
    ],
    supportedEvents: ['payment.settled', 'endpoint.called'],
    contact: 'https://github.com/vergex402/verge',
  }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
