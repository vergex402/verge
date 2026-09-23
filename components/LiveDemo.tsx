"use client";

import { useCallback, useState } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import WalletButton from "@/components/WalletButton";
import AppIcon from "@/components/AppIcon";

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
const erc20Abi = [{
  type: "function", name: "transfer", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

type Challenge = { nonce: string; amount: number; token: string; network: string; recipient: string; memo: string };
type StepKey = "idle" | "requesting" | "challenged" | "paying" | "confirming" | "verifying" | "unlocked" | "error";

const STEP_ORDER: { key: StepKey; label: string; detail: string }[] = [
  { key: "requesting", label: "Request", detail: "GET /api/demo" },
  { key: "challenged", label: "402 Challenge", detail: "Server returns payment terms" },
  { key: "paying", label: "Pay", detail: "Wallet sends 0.001 USDG" },
  { key: "confirming", label: "Confirm", detail: "Wait for Robinhood Chain block" },
  { key: "unlocked", label: "Unlocked", detail: "Retry with proof → 200 OK" },
];

function stepIndex(key: StepKey) {
  const i = STEP_ORDER.findIndex((s) => s.key === key);
  return i === -1 ? (key === "verifying" ? 4 : key === "error" ? -1 : 0) : i;
}

export default function LiveDemo() {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const onRobinhood = chainId === 4663;
  const [step, setStep] = useState<StepKey>("idle");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState("");
  const [unlockPayload, setUnlockPayload] = useState<Record<string, unknown> | null>(null);
  const [rawChallengeJson, setRawChallengeJson] = useState("");
  const [rawUnlockedJson, setRawUnlockedJson] = useState("");

  const { writeContractAsync, data: txHash, reset: resetWrite } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: 4663 });

  const reset = useCallback(() => {
    setStep("idle"); setChallenge(null); setError(""); setUnlockPayload(null);
    setRawChallengeJson(""); setRawUnlockedJson(""); resetWrite();
  }, [resetWrite]);

  const startDemo = useCallback(async () => {
    setError(""); setStep("requesting");
    try {
      const res = await fetch("/api/demo", { cache: "no-store" });
      const data = await res.json();
      if (res.status !== 402 || !data.challenge) throw new Error(data.error || "Expected a 402 challenge");
      setChallenge(data.challenge);
      setRawChallengeJson(JSON.stringify(data, null, 2));
      setStep("challenged");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach /api/demo");
      setStep("error");
    }
  }, []);

  const pay = useCallback(async () => {
    if (!challenge) return;
    setError(""); setStep("paying");
    try {
      const amountRaw = BigInt(Math.round(challenge.amount * 1_000_000)); // USDG has 6 decimals
      await writeContractAsync({
        address: USDG, abi: erc20Abi, functionName: "transfer",
        args: [challenge.recipient as `0x${string}`, amountRaw], chainId: 4663,
      });
      setStep("confirming");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment was cancelled or failed");
      setStep("error");
    }
  }, [challenge, writeContractAsync]);

  const verify = useCallback(async () => {
    if (!challenge || !txHash) return;
    setStep("verifying");
    try {
      const res = await fetch("/api/demo", { cache: "no-store", headers: { "x-pay-tx": txHash, "x-pay-nonce": challenge.nonce } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Verification returned HTTP ${res.status}`);
      setUnlockPayload(data);
      setRawUnlockedJson(JSON.stringify(data, null, 2));
      setStep("unlocked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Settlement could not be verified yet — try again in a few seconds");
      setStep("error");
    }
  }, [challenge, txHash]);

  // Auto-verify once the payment transaction confirms onchain.
  if (receipt.isSuccess && step === "confirming") void verify();

  const idx = stepIndex(step === "error" ? "idle" : step);
  const explorerUrl = txHash ? `https://robinhoodchain.blockscout.com/tx/${txHash}` : null;

  return (
    <div>
      <div className="mb-5 grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white/85">Live x402 flow</div>
              <div className="mt-1 text-[11px] text-white/40">Real HTTP 402 challenge, real onchain USDG settlement on Robinhood Chain.</div>
            </div>
            <span className="rounded-full border border-emerald-200/15 bg-emerald-200/[0.06] px-2.5 py-1 font-mono text-[9px] tracking-wider text-emerald-200/80">LIVE · NOT SIMULATED</span>
          </div>

          {/* step rail */}
          <div className="mb-5 flex items-center gap-1 overflow-x-auto pb-1">
            {STEP_ORDER.map((s, i) => {
              const state = step === "error" ? (i < idx ? "done" : "pending") : i < idx ? "done" : i === idx ? "active" : "pending";
              return (
                <div key={s.key} className="flex shrink-0 items-center gap-1">
                  <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-mono transition-all duration-300 ${
                    state === "done" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" :
                    state === "active" ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 scale-105" :
                    "border-white/[0.08] bg-black/10 text-white/30"
                  }`}>
                    <span className={`size-1.5 rounded-full ${state === "done" ? "bg-emerald-400" : state === "active" ? "bg-emerald-300 animate-pulse" : "bg-white/15"}`} />
                    {s.label}
                  </div>
                  {i < STEP_ORDER.length - 1 && <span className="text-white/15 text-xs">→</span>}
                </div>
              );
            })}
          </div>

          {/* content per step */}
          {step === "idle" && (
            <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.012] px-5 py-8 text-center">
              <p className="mx-auto max-w-md text-xs leading-5 text-white/45">This calls the real <code className="text-white/70">/api/demo</code> endpoint. It will ask your connected wallet to sign a 0.001 USDG transfer on Robinhood Chain — the same flow any x402 client uses.</p>
              <button type="button" onClick={startDemo} className="mt-5 rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-semibold text-[#08120d] transition hover:bg-emerald-100">Start the live demo</button>
            </div>
          )}

          {step === "requesting" && (
            <div className="rounded-xl border border-white/[0.08] bg-black/10 px-5 py-8 text-center text-xs text-white/40">Requesting <code className="text-white/60">GET /api/demo</code>…</div>
          )}

          {(step === "challenged" || step === "paying" || step === "confirming" || step === "verifying" || step === "unlocked" || step === "error") && challenge && (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200/15 bg-amber-100/[0.035] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-100/75">HTTP 402 Payment Required</span>
                  <span className="rounded-md border border-amber-200/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-100/70">402</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11px] text-white/60 sm:grid-cols-4">
                  <div><div className="text-white/30">amount</div>{challenge.amount} USDG</div>
                  <div><div className="text-white/30">network</div>{challenge.network}</div>
                  <div><div className="text-white/30">nonce</div>{challenge.nonce}</div>
                  <div className="col-span-2 sm:col-span-1"><div className="text-white/30">recipient</div><span className="break-all">{challenge.recipient.slice(0, 6)}…{challenge.recipient.slice(-4)}</span></div>
                </div>
              </div>

              {step === "challenged" && (
                isConnected && onRobinhood ? (
                  <button type="button" onClick={pay} className="w-full rounded-xl bg-emerald-200 px-4 py-3 text-[12px] font-semibold text-[#08120d] transition hover:bg-emerald-100">Pay 0.001 USDG with wallet →</button>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-3">
                    <span className="text-[11px] text-white/45">{isConnected ? "Switch your wallet to Robinhood Chain 4663 to pay." : "Connect a wallet on Robinhood Chain to pay the challenge."}</span>
                    <WalletButton className="!shrink-0 !rounded-lg !px-3 !py-2 !text-[10px]" />
                  </div>
                )
              )}

              {step === "paying" && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-4 text-xs text-white/50"><span className="size-2 animate-pulse rounded-full bg-emerald-300" />Waiting for wallet signature…</div>
              )}

              {(step === "confirming" || step === "verifying") && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-4 text-xs text-white/50">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-300" />
                  {step === "confirming" ? "Waiting for onchain confirmation…" : "Verifying settlement with Verge…"}
                  {explorerUrl && <a href={explorerUrl} target="_blank" rel="noreferrer" className="ml-auto shrink-0 text-emerald-200/70 hover:text-emerald-100">View tx ↗</a>}
                </div>
              )}

              {step === "unlocked" && unlockPayload && (
                <div className="rounded-xl border border-emerald-200/15 bg-emerald-200/[0.04] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-100/85"><AppIcon name="check" size={13} />HTTP 200 OK — access granted</span>
                    {explorerUrl && <a href={explorerUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-200/70 hover:text-emerald-100">Settlement receipt ↗</a>}
                  </div>
                  <p className="text-[11px] leading-5 text-white/55">{typeof unlockPayload.payload === "object" && unlockPayload.payload && "message" in unlockPayload.payload ? String((unlockPayload.payload as Record<string, unknown>).message) : "Payment verified on-chain. Premium endpoint unlocked."}</p>
                  <button type="button" onClick={reset} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-white/60 transition hover:border-white/20 hover:text-white">Run it again</button>
                </div>
              )}

              {step === "error" && (
                <div className="rounded-xl border border-rose-200/15 bg-rose-200/[0.04] p-4">
                  <p className="text-[11px] text-rose-200">{error}</p>
                  <button type="button" onClick={reset} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-white/60 transition hover:border-white/20 hover:text-white">Try again</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5">
          <div className="text-xs font-medium text-white/80">Raw HTTP</div>
          <div className="mt-1 text-[10px] text-white/35">Exactly what the endpoint returns — no mock data.</div>
          <pre className="mt-3 max-h-[340px] overflow-auto rounded-xl border border-white/[0.06] bg-black/25 p-3 font-mono text-[10px] leading-5 text-white/60">
{rawUnlockedJson || rawChallengeJson || "// Click \"Start the live demo\" to see the 402 response here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-[#141616] p-4 md:p-5">
        <div className="text-xs font-medium text-white/80">What makes this real</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["No mock server", "This hits vergesnowy.com/api/demo — the same route any x402 client would call."],
            ["Real settlement asset", "0.001 USDG, an ERC-20 on Robinhood Chain (4663), sent from your connected wallet."],
            ["Onchain verification", "Verge reads the Transfer event log via Robinhood Chain RPC before unlocking."],
            ["Replay-safe", "The nonce is single-use — retrying the same transaction hash is rejected."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
              <div className="text-[11px] font-medium text-white/75">{title}</div>
              <div className="mt-1 text-[10px] leading-4 text-white/40">{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
