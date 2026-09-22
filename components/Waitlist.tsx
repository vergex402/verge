"use client";

import { useAccount } from "wagmi";
import WalletButton from "@/components/WalletButton";

export default function Waitlist() {
  const { address } = useAccount();

  return (
    <section id="connect" className="bg-[#171719] py-20 md:py-28 relative z-20">
      <div className="max-w-[680px] mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-5">
          Open your <span className="bg-emerald-500 text-black px-1.5 md:px-2 py-0.5 rounded font-semibold inline-block">developer portal</span>
        </h2>
        <p className="text-gray-400 text-sm md:text-base mb-10 max-w-[540px] mx-auto">
          Connect an EVM wallet on Robinhood Chain. No email, no password, no custodial account.
          Your wallet is your identity and your API access starts there.
        </p>
        <WalletButton className="mx-auto" />
        {address ? (
          <a href="/app" className="mt-5 inline-block text-[13.5px] text-emerald-400 hover:text-emerald-300">
            Open Developer Portal →
          </a>
        ) : (
          <div className="mt-5 text-[13px] text-gray-500">WalletConnect QR and injected wallets supported</div>
        )}
        <div className="mt-10 font-mono text-[11px] tracking-[0.16em] uppercase text-gray-500">
          &#x25B8; Robinhood Chain 4663 &middot; USDG settlement
        </div>
      </div>
    </section>
  );
}
