# Verge operations

## Health

The public health endpoint checks both durable storage and Robinhood RPC fallback:

```bash
curl https://vergesnowy.com/api/health
```

A healthy response includes:

```json
{
  "ok": true,
  "checks": {
    "database": "ok",
    "robinhoodRpc": { "chainId": "0x1237", "endpointsConfigured": 4 }
  }
}
```

## Services

```bash
systemctl status verge.service
systemctl status verge-backup.timer
journalctl -u verge.service -f
```

`verge.service` is restart-always and enabled on boot. `verge-backup.timer` writes a compressed Postgres snapshot daily and retains fourteen days under `/var/backups/verge/`.

## Database

Production persistence is Supabase Postgres via `DATABASE_URL` in `/root/verge/.env`. The value is never committed. The app applies additive schema migrations (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) on first database query.

## Audit events

Security-sensitive actions are append-only audited in Postgres:

```text
auth.challenge_issued
auth.session_created
api_key.created
api_key.revoked
marketplace.endpoint_published
```

Audit metadata intentionally never stores raw API keys, wallet signatures, or database credentials.

## RPC resilience

Robinhood requests fail over between the official endpoint, dRPC, PublicNode, and bloXroute. Set `ROBINHOOD_RPC_URL` to a paid primary provider and `ROBINHOOD_RPC_FALLBACK_URLS` as a comma-separated ordered fallback list when higher throughput is needed.
