/**
 * @vergex402/fetch — x402 v2 buyer SDK
 * payAndFetch() makes a request, handles 402 challenges by signing and paying
 * with USDG/USDC on Robinhood Chain (or any EVM chain), and retries automatically.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  type WalletClient,
  type PublicClient,
  type Chain,
  type Hash,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ---------------------------------------------------------------------------
// Chain definitions
// ---------------------------------------------------------------------------

export const ROBINHOOD_CHAIN: Chain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.robinhoodchain.com'] },
    public: { http: ['https://rpc.robinhoodchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Explorer', url: 'https://explorer.robinhoodchain.com' },
  },
};

export const USDG_CONTRACT: Address = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';

// ERC-20 ABI fragment for transfer
const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface X402Challenge {
  /** CAIP-2 network string, e.g. "eip155:4663" */
  network: string;
  /** Payment scheme, e.g. "exact" */
  scheme: string;
  /** Amount in atomic units (string to avoid JS bigint precision loss) */
  amount: string;
  /** Recipient wallet address */
  recipient: Address;
  /** ERC-20 asset contract address */
  asset: Address;
  /** Server-generated nonce */
  nonce: string;
  /** Raw accepts entry */
  raw: Record<string, unknown>;
}

export interface PaymentPayload {
  x402Version: 2;
  scheme: 'exact';
  network: string;
  payload: {
    from: Address;
    to: Address;
    value: string;
    nonce: string;
    asset: Address;
    txHash: Hash;
  };
}

export interface PayAndFetchOptions {
  /** viem WalletClient with an attached account */
  signer: WalletClient;
  /** Maximum number of payment+retry attempts (default: 2) */
  maxRetries?: number;
  /** Fetch timeout in ms (default: 30000) */
  timeout?: number;
  /** Called when a 402 challenge is received, before paying */
  onChallenge?: (challenge: X402Challenge) => void | Promise<void>;
  /** Called after payment transaction is confirmed, with the txHash */
  onPaid?: (txHash: Hash, challenge: X402Challenge) => void | Promise<void>;
}

export interface SignerContext {
  walletClient: WalletClient;
  publicClient: PublicClient;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a viem WalletClient (and a paired PublicClient) from a raw hex private key.
 * @param privateKey  - 0x-prefixed 32-byte hex string
 * @param chainId     - EVM chain ID (default: 4663 for Robinhood Chain)
 * @param rpcUrl      - Optional RPC URL override
 */
export function createSignerFromKey(
  privateKey: Hex,
  chainId: number = 4663,
  rpcUrl?: string,
): WalletClient {
  const chain = chainId === 4663 ? ROBINHOOD_CHAIN : buildChain(chainId, rpcUrl);
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl ?? chain.rpcUrls.default.http[0]);

  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });

  return walletClient;
}

/** Build a minimal Chain object for unknown chain IDs */
function buildChain(chainId: number, rpcUrl?: string): Chain {
  if (!rpcUrl) {
    throw new Error(
      `Unknown chainId ${chainId}: supply an rpcUrl when using a non-Robinhood chain.`,
    );
  }
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  };
}

/** Decode and parse a PAYMENT-REQUIRED header (base64-encoded JSON) */
function parsePaymentRequired(header: string): X402Challenge {
  let decoded: string;
  try {
    decoded = Buffer.from(header, 'base64').toString('utf-8');
  } catch {
    throw new Error('PAYMENT-REQUIRED header is not valid base64');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error('PAYMENT-REQUIRED header is not valid JSON after base64 decode');
  }

  const accepts = parsed['accepts'] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error('PAYMENT-REQUIRED header missing "accepts" array');
  }

  const offer = accepts[0];
  const network = offer['network'] as string | undefined;
  const scheme = (offer['scheme'] as string | undefined) ?? 'exact';
  const amount = String(offer['amount'] ?? offer['maxAmount'] ?? '0');
  const recipient = offer['recipient'] as Address | undefined;
  const asset = (offer['asset'] as Address | undefined) ?? USDG_CONTRACT;
  const nonce = String(offer['nonce'] ?? parsed['nonce'] ?? '');

  if (!network) throw new Error('PAYMENT-REQUIRED: missing network in accepts[0]');
  if (!recipient) throw new Error('PAYMENT-REQUIRED: missing recipient in accepts[0]');

  return { network, scheme, amount, recipient, asset, nonce, raw: offer };
}

/** Map CAIP-2 string "eip155:N" to a numeric chain ID */
function caip2ToChainId(network: string): number {
  const match = network.match(/^eip155:(\d+)$/);
  if (!match) throw new Error(`Unsupported CAIP-2 network format: ${network}`);
  return parseInt(match[1], 10);
}

/** Build ERC-20 transfer calldata */
function buildTransferData(to: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amount],
  });
}

/** Poll for a transaction receipt with exponential backoff */
async function waitForReceipt(
  publicClient: PublicClient,
  txHash: Hash,
  maxAttempts = 24,
  baseDelayMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (receipt) {
        if (receipt.status === 'reverted') {
          throw new Error(`Transaction ${txHash} reverted on-chain`);
        }
        return; // confirmed
      }
    } catch (err: unknown) {
      // getTransactionReceipt throws when tx is not yet indexed — that's fine
      if (
        err instanceof Error &&
        err.message.includes('reverted')
      ) {
        throw err;
      }
    }
    const delay = Math.min(baseDelayMs * 2 ** i, 8000);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(`Timed out waiting for receipt of ${txHash}`);
}

/** Build a PAYMENT-SIGNATURE header value (base64-encoded PaymentPayload JSON) */
function buildPaymentSignatureHeader(
  challenge: X402Challenge,
  from: Address,
  txHash: Hash,
): string {
  const payload: PaymentPayload = {
    x402Version: 2,
    scheme: 'exact',
    network: challenge.network,
    payload: {
      from,
      to: challenge.recipient,
      value: challenge.amount,
      nonce: challenge.nonce,
      asset: challenge.asset,
      txHash,
    },
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

// ---------------------------------------------------------------------------
// Core: payAndFetch
// ---------------------------------------------------------------------------

/**
 * payAndFetch — x402-aware fetch wrapper.
 *
 * 1. Makes the original request.
 * 2. On HTTP 402 with PAYMENT-REQUIRED header: parses the challenge, pays on-chain,
 *    and retries with PAYMENT-SIGNATURE header.
 * 3. On HTTP 402 with legacy WWW-Authenticate: x402: falls back to X-Pay-Tx retry.
 * 4. Returns the final Response (or throws on payment failure).
 *
 * @example
 * ```ts
 * const signer = createSignerFromKey('0xYOUR_PRIVATE_KEY');
 * const response = await payAndFetch('https://api.verge.example/data', { signer });
 * const data = await response.json();
 * ```
 */
export async function payAndFetch(
  url: string | URL,
  opts: PayAndFetchOptions,
  requestInit?: RequestInit,
): Promise<Response> {
  const { signer, maxRetries = 2, timeout = 30_000, onChallenge, onPaid } = opts;

  const account = signer.account;
  if (!account) throw new Error('signer.account is not set — use createSignerFromKey()');

  const signerChainId = signer.chain?.id ?? 4663;
  const rpcUrl = signer.chain?.rpcUrls.default.http[0];
  const publicClient: PublicClient = createPublicClient({
    chain: signer.chain ?? ROBINHOOD_CHAIN,
    transport: http(rpcUrl),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const baseInit: RequestInit = { ...requestInit, signal: controller.signal };

  let lastResponse: Response;

  try {
    // Initial request
    lastResponse = await fetch(url.toString(), baseInit);

    if (lastResponse.status !== 402) return lastResponse;

    // --- Handle 402 ---
    const paymentRequiredHeader = lastResponse.headers.get('payment-required');
    const wwwAuthenticate = lastResponse.headers.get('www-authenticate');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // --- x402 v2: PAYMENT-REQUIRED header ---
      if (paymentRequiredHeader) {
        const challenge = parsePaymentRequired(paymentRequiredHeader);
        const challengeChainId = caip2ToChainId(challenge.network);

        if (challengeChainId !== signerChainId) {
          throw new Error(
            `Chain mismatch: server requests eip155:${challengeChainId}, ` +
            `signer is on chain ${signerChainId}. Create a signer with the correct chainId.`,
          );
        }

        if (onChallenge) await onChallenge(challenge);

        // Build and send ERC-20 transfer
        const amount = BigInt(challenge.amount);
        const data = buildTransferData(challenge.recipient, amount);

        const txHash = await signer.sendTransaction({
          account,
          chain: signer.chain ?? ROBINHOOD_CHAIN,
          to: challenge.asset,
          data,
          value: 0n,
        });

        // Wait for on-chain confirmation
        await waitForReceipt(publicClient, txHash);

        if (onPaid) await onPaid(txHash, challenge);

        // Build PAYMENT-SIGNATURE header and retry
        const sigHeader = buildPaymentSignatureHeader(challenge, account.address, txHash);

        lastResponse = await fetch(url.toString(), {
          ...baseInit,
          headers: {
            ...(baseInit.headers ?? {}),
            'payment-signature': sigHeader,
          },
        });

        if (lastResponse.status !== 402) return lastResponse;

        // Still 402? Possibly a different challenge (server rotated nonce) — loop
        continue;
      }

      // --- Legacy x402: WWW-Authenticate: x402 ---
      if (wwwAuthenticate && wwwAuthenticate.toLowerCase().startsWith('x402')) {
        // Legacy path: read nonce from X-Pay-Nonce header, send X-Pay-Tx
        const legacyNonce = lastResponse.headers.get('x-pay-nonce') ?? '';
        const legacyAmount = lastResponse.headers.get('x-pay-amount') ?? '0';
        const legacyRecipient = (lastResponse.headers.get('x-pay-recipient') ?? account.address) as Address;
        const legacyAsset = (lastResponse.headers.get('x-pay-asset') ?? USDG_CONTRACT) as Address;

        const amount = BigInt(legacyAmount);
        const data = buildTransferData(legacyRecipient, amount);

        const txHash = await signer.sendTransaction({
          account,
          chain: signer.chain ?? ROBINHOOD_CHAIN,
          to: legacyAsset,
          data,
          value: 0n,
        });

        await waitForReceipt(publicClient, txHash);

        lastResponse = await fetch(url.toString(), {
          ...baseInit,
          headers: {
            ...(baseInit.headers ?? {}),
            'x-pay-tx': txHash,
            'x-pay-nonce': legacyNonce,
          },
        });

        if (lastResponse.status !== 402) return lastResponse;
        continue;
      }

      // 402 but no recognized payment header — return as-is
      return lastResponse;
    }

    return lastResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Convenience re-exports / utilities
// ---------------------------------------------------------------------------

export { type WalletClient, type PublicClient, type Chain, type Hash, type Address, type Hex };
