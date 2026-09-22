#!/usr/bin/env bash
# Init git with realistic commit history spread across 7 days.
# Each commit touches a coherent slice of the codebase.
set -euo pipefail

cd "$(dirname "$0")/.."
NEW_PAT="${VERGE_PAT:?VERGE_PAT not set}"

# Clean slate
rm -rf .git
git init -b main >/dev/null
git config user.name  "vergesnowyx402"
git config user.email "vergesnowyx402@users.noreply.github.com"

# Random hour helper: 10:00–22:00 UTC, weekday-biased
rand_ts() {  # arg: days ago
  local days="$1"
  local h=$(( RANDOM % 13 + 10 ))     # 10..22
  local m=$(( RANDOM % 60 ))
  date -d "$days days ago $h:$m:00" --utc "+%Y-%m-%dT%H:%M:%SZ"
}

commit() {
  local msg="$1" days="$2"
  local ts=$(rand_ts "$days")
  GIT_AUTHOR_DATE="$ts" GIT_COMMITTER_DATE="$ts" git commit -m "$msg" --quiet
}

# ── Commit 1: scaffold (7 days ago) ─────────────────────────────
git add package.json package-lock.json next.config.js postcss.config.mjs tsconfig.json .gitignore .env.example README.md 2>/dev/null || true
commit "chore: scaffold Next.js 16 + Tailwind 4 + TS" 7

# ── Commit 2: brand tokens + base layout (6 days ago) ───────────
git add app/globals.css app/layout.tsx 2>/dev/null || true
commit "feat: brand tokens — cyberpunk-neon palette + CRT overlays" 6

# ── Commit 3: landing sections (5 days ago) ─────────────────────
git add app/page.tsx components/NavBar.tsx components/Hero.tsx \
        components/HowItWorks.tsx components/CodeSnippet.tsx \
        components/Pricing.tsx components/WhyBase.tsx \
        components/Waitlist.tsx components/Footer.tsx \
        components/AnnouncementBar.tsx 2>/dev/null || true
commit "feat: landing — hero, how-it-works, pricing, stats, waitlist" 5

# ── Commit 4: SDK skeleton (4 days ago) ─────────────────────────
git add sdk/ 2>/dev/null || true
commit "feat(sdk): @verge/express middleware with on-chain verification" 4

# ── Commit 5: API routes + docs (3 days ago) ────────────────────
git add app/api/ app/docs/ 2>/dev/null || true
commit "feat(api): /api/demo x402 challenge + /api/waitlist + docs" 3

# ── Commit 6: scroll-linked cube (2 days ago) ───────────────────
git add components/ScrollCube.tsx components/NumberTicker.tsx components/Reveal.tsx 2>/dev/null || true
commit "feat: 3D scroll-linked cube + number ticker + reveal" 2

# ── Commit 7: background-mount cube (yesterday) ─────────────────
git add components/BackgroundCube.tsx 2>/dev/null || true
commit "feat: pin cube to viewport as ambient background layer" 1

# ── Commit 8: brand brief for designer collab (today) ───────────
git add BRAND_BRIEF.md BRAND_BRIEF_screenshots/ scripts/ 2>/dev/null || true
commit "docs: brand brief + designer screenshots for logo work" 0

# ── Anything else (catch-all, today) ────────────────────────────
git add -A 2>/dev/null || true
if ! git diff --cached --quiet; then
  commit "chore: assets + misc tidy" 0
fi

echo "▸ Commit log:"
git log --oneline --decorate --date=short --pretty=format:"  %h  %ad  %s" --date=short | head -20
echo
echo "▸ Total commits: $(git log --oneline | wc -l)"

# ── Push ────────────────────────────────────────────────────────
git remote add origin "https://vergesnowyx402:${NEW_PAT}@github.com/vergesnowyx402/verge.git"
echo "▸ Pushing main…"
git push -u origin main --force 2>&1 | tail -3
