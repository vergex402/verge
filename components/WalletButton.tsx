"use client";

import { useEffect, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/app/providers";

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet";
}

export default function WalletButton({ className = "" }: { className?: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wrongChain = mounted && isConnected && chainId !== robinhoodChain.id;

  function handleClick() {
    if (wrongChain) { switchChain({ chainId: robinhoodChain.id }); return; }
    open({ view: isConnected ? "Account" : "Connect" });
  }

  // SSR: always show neutral state to avoid hydration mismatch
  if (!mounted) return (
    <button type="button" className={`btn btn-primary ${className}`}>Connect wallet</button>
  );

  return (
    <button type="button" onClick={handleClick} className={`btn btn-primary ${className}`}>
      {wrongChain ? "Switch to Robinhood" : shortAddress(address)}
    </button>
  );
}
