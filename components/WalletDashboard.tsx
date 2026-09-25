"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useSignMessage, useBalance, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import WalletButton from "@/components/WalletButton";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import CommandPalette from "@/components/CommandPalette";
import AppIcon from "@/components/AppIcon";
import RailDirectory, { useSupportedRails } from "@/components/RailDirectory";
import PaymentFlowMini from "@/components/PaymentFlowMini";
import LiveDemo from "@/components/LiveDemo";

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
const VERGE_CA = "0xb73b18267d23087e3af1390edfeb8c4308921d59" as const;
const erc20Abi = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;

type VergeTier = { name: string; fee: string; discount: string; color: string; next?: { name: string; required: string } };
function getVergeTier(balance: bigint | undefined): VergeTier {
  const b = balance ? Number(balance) / 1e18 : 0;
  if (b >= 250_000) return { name: "Partner", fee: "0.00%", discount: "Zero fee", color: "text-white" };
  if (b >= 50_000) return { name: "Pro", fee: "0.20%", discount: "–60%", color: "text-emerald-300", next: { name: "Partner", required: "250,000" } };
  if (b >= 10_000) return { name: "Builder", fee: "0.35%", discount: "–30%", color: "text-emerald-200/70", next: { name: "Pro", required: "50,000" } };
  return { name: "Free", fee: "0.50%", discount: "", color: "text-white/40", next: { name: "Builder", required: "10,000" } };
}
type Tab = "Overview" | "Live Demo" | "Data Feeds" | "Transactions" | "Marketplace" | "Receipts" | "API Keys" | "Networks" | "Wallets" | "Vault" | "Reputation";
type Activity = { hash: string; block: number; amount: number; explorer: string; status?: string };
type Listing = { id: string; name: string; url: string; price: number; asset?: string; network?: string; chainId?: number; healthStatus?: number; requestsCount?: number; paidCallsCount?: number; settlementVolume?: number; hostedSlug?: string; hostedTemplate?: string };
type ApiKey = { id: string; createdAt: string; lastFour: string; revokedAt?: string | null; quotaLimit: number; usageCount: number; lastUsedAt?: string | null };
type Metrics = { endpoints: number; discoveryHits: number; paidCalls: number; settlementVolume: number };
type AgentWallet = { label: string; address: string; vaultRef: string; chainId: number; createdAt: number };
type VaultEntry = { name: string; createdAt: number; hits: number; encLen: number };
type ReputationEntry = { address: string; score: number; tier: string; settledCount: number; totalUsdg: number; firstSeen: number | null; lastSeen: number | null; resources: Record<string, number>; txHashes: string[] };

async function getData(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 font-mono text-[9px] font-medium tracking-[0.2em] text-emerald-200/55">{eyebrow}</div><h1 className="text-2xl font-medium tracking-[-0.04em] text-white md:text-[30px]">{title}</h1><p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/40 md:text-sm">{description}</p></div>{action}</div>;
}

function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
  return <article className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5"><div className="flex items-center justify-between gap-3"><span className="text-[11px] text-white/45">{label}</span><span className="flex size-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-emerald-200/65"><AppIcon name={icon} size={15}/></span></div><div className="mt-4 truncate text-xl font-medium tracking-tight text-white">{value}</div><div className="mt-1.5 text-[10px] text-white/30">{detail}</div></article>;
}

function TableEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.012] px-5 py-12 text-center"><div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025] text-white/40"><AppIcon name="overview" size={18}/></div><div className="text-sm font-medium text-white/75">{title}</div><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/40">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export default function WalletDashboard() {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const onRobinhood = chainId === 4663;
  const addr = address as `0x${string}` | undefined;
  const { signMessageAsync } = useSignMessage();
  const rails = useSupportedRails();
  const [active, setActive] = useState<Tab>("Overview");
  const [sessionAddress, setSessionAddress] = useState("");
  const authorized = Boolean(addr && sessionAddress.toLowerCase() === addr.toLowerCase());
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [newKey, setNewKey] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [listingName, setListingName] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [listingPrice, setListingPrice] = useState("0.001");
  const [listingNetwork, setListingNetwork] = useState("robinhood-mainnet");
  const [listingMode, setListingMode] = useState<"hosted" | "self">("hosted");
  const [listingTemplate, setListingTemplate] = useState("random-joke");
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string; defaultPrice: number }[]>([]);
  const [publishBusy, setPublishBusy] = useState(false);
  const [justPublished, setJustPublished] = useState<Listing | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [agentWallets, setAgentWallets] = useState<AgentWallet[]>([]);
  const [newWallet, setNewWallet] = useState<(AgentWallet & { privateKey: string }) | null>(null);
  const [pkRevealed, setPkRevealed] = useState(false);
  const [pkCopied, setPkCopied] = useState(false);
  const [walletLabel, setWalletLabel] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [vaultName, setVaultName] = useState("");
  const [vaultValue, setVaultValue] = useState("");
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultDeletingName, setVaultDeletingName] = useState<string | null>(null);
  const [myReputation, setMyReputation] = useState<ReputationEntry | null>(null);
  const [repLeaderboard, setRepLeaderboard] = useState<ReputationEntry[]>([]);
  const [feedPreviews, setFeedPreviews] = useState<Record<string, { data?: unknown; error?: string }>>({});
  const [feedsLoading, setFeedsLoading] = useState(false);

  const eth = useBalance({ address: addr, chainId: 4663, query: { enabled: Boolean(addr) && onRobinhood } });
  const usdg = useReadContract({ address: USDG, abi: erc20Abi, functionName: "balanceOf", args: addr ? [addr] : undefined, chainId: 4663, query: { enabled: Boolean(addr) && onRobinhood } });
  const vergeRaw = useReadContract({ address: VERGE_CA, abi: erc20Abi, functionName: "balanceOf", args: addr ? [addr] : undefined, chainId: 4663, query: { enabled: Boolean(addr) && onRobinhood } });

  useEffect(() => {
    if (active !== "Marketplace" && active !== "Reputation" && active !== "Data Feeds" && (!authorized || !onRobinhood)) return;
    let cancelled = false;
    setActivityLoading(true); setActivityError("");
    const load = async () => {
      try {
        if (active === "Overview") {
          const [analytics, tx, market] = await Promise.all([getData("/api/merchant/analytics"), getData("/api/transactions"), getData("/api/marketplace")]);
          if (!cancelled) { setMetrics(analytics.metrics); setActivity(tx.transactions || []); setListings(market.endpoints || []); }
        } else if (active === "Transactions" || active === "Receipts") {
          const data = await getData(active === "Receipts" ? "/api/receipts" : "/api/transactions");
          if (!cancelled) setActivity(data.transactions || []);
        } else if (active === "Marketplace") {
          const data = await getData("/api/marketplace");
          if (!cancelled) setListings(data.endpoints || []);
        } else if (active === "API Keys") {
          const data = await getData("/api/keys");
          if (!cancelled) setKeys(data.keys || []);
        } else if (active === "Wallets") {
          const data = await getData("/api/wallets");
          if (!cancelled) setAgentWallets(data.wallets || []);
        } else if (active === "Vault") {
          const data = await getData("/api/vault");
          if (!cancelled) setVaultEntries(data.entries || []);
        } else if (active === "Reputation") {
          const [mine, board] = await Promise.all([
            addr ? getData(`/api/reputation?address=${addr}`) : Promise.resolve(null),
            getData("/api/reputation?limit=10"),
          ]);
          if (!cancelled) { setMyReputation(mine); setRepLeaderboard(board.leaderboard || []); }
        }
      } catch (error) { if (!cancelled) setActivityError(error instanceof Error ? error.message : "Could not load workspace data"); }
      finally { if (!cancelled) setActivityLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [active, authorized, onRobinhood, addr]);

  const authorize = useCallback(async () => {
    if (!addr || authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      const challenge = await getData(`/api/auth/challenge?address=${addr}`);
      const signature = await signMessageAsync({ message: challenge.message });
      const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: addr, message: challenge.message, signature }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authorization failed");
      setSessionAddress(addr); setActive("Overview");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Signature cancelled"); }
    finally { setAuthBusy(false); }
  }, [addr, authBusy, signMessageAsync]);

  const generateKey = useCallback(async () => {
    try { const response = await fetch("/api/keys", { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not create key"); setNewKey(data.key); const list = await getData("/api/keys"); setKeys(list.keys || []); setAuthError(""); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Could not create key"); }
  }, []);

  const revokeKey = useCallback(async (id: string) => {
    if (revokingId) return;
    setRevokingId(id); setAuthError(""); setNewKey("");
    try { const response = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not revoke key"); setKeys((current) => current.map((key) => key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key)); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Could not revoke key"); }
    finally { setRevokingId(null); }
  }, [revokingId]);

  const createWallet = useCallback(async () => {
    if (walletBusy) return;
    setWalletBusy(true); setAuthError(""); setNewWallet(null); setPkRevealed(false); setPkCopied(false);
    try {
      const response = await fetch("/api/wallets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: walletLabel || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create wallet");
      setNewWallet(data); setWalletLabel("");
      const list = await getData("/api/wallets"); setAgentWallets(list.wallets || []);
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not create wallet"); }
    finally { setWalletBusy(false); }
  }, [walletBusy, walletLabel]);

  const copyPrivateKey = useCallback(async () => {
    if (!newWallet) return;
    try { await navigator.clipboard.writeText(newWallet.privateKey); setPkCopied(true); setTimeout(() => setPkCopied(false), 2000); }
    catch { setAuthError("Could not copy — select and copy the key manually."); }
  }, [newWallet]);

  const vaultStore = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (vaultBusy || !vaultName || !vaultValue) return;
    setVaultBusy(true); setAuthError("");
    try {
      const response = await fetch("/api/vault", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: vaultName, value: vaultValue }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not store secret");
      setVaultName(""); setVaultValue("");
      const list = await getData("/api/vault"); setVaultEntries(list.entries || []);
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not store secret"); }
    finally { setVaultBusy(false); }
  }, [vaultBusy, vaultName, vaultValue]);

  const vaultRemove = useCallback(async (name: string) => {
    if (vaultDeletingName) return;
    setVaultDeletingName(name); setAuthError("");
    try {
      const response = await fetch(`/api/vault?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete secret");
      setVaultEntries((current) => current.filter((entry) => entry.name !== name));
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not delete secret"); }
    finally { setVaultDeletingName(null); }
  }, [vaultDeletingName]);

  useEffect(() => {
    let live = true;
    fetch("/api/marketplace/templates").then((r) => r.json()).then((d) => { if (live && Array.isArray(d.templates)) setTemplates(d.templates); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const FEED_IDS = ["news", "alerts", "whale-alerts", "signals"];
  useEffect(() => {
    if (active !== "Data Feeds") return;
    let cancelled = false;
    setFeedsLoading(true);
    Promise.all(
      FEED_IDS.map(async (id) => {
        try {
          const res = await fetch(`/api/preview/${id}`, { cache: "no-store" });
          const body = await res.json();
          if (!res.ok) return [id, { error: body.error || `HTTP ${res.status}` }] as const;
          return [id, { data: body.data }] as const;
        } catch (error) {
          return [id, { error: error instanceof Error ? error.message : "Unavailable" }] as const;
        }
      })
    ).then((entries) => { if (!cancelled) setFeedPreviews(Object.fromEntries(entries)); })
      .finally(() => { if (!cancelled) setFeedsLoading(false); });
    return () => { cancelled = true; };
  }, [active]);

  async function publishListing(event: React.FormEvent) {
    event.preventDefault(); setAuthError(""); setPublishBusy(true); setJustPublished(null);
    try {
      const payload = listingMode === "hosted"
        ? { name: listingName, price: listingPrice, network: listingNetwork, hostedTemplate: listingTemplate, description: listingName }
        : { name: listingName, url: listingUrl, price: listingPrice, network: listingNetwork };
      const response = await fetch("/api/marketplace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish endpoint");
      setListings((current) => [data, ...current]);
      setJustPublished(data);
      setListingName(""); setListingUrl("");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not publish endpoint"); }
    finally { setPublishBusy(false); }
  }

  const commands = [
    { id: "nav-overview", label: "Go to Overview", hint: "Workspace", action: () => setActive("Overview") },
    { id: "nav-demo", label: "Try the live demo", hint: "Workspace", action: () => setActive("Live Demo") },
    { id: "nav-feeds", label: "Browse live data feeds", hint: "Workspace", action: () => setActive("Data Feeds") },
    { id: "nav-tx", label: "Go to Transactions", hint: "Workspace", action: () => setActive("Transactions") },
    { id: "nav-mp", label: "Go to Marketplace", hint: "Workspace", action: () => setActive("Marketplace") },
    { id: "nav-rc", label: "Go to Receipts", hint: "Workspace", action: () => setActive("Receipts") },
    { id: "nav-wallets", label: "Go to Agent Wallets", hint: "Agents", action: () => setActive("Wallets") },
    { id: "nav-vault", label: "Go to Credential Vault", hint: "Agents", action: () => setActive("Vault") },
    { id: "nav-rep", label: "Go to Reputation", hint: "Agents", action: () => setActive("Reputation") },
    { id: "nav-key", label: "Manage API keys", hint: "Developer", action: () => setActive("API Keys") },
    { id: "nav-net", label: "Explore payment rails", hint: "Developer", action: () => setActive("Networks") },
    { id: "gen-key", label: "Generate API key", hint: "Action", action: () => { setActive("API Keys"); if (authorized) void generateKey(); } },
    { id: "gen-wallet", label: "Create agent wallet", hint: "Action", action: () => { setActive("Wallets"); if (authorized) void createWallet(); } },
    { id: "docs", label: "Open documentation", hint: "↗", action: () => window.open("/docs", "_blank") },
    { id: "catalog", label: "Open API catalog", hint: "↗", action: () => window.open("/api/catalog", "_blank") },
  ];

  const usdgDisplay = usdg.data == null ? "—" : `${(Number(usdg.data) / 1e6).toFixed(4)} USDG`;
  const ethDisplay = eth.data ? `${Number(formatUnits(eth.data.value, eth.data.decimals)).toFixed(5)} ETH` : "—";
  const vergeBalance = vergeRaw.data as bigint | undefined;
  const vergeTier = getVergeTier(vergeBalance);
  const vergeDisplay = vergeBalance == null ? "—" : `${Math.floor(Number(vergeBalance) / 1e18).toLocaleString()} $VERGE`;
  const changeActive = (key: string) => { if (key !== "API Keys") setNewKey(""); if (key !== "Wallets") { setNewWallet(null); setPkRevealed(false); setPkCopied(false); } setActive(key as Tab); };

  const shellHeader = <header className="sticky top-0 z-20 flex min-h-[66px] items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0d0f0e]/90 px-4 backdrop-blur-xl md:px-8"><div className="min-w-0"><div className="hidden text-[9px] font-mono tracking-[0.15em] text-white/30 md:block">VERGE <span className="px-1 text-white/15">/</span> WORKSPACE</div><div className="mt-0.5 truncate text-sm font-medium text-white/85 md:hidden">{active}</div><div className="hidden text-[11px] text-white/35 md:block">{active}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => setPaletteOpen(true)} className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-white/40 transition hover:border-white/15 hover:text-white/75 lg:flex"><AppIcon name="search" size={14}/>Search <kbd className="ml-5 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/30">⌘K</kbd></button><span className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] text-white/50 sm:inline-flex"><span className="size-1.5 rounded-full bg-emerald-300"/>Robinhood · 4663</span><WalletButton className="!rounded-xl !px-3 !py-2 !text-[11px]"/></div></header>;

  const mainContent = () => {
    if (active === "Networks") return <><PageHeading eyebrow="NETWORK REGISTRY" title="Payment rails." description="The supported rails exposed by the public Verge SDK catalog, with settlement assets and token references for each network."/><RailDirectory/></>;
    if (active === "Live Demo") return <><PageHeading eyebrow="LIVE · NOT SIMULATED" title="Try the real x402 flow." description="Call the real /api/demo endpoint, pay 0.001 USDG from your wallet on Robinhood Chain, and watch Verge verify the settlement onchain before unlocking."/><LiveDemo/></>;
    if (!isConnected && active === "Marketplace") return <><PageHeading eyebrow="PUBLIC DIRECTORY" title="Marketplace." description="Browse the verified endpoint directory. Connect a wallet on Robinhood Chain to publish your own listing." action={<WalletButton className="!rounded-xl !px-3 !py-2 !text-[11px]"/>}/>{activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Loading public listings…</div> : activityError ? <p className="text-xs text-rose-300">{activityError}</p> : listings.length === 0 ? <TableEmpty title="No verified endpoints listed yet" description="The public directory is ready for paid API endpoints." action={<a href="/api/catalog" target="_blank" rel="noreferrer" className="text-[11px] text-emerald-200/70">Open the machine-readable catalog ↗</a>}/> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{listings.map((item) => <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4"><h2 className="text-sm font-medium text-white/85">{item.name}</h2><a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[10px] text-white/35">{item.url}</a><div className="mt-4 flex justify-between border-t border-white/[0.06] pt-3 text-[10px]"><span className="text-white/40">{item.network || "robinhood-mainnet"}</span><span className="text-white/75">{Number(item.price).toFixed(6)} {item.asset || "USDG"}</span></div></article>)}</div>}</>;
    if (!isConnected && active !== "Overview") return <><PageHeading eyebrow="WALLET WORKSPACE" title={active + "."} description="Connect a wallet on Robinhood Chain to access private workspace tools."/><TableEmpty title="Connect your wallet to continue" description="Your wallet is your account. Sign one gas-free message to open private activity and developer controls." action={<WalletButton className="!rounded-xl !px-4 !py-2.5 !text-xs"/>}/></>;
    if (!isConnected) return <>
      <PageHeading eyebrow="OPEN GATEWAY · NO LOGIN WALL" title="Understand the rails before connecting." description="Verge is an x402 payment console for APIs. Explore the protocol, marketplace, and network catalog first; connect only for wallet-private actions." action={<a href="/docs#multichain" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/65 transition hover:border-white/20 hover:text-white">Multichain guide <AppIcon name="arrow" size={13}/></a>}/>
      <section className="relative mb-5 overflow-hidden rounded-[28px] border border-emerald-200/15 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,.16),transparent_34%),linear-gradient(125deg,rgba(52,211,153,.10),rgba(255,255,255,.025)_55%,rgba(52,211,153,.035))] p-5 md:p-8"><div aria-hidden className="absolute -right-12 -top-24 size-72 rounded-full bg-emerald-300/[0.06] blur-3xl"/><div className="relative grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-black/10 px-3 py-1.5 font-mono text-[9px] tracking-[0.14em] text-emerald-100/70"><span className="size-1.5 rounded-full bg-emerald-300"/>X402 PAYMENT INFRASTRUCTURE</div><h2 className="mt-5 max-w-2xl text-2xl font-medium tracking-[-0.04em] text-white md:text-4xl">Let software pay per request.</h2><p className="mt-3 max-w-2xl text-xs leading-6 text-white/55 md:text-sm">x402 is not only “for agents.” It is a paid HTTP pattern for agents, apps, scripts, and users. The agent use case is strongest because software can receive a 402 challenge, pay, and retry automatically.</p><div className="mt-6 flex flex-wrap gap-2"><WalletButton className="!rounded-xl !px-4 !py-2.5 !text-xs"/><a href="#" onClick={(e) => { e.preventDefault(); setActive("Live Demo"); }} className="rounded-xl border border-white/10 bg-black/10 px-4 py-2.5 text-xs text-white/70 transition hover:border-white/20 hover:text-white">Try live 402 demo <AppIcon name="arrow" size={12} className="ml-1 inline"/></a><a href="/docs" className="rounded-xl border border-white/10 bg-black/10 px-4 py-2.5 text-xs text-white/70 transition hover:border-white/20 hover:text-white">Read full docs</a></div></div><div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><div className="text-xs font-medium text-white/80">What happens on a paid call?</div><div className="mt-4 space-y-3">{[["1", "Request hits paid endpoint"], ["2", "Server returns HTTP 402 challenge"], ["3", "Caller pays chosen stablecoin rail"], ["4", "Retry includes tx hash + nonce"]].map(([n, text]) => <div key={n} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"><span className="flex size-7 items-center justify-center rounded-lg bg-emerald-300/[0.10] font-mono text-[10px] text-emerald-200">{n}</span><span className="text-xs text-white/62">{text}</span></div>)}</div></div></div></section>
      <section className="mb-5 grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4"><div className="text-sm font-medium text-white/85">Default chain</div><p className="mt-2 text-xs leading-5 text-white/45">If you do nothing, the SDK uses <code className="text-white/70">robinhood-mainnet</code>: USDG on Robinhood Chain 4663.</p></div><div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4"><div className="text-sm font-medium text-white/85">Other chains</div><p className="mt-2 text-xs leading-5 text-white/45">There is no special CLI command per chain. Pass <code className="text-white/70">network: "base-mainnet"</code>, <code className="text-white/70">"solana-mainnet"</code>, etc.</p></div><div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4"><div className="text-sm font-medium text-white/85">Wallet console</div><p className="mt-2 text-xs leading-5 text-white/45">Connect/sign only to publish endpoints, manage API keys, and read wallet-scoped receipts.</p></div></section>
      <section className="mb-5 rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-medium text-white/80">Example payment flow</div><div className="mt-1 text-[10px] text-white/35">A simplified request → settlement → access sequence</div></div><span className="rounded-full border border-white/[0.08] px-2 py-1 font-mono text-[8px] tracking-wider text-white/35">ILLUSTRATIVE</span></div><div className="overflow-x-auto"><PaymentFlowMini/></div></section>
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><button onClick={() => setActive("Live Demo")} className="rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.045] p-4 text-left transition hover:border-emerald-200/35"><div className="flex size-9 items-center justify-center rounded-xl bg-emerald-300/[0.14] text-emerald-200"><AppIcon name="flash" size={17}/></div><div className="mt-4 text-sm font-medium text-white/90">Try the live demo</div><div className="mt-1 text-[11px] text-white/40">Pay 0.001 USDG, watch it settle for real.</div></button><button onClick={() => setActive("Marketplace")} className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 text-left transition hover:border-white/15"><div className="flex size-9 items-center justify-center rounded-xl bg-emerald-300/[0.08] text-emerald-200"><AppIcon name="marketplace" size={17}/></div><div className="mt-4 text-sm font-medium text-white/85">Discover endpoints</div><div className="mt-1 text-[11px] text-white/40">Browse public x402 listings.</div></button><a href="/docs#express" className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 transition hover:border-white/15"><div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/55"><AppIcon name="docs" size={17}/></div><div className="mt-4 text-sm font-medium text-white/85">Integrate the SDK</div><div className="mt-1 text-[11px] text-white/40">Express, Hono, and x402 flow.</div></a></div>
      <section className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-6"><div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-sm font-medium text-white/85">Payment rails</div><div className="mt-1 text-[11px] text-white/40">Configured from Verge’s public SDK registry.</div></div><button onClick={() => setActive("Networks")} className="shrink-0 text-[10px] text-emerald-200/70 hover:text-emerald-100">Full network details →</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{rails.map((rail) => <div key={rail.id} className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-black/10 p-3 text-center"><img src={({"robinhood-mainnet":"/logos/robinhood.jpg","ethereum-mainnet":"/chains/ethereum.png","base-mainnet":"/chains/base.png","arbitrum-mainnet":"/chains/arbitrum.png","polygon-mainnet":"/chains/polygon.svg","solana-mainnet":"/chains/solana.png","sui-mainnet":"/chains/sui.png"} as Record<string,string>)[rail.id]} alt="" className="mb-2 size-7 object-contain"/><span className="max-w-full truncate text-[10px] text-white/65">{rail.name}</span><span className="mt-1 font-mono text-[9px] text-white/35">{rail.asset}</span></div>)}</div></section>
      {authError && <p className="mt-4 text-xs text-rose-300">{authError}</p>}
    </>;

    if (!onRobinhood && active !== "Marketplace") return <>
      <PageHeading eyebrow="NETWORK REQUIRED" title="Switch to Robinhood Chain." description="The public gateway and seven-rail catalog remain available. Wallet-scoped workspace data currently reads from Robinhood Chain (4663)."/>
      <div className="mb-5 rounded-2xl border border-amber-200/15 bg-amber-100/[0.04] p-5"><div className="flex items-start gap-3"><span className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-amber-200/[0.08] text-amber-100/75"><AppIcon name="network" size={17}/></span><div><div className="text-sm font-medium text-white/85">Connected to chain {chainId}</div><p className="mt-1 max-w-xl text-xs leading-5 text-white/45">Switch the connected EVM wallet to Robinhood Chain 4663 to access balances, transactions, endpoint publishing, receipts, and API keys.</p><div className="mt-4"><WalletButton className="!rounded-xl !px-4 !py-2.5 !text-xs"/></div></div></div></div><RailDirectory/>
    </>;

    if (active === "Overview") return <>
      <PageHeading eyebrow="WORKSPACE OVERVIEW" title="Your gateway at a glance." description="A live view of your Robinhood wallet and registered endpoint activity." action={<button onClick={() => setActive("Marketplace")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-200 px-3.5 py-2.5 text-[11px] font-semibold text-[#08120d] transition hover:bg-emerald-100"><AppIcon name="marketplace" size={14}/> Publish endpoint</button>}/>
      {!authorized && <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-amber-200/10 bg-amber-100/[0.035] p-4 md:flex-row md:items-center md:justify-between"><div><div className="text-xs font-medium text-white/80">Unlock your private workspace</div><div className="mt-1 text-[11px] text-white/40">One wallet signature, no gas. It only grants access to your wallet-scoped portal tools.</div></div><button type="button" onClick={authorize} disabled={authBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d] disabled:opacity-50">{authBusy ? "Waiting for signature…" : "Sign in with wallet"}</button></div>}
      {authError && <p className="mb-4 text-xs text-rose-300">{authError}</p>}
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Wallet balance" value={authorized ? usdgDisplay : "Connect to view"} detail="USDG · Robinhood Chain" icon="wallet"/><StatCard label="Paid endpoint calls" value={authorized ? String(metrics?.paidCalls ?? (activityLoading ? "…" : "0")) : "—"} detail="Across your active listings" icon="transactions"/><StatCard label="Registered endpoints" value={authorized ? String(metrics?.endpoints ?? (activityLoading ? "…" : "0")) : "—"} detail="Verified public listings" icon="marketplace"/><StatCard label="Settlement volume" value={authorized ? `${Number(metrics?.settlementVolume ?? 0).toFixed(4)} USDG` : "—"} detail="Reported by your listings" icon="receipts"/></section>
      {isConnected && onRobinhood && <div className="mb-5 rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">$VERGE balance</div>
              <div className="mt-1 text-sm font-medium text-white/80">{vergeDisplay}</div>
            </div>
            <div className="h-8 w-px bg-white/[0.07]"/>
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">Fee tier</div>
              <div className={`mt-1 text-sm font-semibold ${vergeTier.color}`}>{vergeTier.name} · {vergeTier.fee}</div>
            </div>
            {vergeTier.discount && <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-emerald-300">{vergeTier.discount}</span>}
          </div>
          <div className="flex items-center gap-3">
            {vergeTier.next && <span className="text-[10px] text-white/35">Next: <span className="text-white/55">{vergeTier.next.name}</span> at {vergeTier.next.required} $VERGE</span>}
            <a href="/verge" className="rounded-xl border border-emerald-200/20 bg-emerald-200/[0.06] px-3 py-1.5 text-[10px] font-medium text-emerald-200 transition hover:bg-emerald-200/[0.1]">View tiers →</a>
          </div>
        </div>
      </div>}
      <section className="mb-5 rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-medium text-white/80">Payment protocol</div><div className="mt-1 text-[10px] text-white/35">Illustrative request lifecycle</div></div><span className="rounded-full border border-white/[0.08] px-2 py-1 font-mono text-[8px] tracking-wider text-white/35">HTTP 402</span></div><div className="overflow-x-auto"><PaymentFlowMini/></div></section>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141616]"><div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4 md:px-5"><div><div className="text-xs font-medium text-white/80">Recent settlements</div><div className="mt-1 text-[10px] text-white/35">Incoming USDG transfers to your wallet</div></div><button onClick={() => setActive("Transactions")} className="text-[10px] text-emerald-200/65 hover:text-emerald-100">View activity →</button></div>{!authorized ? <div className="p-4"><TableEmpty title="Sign in to see wallet activity" description="Your transaction history stays private to your connected wallet."/></div> : activityLoading ? <div className="p-8 text-center text-xs text-white/35">Reading recent transfer events…</div> : activityError ? <div className="p-6 text-center text-xs text-rose-300">{activityError}</div> : activity.length === 0 ? <div className="p-4"><TableEmpty title="No recent settlements" description="Confirmed USDG transfers received by this wallet will appear here."/></div> : <div className="divide-y divide-white/[0.05]">{activity.slice(0,5).map((tx) => <a key={tx.hash+tx.block} href={tx.explorer} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.02] md:px-5"><span className="min-w-0"><span className="block truncate font-mono text-[10px] text-white/65">{tx.hash.slice(0,12)}…{tx.hash.slice(-8)}</span><span className="mt-1 block text-[9px] text-white/30">Block {tx.block} · confirmed</span></span><span className="shrink-0 text-xs font-medium text-emerald-200">+{tx.amount.toFixed(4)} USDG</span></a>)}</div>}</section>
        <section className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5"><div className="text-xs font-medium text-white/80">Workspace shortcuts</div><div className="mt-3 flex flex-col gap-2"><button onClick={() => setActive("Marketplace")} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-white/15"><AppIcon name="marketplace" size={16} className="text-emerald-200/65"/><span className="flex-1"><span className="block text-[11px] text-white/75">Manage endpoints</span><span className="mt-1 block text-[9px] text-white/35">Publish and inspect public listings</span></span><AppIcon name="arrowRight" size={14} className="text-white/30"/></button><button onClick={() => setActive("API Keys")} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-white/15"><AppIcon name="key" size={16} className="text-emerald-200/65"/><span className="flex-1"><span className="block text-[11px] text-white/75">API credentials</span><span className="mt-1 block text-[9px] text-white/35">Create, review or revoke keys</span></span><AppIcon name="arrowRight" size={14} className="text-white/30"/></button><a href="/docs" className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/15"><AppIcon name="docs" size={16} className="text-emerald-200/65"/><span className="flex-1"><span className="block text-[11px] text-white/75">Integration guides</span><span className="mt-1 block text-[9px] text-white/35">SDKs, middleware and examples</span></span><AppIcon name="arrow" size={13} className="text-white/30"/></a></div><div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-3"><div className="flex items-center justify-between"><span className="text-[10px] text-white/45">Supported SDK rails</span><span className="font-mono text-xs text-white/75">{rails.length || "—"}</span></div><button onClick={() => setActive("Networks")} className="mt-2 text-[10px] text-emerald-200/65 hover:text-emerald-100">Review network coverage →</button></div></section>
      </div>
    </>;

    if (active === "Marketplace") return <>
      <PageHeading eyebrow="ENDPOINT DIRECTORY" title="Marketplace." description="Publish paid API endpoints and browse the verified public directory."/>
      {!authorized && <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-amber-200/10 bg-amber-100/[0.035] p-4"><div><div className="text-xs font-medium text-white/80">Wallet authorization required to publish</div><div className="mt-1 text-[10px] text-white/40">Browse remains public; publishing is wallet-scoped.</div></div><button onClick={authorize} disabled={authBusy} className="shrink-0 rounded-xl bg-emerald-200 px-3 py-2 text-[10px] font-semibold text-[#08120d]">{authBusy ? "Signing…" : "Authorize"}</button></div>}
      {authorized && <form onSubmit={publishListing} className="mb-3 rounded-2xl border border-white/[0.07] bg-[#141616] p-4">
        <div className="mb-3 flex gap-2">
          <button type="button" onClick={() => setListingMode("hosted")} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${listingMode === "hosted" ? "bg-emerald-200 text-[#08120d]" : "border border-white/10 text-white/50 hover:text-white/80"}`}>Hosted by Verge (instant)</button>
          <button type="button" onClick={() => setListingMode("self")} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${listingMode === "self" ? "bg-emerald-200 text-[#08120d]" : "border border-white/10 text-white/50 hover:text-white/80"}`}>Self-hosted URL</button>
        </div>
        {listingMode === "hosted" ? (
          <div className="grid gap-2 md:grid-cols-[1.2fr_1.6fr_.8fr_1fr_auto] md:items-center">
            <input required value={listingName} onChange={(e) => setListingName(e.target.value)} placeholder="Listing name" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
            <select value={listingTemplate} onChange={(e) => { setListingTemplate(e.target.value); const t = templates.find((x) => x.id === e.target.value); if (t) setListingPrice(String(t.defaultPrice)); }} className="input-dark !rounded-xl !border-white/[0.08] !bg-[#111312] !text-xs">
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input required type="number" min="0" step="0.000001" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="Price" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
            <select value={listingNetwork} onChange={(e) => setListingNetwork(e.target.value)} className="input-dark !rounded-xl !border-white/[0.08] !bg-[#111312] !text-xs"><option value="robinhood-mainnet">Robinhood · USDG</option></select>
            <button type="submit" disabled={publishBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-xs font-semibold text-[#08120d] disabled:opacity-50">{publishBusy ? "Publishing…" : "Publish"}</button>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_.7fr_1fr_auto] md:items-center">
            <input required value={listingName} onChange={(e) => setListingName(e.target.value)} placeholder="Endpoint name" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
            <input required type="url" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://api.example.com" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
            <input required type="number" min="0" step="0.000001" value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} placeholder="Price" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
            <select value={listingNetwork} onChange={(e) => setListingNetwork(e.target.value)} className="input-dark !rounded-xl !border-white/[0.08] !bg-[#111312] !text-xs"><option value="robinhood-mainnet">Robinhood · USDG</option><option value="ethereum-mainnet">Ethereum · USDC</option><option value="base-mainnet">Base · USDC</option><option value="arbitrum-mainnet">Arbitrum · USDC</option><option value="polygon-mainnet">Polygon · USDC</option><option value="solana-mainnet">Solana · USDC</option><option value="sui-mainnet">Sui · USDC</option></select>
            <button type="submit" disabled={publishBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-xs font-semibold text-[#08120d] disabled:opacity-50">{publishBusy ? "Checking…" : "Publish"}</button>
          </div>
        )}
        {listingMode === "hosted" && <p className="mt-2 text-[10px] text-white/35">Verge hosts this endpoint at a live URL and proxies to a real upstream API. Anyone can call it, pay {listingPrice || "…"} USDG, and get real data back — settled straight to your wallet.</p>}
      </form>}
      {justPublished && <div className="mb-5 rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.05] p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-100"><AppIcon name="check" size={15}/>Endpoint is live</div>
        <a href={justPublished.url} target="_blank" rel="noreferrer" className="mt-2 block break-all font-mono text-[11px] text-emerald-200/85 hover:text-emerald-100">{justPublished.url}</a>
        <p className="mt-2 text-[10px] leading-4 text-white/45">Anyone who calls this URL gets a real HTTP 402 challenge. Pay {justPublished.price} USDG on Robinhood Chain and it unlocks — try it from the Live Demo tab or curl it yourself.</p>
      </div>}
      {authError && <p className="mb-4 text-xs text-rose-300">{authError}</p>}{activityError && <p className="mb-4 text-xs text-rose-300">{activityError}</p>}
      {activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Loading the public directory…</div> : listings.length === 0 ? <TableEmpty title="No verified endpoints listed yet" description="When endpoint owners publish a paid API to the directory, it will appear here." action={<a href="/api/catalog" target="_blank" rel="noreferrer" className="text-[11px] text-emerald-200/70">Inspect the public catalog ↗</a>}/> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{listings.map((item) => <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-medium text-white/85">{item.name}</h2><a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[10px] text-white/35 hover:text-emerald-200">{item.url}</a></div>{item.hostedSlug ? <span className="rounded-md border border-emerald-200/20 bg-emerald-200/[0.08] px-2 py-1 font-mono text-[9px] text-emerald-200">LIVE</span> : <span className="rounded-md border border-emerald-200/10 bg-emerald-200/[0.04] px-2 py-1 font-mono text-[9px] text-emerald-100/70">{item.healthStatus || 402}</span>}</div><div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3"><span className="font-mono text-[10px] text-white/45">{item.network || "robinhood-mainnet"}</span><span className="text-xs font-medium text-white/75">{Number(item.price).toFixed(6)} {item.asset || "USDG"}</span></div><div className="mt-2 flex gap-3 text-[9px] text-white/30"><span>{item.paidCallsCount || 0} paid calls</span><span>{item.requestsCount || 0} requests</span></div></article>)}</div>}
    </>;

    if (active === "Data Feeds") return <>
      <PageHeading eyebrow="LIVE · NOT SIMULATED" title="Data feeds." description="Real upstream data behind Verge's hosted marketplace templates — free to preview here, payable via x402 once published as an endpoint." action={<span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-[10px] text-white/45"><span className="size-1.5 rounded-full bg-emerald-300"/>Refreshed every 60s</span>}/>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { id: "news", label: "Crypto headlines", source: "cointelegraph.com/rss" },
          { id: "alerts", label: "Trending pools", source: "geckoterminal.com · Robinhood Chain" },
          { id: "whale-alerts", label: "Whale liquidity", source: "geckoterminal.com · Robinhood Chain" },
          { id: "signals", label: "Momentum signals", source: "derived from live pool data" },
        ].map(({ id, label, source }) => {
          const preview = feedPreviews[id];
          return <section key={id} className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-medium text-white/85">{label}</div><div className="mt-1 text-[10px] text-white/35">{source}</div></div><span className="rounded-full border border-white/[0.08] px-2 py-1 font-mono text-[8px] tracking-wider text-emerald-200/70">LIVE</span></div>
            {feedsLoading && !preview ? <div className="rounded-xl border border-white/[0.06] bg-black/10 p-6 text-center text-[11px] text-white/35">Fetching live data…</div>
              : preview?.error ? <div className="rounded-xl border border-rose-200/10 bg-rose-200/[0.03] p-4 text-[11px] text-rose-200">{preview.error}</div>
              : <pre className="max-h-64 overflow-auto rounded-xl border border-white/[0.06] bg-black/20 p-3 font-mono text-[10px] leading-5 text-white/70">{JSON.stringify(preview?.data, null, 2)}</pre>}
          </section>;
        })}
      </div>
      <p className="mt-4 text-[10px] text-white/30">These previews call the same live upstream as a paid `/x/&lt;slug&gt;` endpoint would, sharing a 60-second cache. Publish one from the Marketplace tab to make it payable by agents.</p>
    </>;

    if (active === "Transactions" || active === "Receipts") return <>
      <PageHeading eyebrow={active === "Receipts" ? "SETTLEMENT PROOFS" : "ONCHAIN ACTIVITY"} title={active === "Receipts" ? "Receipts." : "Transactions."} description={active === "Receipts" ? "Confirmed incoming USDG transfers, linked to their onchain explorer records." : "Recent USDG Transfer events received by your connected wallet on Robinhood Chain."} action={<span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-[10px] text-white/45"><span className="size-1.5 rounded-full bg-emerald-300"/>Robinhood · 4663</span>}/>
      {!authorized ? <TableEmpty title="Sign in to view wallet activity" description="A wallet signature is required to query transaction and receipt records for your address." action={<button onClick={authorize} disabled={authBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d]">{authBusy ? "Waiting for signature…" : "Sign in with wallet"}</button>}/> : activityError ? <div className="rounded-2xl border border-rose-200/10 bg-rose-200/[0.03] p-5 text-xs text-rose-200">{activityError}</div> : activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Scanning recent Transfer events…</div> : activity.length === 0 ? <TableEmpty title={active === "Receipts" ? "No receipts yet" : "No incoming transactions yet"} description="New confirmed USDG transfers to this wallet will be shown here with their block and explorer link."/> : <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141616]"><div className="hidden grid-cols-[1.4fr_.8fr_.7fr_.6fr] gap-3 border-b border-white/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.12em] text-white/30 md:grid"><span>Transaction</span><span>Amount</span><span>Block</span><span>Status</span></div><div className="divide-y divide-white/[0.05]">{activity.map((tx) => <a key={tx.hash+tx.block} href={tx.explorer} target="_blank" rel="noreferrer" className="grid gap-2 px-4 py-3 transition hover:bg-white/[0.02] md:grid-cols-[1.4fr_.8fr_.7fr_.6fr] md:items-center md:gap-3 md:px-5"><span className="truncate font-mono text-[10px] text-white/70">{tx.hash.slice(0,14)}…{tx.hash.slice(-8)} <AppIcon name="arrow" size={11} className="ml-1 inline text-white/30"/></span><span className="text-xs text-emerald-200">{tx.amount.toFixed(6)} USDG</span><span className="text-[10px] text-white/40">Block {tx.block}</span><span className="text-[10px] text-emerald-200/70">Confirmed</span></a>)}</div></div>}
    </>;

    if (active === "Wallets") return <>
      <PageHeading eyebrow="AGENT IDENTITY" title="Agent wallets." description="Generate EVM keypairs for your agents on Robinhood Chain. Private keys are shown once, then stored only in your encrypted vault — Verge never displays them again." action={authorized ? <button onClick={() => void createWallet()} disabled={walletBusy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-200 px-3.5 py-2.5 text-[11px] font-semibold text-[#08120d] disabled:opacity-50"><AppIcon name="wallet" size={14}/> {walletBusy ? "Generating…" : "New agent wallet"}</button> : undefined}/>
      {!authorized ? <TableEmpty title="Sign in to manage agent wallets" description="Agent wallets are tied to your wallet session and can only be created or viewed after wallet authorization." action={<button onClick={authorize} disabled={authBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d]">{authBusy ? "Waiting for signature…" : "Sign in with wallet"}</button>}/> : <>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={walletLabel} onChange={(e) => setWalletLabel(e.target.value)} placeholder="Label (optional, e.g. research-bot)" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs sm:max-w-xs"/></div>
        {newWallet && <div className="mb-4 rounded-2xl border border-amber-200/20 bg-amber-100/[0.04] p-4">
          <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-medium text-amber-100"><AppIcon name="check" size={15}/>Wallet created</span><button type="button" onClick={() => { setNewWallet(null); setPkRevealed(false); }} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-white/50 transition hover:border-white/20 hover:text-white">Dismiss</button></div>
          <p className="mt-1 text-[10px] text-white/40">This private key is shown only once and cannot be recovered afterward — Verge stores only an encrypted copy under <code className="text-white/60">{newWallet.vaultRef}</code> for server-side use, never as retrievable plaintext.</p>
          <div className="mt-3 space-y-2">
            <div><div className="text-[9px] uppercase tracking-wide text-white/30">Address</div><code className="mt-1 block break-all rounded-xl border border-white/[0.07] bg-black/20 p-3 font-mono text-[11px] text-white/80">{newWallet.address}</code></div>
            <div>
              <div className="flex items-center justify-between"><div className="text-[9px] uppercase tracking-wide text-white/30">Private key</div>{pkRevealed && <button type="button" onClick={() => setPkRevealed(false)} className="text-[9px] text-white/40 hover:text-white/70">Hide</button>}</div>
              {pkRevealed ? (
                <div className="mt-1 flex items-stretch gap-2">
                  <code className="block flex-1 break-all rounded-xl border border-rose-200/20 bg-black/20 p-3 font-mono text-[11px] text-rose-100/90">{newWallet.privateKey}</code>
                  <button type="button" onClick={() => void copyPrivateKey()} className="shrink-0 rounded-xl border border-white/10 px-3 text-[10px] text-white/60 transition hover:border-white/25 hover:text-white">{pkCopied ? "Copied ✓" : "Copy"}</button>
                </div>
              ) : (
                <button type="button" onClick={() => setPkRevealed(true)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rose-200/25 bg-black/15 p-3 text-[11px] text-rose-100/70 transition hover:border-rose-200/45 hover:text-rose-100">
                  <AppIcon name="key" size={13}/> Click to reveal private key
                </button>
              )}
              <p className="mt-1.5 text-[9px] text-white/30">Sensitive — hidden by default so it never appears in screenshots or screen recordings by accident.</p>
            </div>
          </div>
        </div>}
        {authError && <p className="mb-4 text-xs text-rose-300">{authError}</p>}
        {activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Loading agent wallets…</div> : agentWallets.length === 0 ? <TableEmpty title="No agent wallets yet" description="Generate a wallet to give an agent its own on-chain identity for paying x402 endpoints." action={<button onClick={() => void createWallet()} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d]">Create your first agent wallet</button>}/> : <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141616]"><div className="hidden grid-cols-[1fr_1.3fr_.9fr_.6fr] gap-3 border-b border-white/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.12em] text-white/30 md:grid"><span>Label</span><span>Address</span><span>Vault ref</span><span>Created</span></div><div className="divide-y divide-white/[0.05]">{agentWallets.map((w) => <div key={w.address} className="grid gap-2 px-4 py-4 md:grid-cols-[1fr_1.3fr_.9fr_.6fr] md:items-center md:px-5"><span className="text-[11px] text-white/75">{w.label}</span><span className="truncate font-mono text-[10px] text-white/65">{w.address}</span><span className="truncate font-mono text-[9px] text-white/35">{w.vaultRef}</span><span className="text-[10px] text-white/40">{new Date(w.createdAt).toLocaleDateString()}</span></div>)}</div></div>}
      </>}
    </>;

    if (active === "Vault") return <>
      <PageHeading eyebrow="AGENT CREDENTIALS" title="Credential vault." description="Store API keys and secrets your agents need, AES-256-GCM encrypted. Agents reference a secret as {{name}} — the real value never appears in an agent's request template." />
      {!authorized ? <TableEmpty title="Sign in to manage your vault" description="Vault entries are scoped to your wallet session." action={<button onClick={authorize} disabled={authBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d]">{authBusy ? "Waiting for signature…" : "Sign in with wallet"}</button>}/> : <>
        <form onSubmit={vaultStore} className="mb-4 grid gap-2 rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:grid-cols-[1fr_2fr_auto]">
          <input required value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="Name (e.g. openai_key)" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
          <input required type="password" value={vaultValue} onChange={(e) => setVaultValue(e.target.value)} placeholder="Secret value" className="input-dark !rounded-xl !border-white/[0.08] !bg-black/15 !text-xs"/>
          <button type="submit" disabled={vaultBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-xs font-semibold text-[#08120d] disabled:opacity-50">{vaultBusy ? "Encrypting…" : "Store secret"}</button>
        </form>
        {authError && <p className="mb-4 text-xs text-rose-300">{authError}</p>}
        {activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Loading vault entries…</div> : vaultEntries.length === 0 ? <TableEmpty title="No secrets stored yet" description="Store an API key or credential once, then reference it as {{name}} in an agent's request template." /> : <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141616]"><div className="hidden grid-cols-[1fr_.7fr_.6fr_.6fr_auto] gap-3 border-b border-white/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.12em] text-white/30 md:grid"><span>Name</span><span>Created</span><span>Uses</span><span>Size</span><span/></div><div className="divide-y divide-white/[0.05]">{vaultEntries.map((entry) => <div key={entry.name} className="grid gap-2 px-4 py-4 md:grid-cols-[1fr_.7fr_.6fr_.6fr_auto] md:items-center md:px-5"><span className="font-mono text-[11px] text-white/80">{"{{"}{entry.name}{"}}"}</span><span className="text-[10px] text-white/40">{new Date(entry.createdAt).toLocaleDateString()}</span><span className="text-[10px] text-white/45">{entry.hits}</span><span className="text-[10px] text-white/35">{entry.encLen}B</span><button onClick={() => void vaultRemove(entry.name)} disabled={vaultDeletingName === entry.name} className="justify-self-start rounded-lg border border-rose-200/10 px-2.5 py-1.5 text-[9px] text-rose-200/65 transition hover:border-rose-200/25 hover:text-rose-100 disabled:opacity-40 md:justify-self-end">{vaultDeletingName === entry.name ? "Deleting…" : "Delete"}</button></div>)}</div></div>}
      </>}
    </>;

    if (active === "Reputation") return <>
      <PageHeading eyebrow="ON-CHAIN TRUST" title="Reputation." description="Scores derived only from settled payments through Verge's facilitator — anchored to verifiable transaction hashes, never self-reported."/>
      {authorized && myReputation && <div className="mb-5 rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.05] p-5">
        <div className="flex items-center justify-between"><div><div className="text-xs font-medium text-white/80">Your agent reputation</div><div className="mt-1 font-mono text-[10px] text-white/40">{myReputation.address}</div></div><div className="text-right"><div className="text-2xl font-medium text-emerald-200">{myReputation.score}</div><div className={`text-[10px] uppercase tracking-wide ${myReputation.tier === "trusted" ? "text-emerald-300" : myReputation.tier === "established" ? "text-emerald-200/70" : "text-white/40"}`}>{myReputation.tier}</div></div></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><div className="text-[9px] text-white/35">Settled calls</div><div className="mt-1 text-sm text-white/80">{myReputation.settledCount}</div></div><div><div className="text-[9px] text-white/35">Total paid</div><div className="mt-1 text-sm text-white/80">{myReputation.totalUsdg} USDG</div></div><div><div className="text-[9px] text-white/35">First seen</div><div className="mt-1 text-sm text-white/80">{myReputation.firstSeen ? new Date(myReputation.firstSeen).toLocaleDateString() : "—"}</div></div><div><div className="text-[9px] text-white/35">Last active</div><div className="mt-1 text-sm text-white/80">{myReputation.lastSeen ? new Date(myReputation.lastSeen).toLocaleDateString() : "—"}</div></div></div>
      </div>}
      {activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Loading leaderboard…</div> : repLeaderboard.length === 0 ? <TableEmpty title="No settled agents yet" description="Once agents start paying x402 endpoints through Verge, their reputation will appear here."/> : <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141616]"><div className="hidden grid-cols-[1.4fr_.5fr_.6fr_.7fr_.6fr] gap-3 border-b border-white/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.12em] text-white/30 md:grid"><span>Address</span><span>Score</span><span>Tier</span><span>Settled</span><span>Total USDG</span></div><div className="divide-y divide-white/[0.05]">{repLeaderboard.map((r) => <div key={r.address} className="grid gap-2 px-4 py-4 md:grid-cols-[1.4fr_.5fr_.6fr_.7fr_.6fr] md:items-center md:px-5"><span className="truncate font-mono text-[10px] text-white/70">{r.address.slice(0,10)}…{r.address.slice(-6)}</span><span className="text-xs font-medium text-emerald-200">{r.score}</span><span className={`text-[10px] uppercase ${r.tier === "trusted" ? "text-emerald-300" : r.tier === "established" ? "text-emerald-200/70" : "text-white/40"}`}>{r.tier}</span><span className="text-[10px] text-white/45">{r.settledCount}</span><span className="text-[10px] text-white/45">{r.totalUsdg}</span></div>)}</div></div>}
    </>;

    return <>
      <PageHeading eyebrow="DEVELOPER ACCESS" title="API keys." description="Create scoped gateway credentials, monitor their request quota, and revoke keys you no longer use." action={<button onClick={() => { setNewKey(""); void generateKey(); }} disabled={!authorized} className="inline-flex items-center gap-2 rounded-xl bg-emerald-200 px-3.5 py-2.5 text-[11px] font-semibold text-[#08120d] disabled:cursor-not-allowed disabled:opacity-40"><AppIcon name="key" size={14}/> Create API key</button>}/>
      {!authorized ? <TableEmpty title="Sign in to manage credentials" description="API keys are tied to your wallet and can only be viewed or revoked after wallet authorization." action={<button onClick={authorize} disabled={authBusy} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d]">{authBusy ? "Waiting for signature…" : "Sign in with wallet"}</button>}/> : <>
        {newKey && <div className="mb-4 rounded-2xl border border-emerald-200/15 bg-emerald-200/[0.04] p-4"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-medium text-emerald-100"><AppIcon name="check" size={15}/>Key created · copy it now</span><button type="button" onClick={() => setNewKey("")} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-white/50 transition hover:border-white/20 hover:text-white">Hide</button></div><p className="mt-1 text-[10px] text-white/40">The full value will not be shown again.</p><code className="mt-3 block break-all rounded-xl border border-white/[0.07] bg-black/20 p-3 font-mono text-[11px] text-white/80">{newKey}</code><div className="mt-2 text-[9px] text-white/35">Send as <code className="text-white/55">X-API-Key</code> · 1,000 requests/day</div></div>}
        {authError && <p className="mb-4 text-xs text-rose-300">{authError}</p>}{activityError && <p className="mb-4 text-xs text-rose-300">{activityError}</p>}
        {activityLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-8 text-center text-xs text-white/35">Loading API credentials…</div> : keys.length === 0 ? <TableEmpty title="No API keys yet" description="Create a key to authenticate applications that use Verge’s gateway. The full key appears only once." action={<button onClick={() => void generateKey()} className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d]">Create your first key</button>}/> : <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141616]"><div className="hidden grid-cols-[1fr_1fr_.7fr_.6fr_auto] gap-3 border-b border-white/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.12em] text-white/30 md:grid"><span>Credential</span><span>Created</span><span>Usage</span><span>Status</span><span/></div><div className="divide-y divide-white/[0.05]">{keys.map((key) => <div key={key.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_1fr_.7fr_.6fr_auto] md:items-center md:px-5"><span className="font-mono text-[10px] text-white/70">vg_live_••••{key.lastFour}</span><span className="text-[10px] text-white/40">{new Date(key.createdAt).toLocaleDateString()}</span><span className="text-[10px] text-white/45">{key.usageCount || 0} / {key.quotaLimit || 1000}</span><span className={`text-[10px] ${key.revokedAt ? "text-rose-200/70" : "text-emerald-200/70"}`}>{key.revokedAt ? "Revoked" : "Active"}</span>{!key.revokedAt && <button onClick={() => void revokeKey(key.id)} disabled={revokingId === key.id} className="justify-self-start rounded-lg border border-rose-200/10 px-2.5 py-1.5 text-[9px] text-rose-200/65 transition hover:border-rose-200/25 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40 md:justify-self-end">{revokingId === key.id ? "Revoking…" : "Revoke"}</button>}</div>)}</div></div>}
      </>}
    </>;
  };

  return <main className="min-h-screen bg-[#0d0f0e] text-white md:flex"><Sidebar active={active} onSelect={changeActive} onOpenPalette={() => setPaletteOpen(true)} address={address}/><CommandPalette commands={commands} open={paletteOpen} onOpenChange={setPaletteOpen}/><div className="min-w-0 flex-1"><MobileTabBar active={active} onSelect={changeActive}/>{shellHeader}<div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8 xl:px-10">{mainContent()}</div><footer className="mx-auto max-w-[1440px] border-t border-white/[0.06] px-4 py-5 text-[9px] text-white/25 md:px-8 xl:px-10"><div className="flex flex-wrap items-center justify-between gap-2"><span>Verge Gateway · Wallet-scoped access</span><span>Network: Robinhood Chain 4663 · SDK catalog: {rails.length || "…"} rails</span></div></footer></div></main>;
}
