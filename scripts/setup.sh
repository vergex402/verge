#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Verge x402 Gateway — self-host setup script
#  Usage: ./scripts/setup.sh [--no-start]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

log()  { echo -e "${BOLD}[verge]${RESET} $*"; }
ok()   { echo -e "${GREEN}  ✔${RESET}  $*"; }
warn() { echo -e "${YELLOW}  ⚠${RESET}  $*"; }
die()  { echo -e "${RED}  ✖${RESET}  $*" >&2; exit 1; }

# ── Resolve repo root ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

log "Verge x402 Gateway — self-host setup"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────
log "Checking prerequisites…"

if ! command -v docker &>/dev/null; then
  die "Docker is not installed. Install it from https://docs.docker.com/get-docker/ and re-run this script."
fi
ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# Support both legacy 'docker-compose' and plugin 'docker compose'
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  die "docker-compose (or 'docker compose' plugin) is not installed. See https://docs.docker.com/compose/install/"
fi
ok "$COMPOSE $($COMPOSE version --short 2>/dev/null || echo '')"

# ── 2. Environment file ────────────────────────────────────────────────────────
log "Checking environment file…"

if [[ ! -f ".env.local" ]]; then
  if [[ -f ".env.example" ]]; then
    cp .env.example .env.local
    ok "Created .env.local from .env.example"
    warn "Edit .env.local before going to production — at minimum set:"
    warn "  VERGE_VAULT_KEY       (32-byte hex, generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    warn "  NEXT_PUBLIC_SITE_URL  (your public domain)"
    warn "  NEXT_PUBLIC_REOWN_PROJECT_ID  (from https://cloud.reown.com)"
    echo ""
    read -rp "  Press Enter to continue with default values (fine for local dev)…"
  else
    die ".env.example not found — please check your clone."
  fi
else
  ok ".env.local already exists, skipping copy"
fi

# ── 3. Validate critical vars ─────────────────────────────────────────────────
log "Validating environment…"

# shellcheck disable=SC1091
source .env.local 2>/dev/null || true

if [[ -z "${VERGE_VAULT_KEY:-}" ]]; then
  warn "VERGE_VAULT_KEY is not set. A key will be derived from DATABASE_URL (OK for local dev only)."
fi
if [[ -z "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  warn "NEXT_PUBLIC_SITE_URL is not set — payment challenge URLs will be incorrect in production."
fi

# ── 4. Parse flags ────────────────────────────────────────────────────────────
NO_START=false
for arg in "$@"; do
  [[ "$arg" == "--no-start" ]] && NO_START=true
done

if [[ "$NO_START" == "true" ]]; then
  log "Skipping container startup (--no-start). Run manually:"
  echo "  $COMPOSE up -d"
  exit 0
fi

# ── 5. Build + start ──────────────────────────────────────────────────────────
log "Building Docker images…"
$COMPOSE build --pull

log "Starting services…"
$COMPOSE up -d

# ── 6. Wait for health ────────────────────────────────────────────────────────
log "Waiting for services to become healthy…"
TIMEOUT=120
ELAPSED=0
INTERVAL=5

while true; do
  VERGE_HEALTH=$($COMPOSE ps --format json verge 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('Health','') if isinstance(d,list) else d.get('Health',''))" 2>/dev/null || echo "unknown")

  if [[ "$VERGE_HEALTH" == "healthy" ]]; then
    ok "Verge is healthy!"
    break
  fi

  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    warn "Service did not become healthy within ${TIMEOUT}s. Check logs with:"
    warn "  $COMPOSE logs --tail=50 verge"
    break
  fi

  echo -ne "\r  ⏳  Waiting… (${ELAPSED}s / ${TIMEOUT}s) — status: ${VERGE_HEALTH}   "
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""

# ── 7. Success ─────────────────────────────────────────────────────────────────
SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"
# For local setups always print localhost even if NEXT_PUBLIC_SITE_URL is set to a domain
LOCAL_URL="http://localhost:3000"

echo ""
echo -e "${GREEN}${BOLD}────────────────────────────────────────────────────${RESET}"
echo -e "${GREEN}${BOLD}  ✔  Verge x402 Gateway is running!${RESET}"
echo -e "${GREEN}${BOLD}────────────────────────────────────────────────────${RESET}"
echo ""
echo -e "  ${BOLD}Local URL   :${RESET}  ${LOCAL_URL}"
echo -e "  ${BOLD}Public URL  :${RESET}  ${SITE_URL}"
echo -e "  ${BOLD}Console     :${RESET}  ${LOCAL_URL}/app"
echo -e "  ${BOLD}Facilitator :${RESET}  ${LOCAL_URL}/api/facilitator/verify"
echo -e "  ${BOLD}Catalog     :${RESET}  ${LOCAL_URL}/api/catalog"
echo ""
echo -e "  Useful commands:"
echo -e "    ${BOLD}$COMPOSE logs -f verge${RESET}       — stream app logs"
echo -e "    ${BOLD}$COMPOSE down${RESET}                — stop all services"
echo -e "    ${BOLD}$COMPOSE pull && $COMPOSE up -d${RESET}  — upgrade to latest"
echo ""
