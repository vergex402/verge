import express from "express";
import { paywall } from "@vergex402/express";

const app = express();
const recipient = process.env.WALLET;
if (!recipient) throw new Error("Set WALLET to the receiving EVM address");

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/premium", paywall({
  amount: 0.001,
  recipient,
  network: "robinhood-mainnet", // switch explicitly to base-mainnet, arbitrum-mainnet, or polygon-mainnet when needed
}));
app.get("/api/premium", (_req, res) => res.json({ ok: true, message: "Payment verified. Resource unlocked." }));

app.listen(3000, () => console.log("Starter listening on http://localhost:3000"));
