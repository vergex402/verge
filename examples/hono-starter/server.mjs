import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paywall } from "@vergex402/hono";

const app = new Hono();
const recipient = process.env.WALLET;
if (!recipient) throw new Error("Set WALLET to the receiving EVM address");

app.get("/health", (c) => c.json({ ok: true }));
app.use("/api/premium", paywall({ amount: 0.001, recipient, network: "robinhood-mainnet" }));
app.get("/api/premium", (c) => c.json({ ok: true, message: "Payment verified. Resource unlocked." }));

serve({ fetch: app.fetch, port: 3000 });
console.log("Starter listening on http://localhost:3000");
