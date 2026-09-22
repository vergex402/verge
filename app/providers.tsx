"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import type { ReactNode } from "react";

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "7ed02309417cc413eac4b929bf764f1f";
const rpcUrl = process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

export const robinhoodChain = defineChain({
  id: 4663,
  caipNetworkId: "eip155:4663",
  chainNamespace: "eip155",
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
});

// Registered to safely accept wallets that are initially still on Ethereum.
// Verge itself only enables payments/reads after the user switches to 4663.
const ethereum = defineChain({
  id: 1,
  caipNetworkId: "eip155:1",
  chainNamespace: "eip155",
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://ethereum-rpc.publicnode.com"] } },
  blockExplorers: { default: { name: "Etherscan", url: "https://etherscan.io" } },
});

export const wagmiAdapter = new WagmiAdapter({
  networks: [robinhoodChain, ethereum],
  projectId,
  ssr: false,
  transports: {
    [robinhoodChain.id]: http(rpcUrl),
    [ethereum.id]: http("https://ethereum-rpc.publicnode.com"),
  },
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [robinhoodChain, ethereum],
  projectId,
  defaultNetwork: robinhoodChain,
  metadata: {
    name: "Verge",
    description: "USDG payment rails for AI agents on Robinhood Chain",
    url: "https://vergesnowy.dev",
    icons: ["https://vergesnowy.dev/icon"],
  },
  features: { swaps: false, onramp: false, email: false, socials: false },
  themeMode: "dark",
  themeVariables: { "--w3m-accent": "#34d399", "--w3m-color-mix": "#34d399" },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
