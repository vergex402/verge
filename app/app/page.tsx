"use client";

import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode } from "react";

const WalletDashboard = dynamic(() => import("@/components/WalletDashboard"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[#171719] text-white flex items-center justify-center">
      <span className="font-mono text-sm text-gray-500 animate-pulse">Loading Verge Gateway…</span>
    </main>
  ),
});

class GatewayErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[verge-gateway]", error, info); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-[#171719] text-white flex items-center justify-center px-6">
        <section className="max-w-xl w-full rounded-[24px] border border-[#2a2a2e] bg-[#1B1B1C] p-8 md:p-10 text-center">
          <div className="font-mono text-[11px] tracking-[0.2em] text-amber-400 uppercase">Gateway recovery</div>
          <h1 className="text-3xl md:text-4xl font-light mt-4">Your wallet session needs a refresh.</h1>
          <p className="text-sm md:text-base text-gray-400 mt-4 leading-relaxed">No transaction was sent and no funds were touched. Reload the gateway, then reconnect your wallet on Robinhood Chain 4663.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7"><button type="button" onClick={() => window.location.reload()} className="btn btn-primary">Reload gateway</button><a href="/" className="btn btn-ghost">Back to Verge</a></div>
        </section>
      </main>
    );
  }
}

export default function AppPage() {
  return <GatewayErrorBoundary><WalletDashboard /></GatewayErrorBoundary>;
}
