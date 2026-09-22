"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useSignMessage, useBalance, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import WalletButton from "@/components/WalletButton";

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
const erc20Abi = [{
  type: "function", name: "balanceOf", stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

const tabs = ["Transactions", "Marketplace", "Receipts", "API Keys"] as const;
type Tab = (typeof tabs)[number];

function EmptyState({ tab, authorized, onGenerate }: { tab: Tab; authorized: boolean; onGenerate: () => void }) {
  const copy: Record<Tab, { title: string; body: string }> = {
    Transactions: { title: "No transactions yet", body: "Settled USDG transfers to your merchant wallet will appear here." },
    Marketplace: { title: "Marketplace is ready for listings", body: "Connect an endpoint and publish its x402 price to make it discoverable." },
    Receipts: { title: "No receipts yet", body: "Every verified Robinhood Chain settlement will produce a receipt here." },
    "API Keys": { title: "API keys are wallet-scoped", body: "Key issuance is protected behind wallet authentication and will never expose a private key in the browser." },
  };
  return (
    <div className="rounded-2xl border border-[#2a2a2e] bg-[#171719] p-8 text-center">
      <div className="text-white font-medium mb-2">{copy[tab].title}</div>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{copy[tab].body}</p>
      {tab === "API Keys" && authorized && <button type="button" onClick={onGenerate} className="btn btn-primary mt-5">Generate API key</button>}
      {tab === "API Keys" && !authorized && <p className="text-xs text-amber-400 mt-5">Authorize this wallet above to manage keys.</p>}
    </div>
  );
}

export default function WalletDashboard() {
  // Use AppKit hooks — these never throw on chain mismatch
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();



  const onRobinhood = chainId === 4663;
  const addr = address as `0x${string}` | undefined;

  const { signMessageAsync } = useSignMessage();
  const [active, setActive] = useState<Tab>("Transactions");
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [newKey, setNewKey] = useState("");
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [listingName, setListingName] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [listingPrice, setListingPrice] = useState("0.001");

  // Wagmi reads — only enabled on correct chain
  const eth = useBalance({ address: addr, chainId: 4663, query: { enabled: Boolean(addr) && onRobinhood } });
  const usdg = useReadContract({
    address: USDG, abi: erc20Abi, functionName: "balanceOf",
    args: addr ? [addr] : undefined,
    chainId: 4663,
    query: { enabled: Boolean(addr) && onRobinhood },
  });

  useEffect(() => {
    if (!authorized || !onRobinhood || (active !== "Transactions" && active !== "Receipts" && active !== "Marketplace")) return;
    let cancelled = false;
    setActivityLoading(true); setActivityError("");
    fetch(active === "Marketplace" ? "/api/marketplace" : active === "Receipts" ? "/api/receipts" : "/api/transactions")
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "error"); return d; })
      .then((d) => { if (!cancelled) { setActivity(d.transactions || []); setListings(d.endpoints || []); } })
      .catch((e) => { if (!cancelled) setActivityError(e instanceof Error ? e.message : "Could not load activity"); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [active, authorized, onRobinhood]);


  if (!isConnected) return (
    <main className="min-h-screen bg-[#171719] text-white">
      <header className="border-b border-[#2a2a2e] bg-[#171719]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" /><span className="font-mono text-sm tracking-[0.18em] text-white">VERGE</span><span className="hidden sm:inline text-xs text-gray-500 border-l border-[#3a3a3e] pl-3">PUBLIC GATEWAY</span></a>
          <WalletButton />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-16">
        <div className="flex flex-col gap-3 mb-10"><div className="font-mono text-[11px] tracking-[0.2em] text-emerald-400 uppercase">Open payment infrastructure</div><h1 className="text-4xl md:text-6xl font-light tracking-tight">Gateway for paid agent endpoints.</h1><p className="max-w-2xl text-gray-400 text-base md:text-lg leading-relaxed">Discover USDG-priced APIs, inspect the x402 flow, then connect a wallet only when you want to publish an endpoint or create a key.</p></div>

        <div className="grid lg:grid-cols-[1.45fr_0.8fr] gap-5">
          <section className="rounded-[24px] border border-[#2a2a2e] overflow-hidden bg-[#1B1B1C]">
            <div className="flex items-center justify-between px-5 md:px-7 py-5 border-b border-[#2a2a2e]"><div><div className="text-white font-medium">Gateway catalog</div><div className="text-sm text-gray-500 mt-1">Public x402-compatible surfaces</div></div><span className="font-mono text-xs text-emerald-400">LIVE / 4663</span></div>
            <div className="p-4 md:p-5 grid gap-3">
              <a href="/api/demo" target="_blank" className="group rounded-2xl border border-[#2a2a2e] bg-[#171719] p-5 hover:border-emerald-500/50 transition-colors"><div className="flex items-start justify-between gap-5"><div><div className="font-mono text-xs text-emerald-400 mb-3">GET /api/demo</div><div className="text-white text-lg">USDG payment challenge</div><p className="text-sm text-gray-500 mt-2 max-w-lg">Inspect a real HTTP 402 response, then replay with a verified Robinhood Chain transaction.</p></div><span className="text-gray-500 group-hover:text-emerald-400">↗</span></div><div className="mt-5 flex gap-2"><span className="rounded-md bg-amber-500/10 px-2 py-1 font-mono text-[11px] text-amber-400">402 REQUIRED</span><span className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-[11px] text-emerald-400">USDG</span></div></a>
              <a href="/docs" className="group rounded-2xl border border-[#2a2a2e] bg-[#171719] p-5 hover:border-emerald-500/50 transition-colors"><div className="flex items-start justify-between gap-5"><div><div className="font-mono text-xs text-emerald-400 mb-3">SDK / DOCUMENTATION</div><div className="text-white text-lg">Ship a paid endpoint</div><p className="text-sm text-gray-500 mt-2 max-w-lg">Express middleware, Robinhood Chain configuration, receipt verification, and replay-safe payment handling.</p></div><span className="text-gray-500 group-hover:text-emerald-400">↗</span></div></a>
              <a href="/api/catalog" target="_blank" className="group rounded-2xl border border-[#2a2a2e] bg-[#171719] p-5 hover:border-emerald-500/50 transition-colors"><div className="flex items-start justify-between gap-5"><div><div className="font-mono text-xs text-emerald-400 mb-3">GET /api/catalog</div><div className="text-white text-lg">Machine-readable discovery</div><p className="text-sm text-gray-500 mt-2 max-w-lg">A public JSON catalog for agents to discover Verge gateway capabilities and registered surfaces.</p></div><span className="text-gray-500 group-hover:text-emerald-400">↗</span></div></a>
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <section className="rounded-[24px] border border-emerald-500/25 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.15),transparent_55%),#1B1B1C] p-6 md:p-7"><div className="font-mono text-[11px] tracking-[0.2em] text-emerald-400 uppercase">Builder access</div><h2 className="text-2xl font-light text-white mt-4">Connect when you are ready to build.</h2><p className="text-sm text-gray-400 leading-relaxed mt-3">A wallet is only required to publish a listing, view wallet receipts, or generate a scoped API key. No email. No password.</p><WalletButton className="mt-6 w-full" /><p className="text-xs text-gray-500 mt-4">WalletConnect · Reown · Robinhood Chain 4663</p></section>
            <section className="rounded-[24px] border border-[#2a2a2e] bg-[#1B1B1C] p-6"><div className="flex items-center justify-between"><span className="text-sm text-gray-400">Settlement rail</span><span className="size-2 rounded-full bg-emerald-400" /></div><div className="text-xl text-white mt-4">Robinhood Chain</div><div className="font-mono text-xs text-gray-500 mt-2">CHAIN 4663 · USDG · EVM</div><div className="mt-5 pt-5 border-t border-[#2a2a2e] text-sm text-gray-400">Payments are verified from USDG Transfer events before an endpoint unlocks.</div></section>
          </aside>
        </div>
      </div>
    </main>
  );

  // Connected but wrong chain
  if (!onRobinhood) return (
    <main className="min-h-screen bg-[#171719] text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="font-mono text-xs tracking-[0.2em] text-amber-400 uppercase mb-5">Wrong network</div>
        <h1 className="text-3xl md:text-5xl font-light mb-5">Switch to Robinhood Chain</h1>
        <p className="text-gray-400 mb-8">
          Your wallet is on chain <span className="font-mono text-amber-400">{chainId}</span>. Verge runs on Robinhood Chain <span className="font-mono text-emerald-400">4663</span>.
        </p>
        <WalletButton className="mx-auto" />
        <a href="/" className="block mt-6 text-sm text-gray-500 hover:text-gray-300">← Back to Verge</a>
      </div>
    </main>
  );

  const usdgDisplay = usdg.data == null ? "—" : `${(Number(usdg.data) / 1e6).toFixed(4)} USDG`;
  const ethDisplay = eth.data ? `${Number(formatUnits(eth.data.value, eth.data.decimals)).toFixed(5)} ETH` : "—";

  async function authorize() {
    if (!addr || authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      const challengeRes = await fetch(`/api/auth/challenge?address=${addr}`);
      const challenge = await challengeRes.json();
      const signature = await signMessageAsync({ message: challenge.message });
      const res = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: addr, message: challenge.message, signature }) });
      if (!res.ok) throw new Error((await res.json()).error || "Authorization failed");
      setAuthorized(true);
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Cancelled"); }
    finally { setAuthBusy(false); }
  }

  async function generateKey() {
    const r = await fetch("/api/keys", { method: "POST" });
    const d = await r.json();
    if (r.ok) setNewKey(d.key);
    else setAuthError(d.error || "Could not generate key");
  }

  async function publishListing(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/marketplace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: listingName, url: listingUrl, price: listingPrice }) });
    const d = await r.json();
    if (!r.ok) { setAuthError(d.error || "Could not publish"); return; }
    setListings((cur) => [d, ...cur]); setListingName(""); setListingUrl("");
  }

  return (
    <main className="min-h-screen bg-[#171719] text-white px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <a href="/" className="font-mono text-xs tracking-[0.2em] text-emerald-400 uppercase">← Verge</a>
            <h1 className="text-3xl md:text-5xl font-light mt-3">Public API gateway</h1>
            <p className="text-gray-500 mt-2">Robinhood Chain · USDG · wallet-authenticated</p>
          </div>
          <WalletButton />
        </header>

        {!authorized && <section className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><div className="text-white font-medium">Authorize this wallet</div><div className="text-sm text-gray-500 mt-1">One signature, no gas. Unlocks wallet-scoped portal actions.</div></div><button type="button" onClick={authorize} disabled={authBusy} className="btn btn-primary">{authBusy ? "Waiting for signature…" : "Sign in with wallet"}</button></section>}
        {authError && <div className="mb-6 text-sm text-red-400">{authError}</div>}

        <section className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="card"><div className="text-gray-500 text-xs uppercase tracking-wider">Wallet</div><div className="font-mono text-sm mt-3 text-emerald-400 break-all">{addr}</div></div>
          <div className="card"><div className="text-gray-500 text-xs uppercase tracking-wider">USDG balance</div><div className="text-2xl mt-3">{usdgDisplay}</div></div>
          <div className="card"><div className="text-gray-500 text-xs uppercase tracking-wider">Gas balance</div><div className="text-2xl mt-3">{ethDisplay}</div></div>
        </section>

        <section className="card p-0 overflow-hidden">
          <nav className="flex gap-1 overflow-x-auto p-3 border-b border-[#2a2a2e]">
            {tabs.map((tab) => (
              <button key={tab} type="button" onClick={() => setActive(tab)} className={`px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-colors ${active === tab ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>{tab}</button>
            ))}
          </nav>
          <div className="p-5 md:p-8">
            {active === "Marketplace" && authorized ? (
              <div className="rounded-2xl border border-[#2a2a2e] bg-[#171719] p-5">
                <div className="text-white font-medium mb-4">Live endpoint marketplace</div>
                <form onSubmit={publishListing} className="grid md:grid-cols-4 gap-3 mb-6">
                  <input required value={listingName} onChange={(e) => setListingName(e.target.value)} placeholder="Endpoint name" className="input-dark" />
                  <input required type="url" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://api.example.com" className="input-dark" />
                  <input required type="number" min="0.000001" step="0.000001" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="USDG / call" className="input-dark" />
                  <button type="submit" className="btn btn-primary">Publish</button>
                </form>
                {listings.length === 0 ? <div className="text-sm text-gray-500 py-8 text-center">No public endpoints yet.</div> : <div className="space-y-2">{listings.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-[#1B1B1C] px-4 py-3 hover:border-emerald-500/30 border border-transparent"><div className="flex justify-between gap-3"><span className="text-white">{item.name}</span><span className="text-emerald-400">{item.price} USDG</span></div><div className="text-xs text-gray-500 mt-1 truncate">{item.url}</div></a>)}</div>}
              </div>
            ) : (active === "Transactions" || active === "Receipts") && authorized ? (
              <div className="rounded-2xl border border-[#2a2a2e] bg-[#171719] p-5">
                <div className="flex items-center justify-between mb-4"><div className="text-white font-medium">Live USDG {active.toLowerCase()}</div><div className="text-xs text-gray-500">Robinhood Chain 4663</div></div>
                {activityLoading && <div className="text-sm text-gray-500 py-8 text-center">Reading Transfer events…</div>}
                {activityError && <div className="text-sm text-red-400 py-8 text-center">{activityError}</div>}
                {!activityLoading && !activityError && activity.length === 0 && <div className="text-sm text-gray-500 py-8 text-center">No confirmed USDG transfers found in the recent scan window.</div>}
                <div className="space-y-2">{activity.map((tx) => <a key={tx.hash + tx.block} href={tx.explorer} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#1B1B1C] px-4 py-3 text-sm hover:border-emerald-500/30 border border-transparent"><span className="font-mono text-emerald-400">{tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}</span><span className="text-white">{tx.amount.toFixed(4)} USDG</span><span className="text-gray-500">block {tx.block}</span><span className="text-emerald-400">confirmed</span></a>)}</div>
              </div>
            ) : <EmptyState tab={active} authorized={authorized} onGenerate={generateKey} />}
            {newKey && active === "API Keys" && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"><div className="text-xs text-emerald-400 mb-2">Copy this key now — it will not be shown again.</div><code className="text-sm text-white break-all">{newKey}</code><div className="text-xs text-gray-500 mt-3">1,000 requests / day · pass as <code className="text-gray-400">X-API-Key</code> on <code className="text-gray-400">/api/demo</code></div></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
