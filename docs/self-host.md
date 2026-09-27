# Self-Hosting the Verge x402 Gateway

<div align="center">

**Run the full Verge payment stack on your own infrastructure.**  
Zero facilitator fee · Full data ownership · Private RPC · Custom domain

</div>

---

## Prerequisites

| Requirement | Minimum version | Notes |
|-------------|----------------|-------|
| Docker | 24.x | [Install guide](https://docs.docker.com/get-docker/) |
| Docker Compose | v2 (plugin) or v1 (standalone) | Ships with Docker Desktop |
| CPU | 1 vCPU | 2+ recommended |
| RAM | 512 MB | 1 GB+ recommended |
| Disk | 2 GB | For Postgres data + Docker layers |
| Internet | Outbound HTTPS | For Robinhood Chain RPC calls |

> **Postgres is bundled** — the `docker-compose.yml` starts a `postgres:16-alpine`
> container alongside the app. You can also point `DATABASE_URL` at an external
> managed Postgres if you prefer.

---

## Quick Start

Three commands from zero to a running gateway:

```bash
# 1. Clone the repo
git clone https://github.com/vergex402/verge && cd verge

# 2. Run the setup script (creates .env.local, builds images, starts services)
./scripts/setup.sh

# 3. Open the developer console
open http://localhost:3000/app
```

The setup script will:
- Verify Docker and Docker Compose are installed
- Copy `.env.example` → `.env.local` (only if `.env.local` doesn't exist yet)
- Build the Docker image from source
- Start `verge` + `postgres` in detached mode
- Poll until both services are healthy
- Print the local URLs

---

## Environment Variable Reference

Copy `.env.example` to `.env.local` and set the values before starting.

```bash
cp .env.example .env.local
$EDITOR .env.local
```

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string. Auto-set to the bundled container when using docker-compose. Change this when connecting to an external Postgres. | `postgres://verge:pass@localhost:5432/verge` |
| `VERGE_VAULT_KEY` | 32-byte hex key for AES-256-GCM encryption of the credential vault. **Required in production.** Generate with the command below. | `a3f8...64-char hex` |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL of your deployment (no trailing slash). Used in x402 payment challenge URLs. | `https://pay.example.com` |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Reown (WalletConnect) project ID. Required for wallet login in `/app`. [Create one free at cloud.reown.com](https://cloud.reown.com). | `abc123…` |

### Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `ROBINHOOD_RPC_URL` | Primary RPC endpoint for Robinhood Chain. Public fallbacks are always tried. | `https://rpc.mainnet.chain.robinhood.com` |
| `ROBINHOOD_RPC_FALLBACK_URLS` | Comma-separated additional fallback RPC endpoints. | *(empty — public defaults used)* |
| `ROBINHOOD_SCAN_BLOCKS` | How many blocks back to scan when verifying payments. Higher values tolerate slower nodes. | `10` |
| `ALCHEMY_API_KEY` | Alchemy key, used as the **primary** provider for all chains if set. Recommended for production. [Get one at alchemy.com](https://alchemy.com). | *(empty)* |

### Optional

| Variable | Description |
|----------|-------------|
| `VERGE_SETTLEMENT_WALLET` | EVM address that receives facilitator fees. Defaults to no-op (fees not collected). |
| `POSTGRES_USER` | Username for the bundled Postgres container. | Default: `verge` |
| `POSTGRES_PASSWORD` | Password for the bundled Postgres container. **Change in production.** | Default: `verge` |
| `POSTGRES_DB` | Database name for the bundled Postgres container. | Default: `verge` |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` | RPC URL served to the browser (wagmi / wallet pop-ups). | Same as `ROBINHOOD_RPC_URL` |
| `DEMO_MERCHANT_WALLET` | Wallet used by the interactive live demo on the landing page. Hidden when unset. | *(empty)* |
| `NEXT_PUBLIC_VERGE_TOKEN_CA` | $VERGE token contract address. Enables fee-tier discounts. Leave blank if unused. | *(empty)* |

#### Generating `VERGE_VAULT_KEY`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠ **Never change `VERGE_VAULT_KEY` on a running instance.** Existing vault entries
> (agent wallet private keys, stored credentials) cannot be decrypted after a key
> rotation. Back up the old key and plan a migration if you need to rotate.

---

## Docker Commands Reference

```bash
# Start all services in the background
docker compose up -d

# Stop all services (data is preserved in the postgres_data volume)
docker compose down

# Stop and remove all data (WARNING: deletes the Postgres volume)
docker compose down -v

# Stream live logs from the app
docker compose logs -f verge

# Stream live logs from Postgres
docker compose logs -f postgres

# Rebuild the app image (after pulling new code)
docker compose build --pull

# Open a Postgres shell
docker compose exec postgres psql -U verge -d verge

# Check service health
docker compose ps
```

---

## Upgrading

```bash
# Pull the latest code
git pull

# Rebuild the image and restart
docker compose build --pull && docker compose up -d
```

Docker Compose performs a rolling replacement — Postgres data is preserved in
the named volume `postgres_data` across upgrades.

> The app runs database migrations automatically on startup via `ensureSchema()`
> — no manual migration step is needed.

---

## Production Checklist

Before going public, make sure you have:

- [ ] **`VERGE_VAULT_KEY`** set to a strong random 32-byte hex value
- [ ] **`POSTGRES_PASSWORD`** changed from the default `verge`
- [ ] **`NEXT_PUBLIC_SITE_URL`** pointing at your public domain
- [ ] **`NEXT_PUBLIC_REOWN_PROJECT_ID`** from [cloud.reown.com](https://cloud.reown.com)
- [ ] A TLS terminator (Caddy, Nginx, Cloudflare Tunnel) in front of port 3000
- [ ] Postgres volume backed up periodically (see `docs/OPERATIONS.md`)
- [ ] Outbound HTTPS allowed from the server to Robinhood Chain RPC endpoints

### TLS with Caddy (example)

```caddyfile
pay.example.com {
    reverse_proxy localhost:3000
}
```

### TLS with Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

---

## Architecture

```
                         ┌───────────────────────────────────┐
Internet / Agents ──────▶│  TLS terminator (Caddy / CF Tunnel)│
                         └──────────────┬────────────────────┘
                                        │ :443 → :3000
                         ┌──────────────▼────────────────────┐
                         │  verge  (Next.js 16 standalone)   │
                         │  node server.js  :3000            │
                         │                                   │
                         │  /api/facilitator/{verify,settle} │  ◀── x402 payment rail
                         │  /api/catalog, /api/discover      │  ◀── machine-readable
                         │  /api/mcp                         │  ◀── MCP tool server
                         │  /app  (developer console)        │
                         └──────────────┬────────────────────┘
                                        │ DATABASE_URL
                         ┌──────────────▼────────────────────┐
                         │  postgres:16-alpine               │
                         │  volume: postgres_data            │
                         └───────────────────────────────────┘
```

The app schema is created automatically on first start. No seed data is required.

---

## Troubleshooting

### `docker compose up` fails with "port 3000 already in use"

Another process is using port 3000. Either stop it or change the host-side port:

```yaml
# docker-compose.yml
ports:
  - "3001:3000"   # map host:3001 → container:3000
```

### The app starts but `/api/catalog` returns a 500

Check the app logs for a Postgres connection error:

```bash
docker compose logs verge | grep "DATABASE_URL\|ECONNREFUSED\|error"
```

Make sure `DATABASE_URL` in `.env.local` points to the correct host. When using
the bundled container the hostname must be `postgres` (the Compose service name),
not `localhost`.

### Wallet login doesn't work (WalletConnect modal doesn't open)

`NEXT_PUBLIC_REOWN_PROJECT_ID` is missing or incorrect. Create a free project at
[cloud.reown.com](https://cloud.reown.com) and add the project ID to `.env.local`,
then restart:

```bash
docker compose up -d --force-recreate verge
```

### x402 payment verification fails / "All RPC endpoints failed"

The facilitator can't reach Robinhood Chain. Check:

1. Outbound HTTPS is allowed from the server
2. `ROBINHOOD_RPC_URL` is a valid endpoint (test: `curl -s https://rpc.mainnet.chain.robinhood.com` should return a JSON-RPC response)
3. Add an Alchemy key via `ALCHEMY_API_KEY` for a more reliable primary provider

### Vault operations fail with "decrypt error"

`VERGE_VAULT_KEY` has changed since the entries were written, or it was never set
(dev-mode derived key). If you are migrating from a dev setup to production,
export your vault entries before changing the key.

### Database is out of disk space

The Postgres volume is stored at the Docker volumes directory (usually
`/var/lib/docker/volumes/verge_postgres_data`). Either extend disk space or
prune old data:

```bash
# Check volume size
docker system df -v | grep postgres_data

# Vacuum the database
docker compose exec postgres psql -U verge -d verge -c "VACUUM ANALYZE;"
```

---

## Support

- **GitHub Issues**: [github.com/vergex402/verge/issues](https://github.com/vergex402/verge/issues)
- **Docs**: [vergesnowy.com/docs](https://vergesnowy.com/docs)
- **Twitter**: [@vergesnowy402](https://x.com/vergesnowy402)

---

*MIT © 2026 Verge Labs · [vergesnowy.com](https://vergesnowy.com)*
