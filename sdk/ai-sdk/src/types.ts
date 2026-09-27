// Shared types for @vergex402/ai-sdk

export interface X402MiddlewareOptions {
  /** x402 endpoint URL to probe and pay (must return 402 with payment challenge) */
  endpoint: string;
  /** EVM private key (0x-prefixed) of the agent wallet that pays */
  privateKey: `0x${string}`;
  /** Override chain id (default: 4663 — Robinhood Chain) */
  chainId?: number;
  /** Max USDG to spend per call (safety guard). Default: 0.1 USDG */
  maxAmountUsdg?: number;
}

export interface X402GateOptions {
  /** Required USDG payment per call */
  amount: number;
  /** Recipient wallet address (your server wallet) */
  recipient: `0x${string}`;
  /** Optional custom memo */
  memo?: string;
  /** Verge facilitator URL. Default: https://vergesnowy.com/api/facilitator */
  facilitatorUrl?: string;
  /** Network id. Default: "robinhood-mainnet" */
  network?: string;
}

export interface SettlementProof {
  txHash: string;
  payer: string;
  amountUsdg: number;
  network: string;
  settledAt: string;
}
