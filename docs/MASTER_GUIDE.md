# Zero+ — Master Setup Guide

> 💸 **This whole plan is built to run at ฿0/month.** Every service below
> is on its free tier. The only money that ever moves is Opn's per-transaction
> fee (not a monthly cost — you said you'd pass that % to the buyer, so it's
> ฿0 out of pocket either way). Where a free tier has a real limitation,
> it's called out explicitly so nothing surprises you later.

Everything decided so far, in the order to actually do it, with the exact
file for each step. Folder structure of everything you're getting:

```
zero-plus-project/
├── mockup/index.html          → the full site design (all pages, EN/TH, slip upload demo)
├── .github/workflows/
│   ├── backup.yml             → daily DB backup to R2
│   └── keepalive.yml          → stops GitHub from disabling the backup cron
├── lib/
│   ├── notifyDiscord.js       → Discord alert function + message templates
│   └── verifySlip.js          → calls SlipOK to verify a slip against the real bank transaction
├── api/
│   └── verify-payment.js      → orchestrates: verify slip → auto-confirm or flag for review → notify Discord
└── docs/
    ├── MASTER_GUIDE.md        → this file
    ├── BACKUP_SETUP.md        → backup setup steps
    ├── DISCORD_SETUP.md       → Discord webhook setup steps
    └── SLIPOK_SETUP.md        → SlipOK signup (LINE-based) + what SlipOK does NOT protect against
```

---

## Phase 0 — Accounts to create today (do all 5 in parallel, they don't depend on each other)

## Current status (updated as of the real Next.js build, not the mockup)

**Pages — real React pages wired to live Supabase data:**

| Page | Route | Status |
|---|---|---|
| Home | `/` | ✅ done — categories, best sellers pulled live from Supabase |
| Store | `/store` | ✅ done — category filter (incl. sub-categories), sort, all real |
| Product detail | `/product/[slug]` | ✅ done — real product, real reviews (empty until someone buys) |
| Cart | `/cart` | ✅ done for browsing/managing items; checkout submit gated behind login (see below) |
| Auth | `/auth` | ✅ done — real email/password login+register+forgot password. Google/Discord buttons wired but **providers not yet enabled in Supabase** (see docs, step still pending) |
| Profile | `/profile` | ✅ done — real downloads/orders/wishlist tabs, sign out, redirects to login if not authenticated |
| Admin | `/admin` | ⬜ not started |
| Purchase Rules | `/rules` | ⬜ not started (content exists in `design-reference/mockup.html`, not yet converted) |

**Backend pieces:**

| Piece | Status |
|---|---|
| Database schema (8 tables + RLS + grants) | ✅ done, run successfully on live Supabase |
| Seed data (categories + 3 real products) | ✅ done |
| `lib/verifySlip.js` (SlipOK integration) | ✅ code done, matches real API spec — not yet connected to a live SlipOK account (SlipOK signup not started) |
| `lib/notifyDiscord.js` | ✅ code done — not yet connected (Discord webhook not created) |
| `pages/api/verify-payment.js` | ✅ code done — has 2 `// TODO` lines waiting on `create-order.js` |
| `pages/api/create-order.js` | ⬜ not built yet — needed to fully close the checkout loop |
| Cart → real order creation | ⬜ blocked on create-order.js above |
| Backup automation (GitHub Actions) | ✅ code done — not yet deployed (no GitHub repo pushed yet) |

**Accounts/services:**

| # | Service | Status | What it's for |
|---|---|---|---|
| 1 | SlipOK | ⬜ not started | Auto-verifies payment slips — primary payment-confirmation method |
| 2 | Supabase | ✅ **done** — project created, schema run, env vars filled in `.env.local` | Auth + Postgres database |
| 3 | Cloudflare | ⬜ not started | R2 file storage + backups + Pages hosting |
| 4 | GitHub | ⬜ not started | Code repo + the two Actions workflows |
| 5 | Discord webhook | ⬜ not started | Order/payment alerts |
| 6 | healthchecks.io | ⬜ not started | Alerts if the daily backup silently stops running |
| 7 | Google/Discord OAuth apps | ⬜ not started | Needed for the social login buttons on `/auth` to actually work |

Doing these 3 next, in this order: **Cloudflare → SlipOK → Discord**
(Cloudflare first since R2 needs to exist before slip images have
somewhere to be stored; SlipOK's LINE approval can then run in the
background while Discord — the fastest of the three — gets done same-day.)

---

## Phase 1 — Set up the repo
1. Create a new GitHub repo, e.g. `zero-plus`.
2. Copy this whole `zero-plus-project/` folder structure into it (the
   `.github/workflows/` folder name must keep its leading dot exactly as-is).
3. Push. Go to the repo's **Actions** tab once to confirm GitHub sees both
   workflows listed (they won't run successfully yet — that needs secrets
   from Phase 3).

## Phase 2 — Database schema (not built yet — say the word and I'll draft it)
Before wiring the mockup pages to real data, you need tables for: users,
products, categories, orders, downloads, reviews, wishlist. This maps
directly onto the pages already in `mockup/index.html`. This is the next
thing to design once you're ready — just ask.

## Phase 3 — Turn on backups
Follow `docs/BACKUP_SETUP.md` exactly, in order:
1. Create the R2 bucket `zeroplus-db-backups`
2. Get your Supabase connection string
3. Sign up at healthchecks.io (free) for the dead-man's-switch alert
4. Add all 5 secrets to GitHub → Settings → Secrets and variables → Actions
5. Manually trigger `backup.yml` once from the Actions tab to confirm it works

> ⚠️ Free-tier gotcha: Supabase pauses a free project after 7 days with no
> API activity. A raw `pg_dump` connection (what backup.yml uses) may not
> count as "API activity" in Supabase's eyes. Cheapest fix: once the site
> has real traffic this stops mattering on its own; until then, add one
> extra step to backup.yml — a `curl` hitting your Supabase project's REST
> URL — so the same daily job both backs up and keeps the project awake.
> Say the word and I'll add that step to the workflow file.

## Phase 4 — Payment flow (decided: direct transfer + SlipOK, not Opn)
Final flow, confirmed:
1. Customer transfers directly (bank/PromptPay) and uploads a slip
   screenshot — UI already built in `mockup/index.html`.
2. Backend sends the slip to SlipOK (`lib/verifySlip.js`) — SlipOK checks
   it against the real bank transaction (not just OCR).
3. Amount matches → **auto-confirmed instantly**, download unlocks,
   Discord gets a green "approved" alert. No human involved.
4. Amount doesn't match, or SlipOK can't confirm it → order stays
   "pending", customer sees a "we're checking it" status (as decided),
   Discord gets a yellow "needs review" alert with the slip attached →
   you approve/reject manually from the Admin page's existing queue.
5. `api/verify-payment.js` is the orchestrator tying steps 2–4 together.

Two things worth noting, now that the real API Guide is in hand:
- **No separate AI/vision pre-check.** Discussed and dropped — it would
  have added complexity without adding real fraud protection, since a
  convincing fake slip fools image-reading AI the same way it fools a
  human. SlipOK already does real bank-side verification, which a fake
  slip can't pass.
- **Duplicate-slip reuse IS already handled — correction from earlier.**
  Earlier guidance said this needed a custom database check. Turns out
  sending `log: true` + `amount` on every SlipOK request makes SlipOK
  itself catch reused slips (error 1012) and wrong-account transfers
  (error 1014), per branch. Nothing extra to build for this at launch —
  see `docs/SLIPOK_SETUP.md` for the corrected explanation.

TrueMoney gift-link auto-redeem and Opn's dynamic QR are still on the
table as later additions, not needed for launch.

## Phase 5 — Notifications (decided: Discord, not LINE)
Follow `docs/DISCORD_SETUP.md`:
1. Make a private `#order-alerts` channel
2. Channel → Integrations → Webhooks → New Webhook → copy the URL
3. Set `DISCORD_WEBHOOK_URL` as an env var
4. Turn on "All Messages" notifications for that channel on your phone
   (Discord defaults some channels to @mentions-only — easy to miss)
5. `lib/notifyDiscord.js` is ready to import once there's a real backend —
   call `notifyDiscord(discordMessages.slipUploaded(order))` etc. at the
   same points the mockup currently just does `alert(...)`.

## Phase 6 — Purchase Rules
Already built into `mockup/index.html` — the "Purchase Rules" page,
linked from the footer and shown again right before the Confirm/Submit
button on checkout. Covers: proof-of-purchase requirement, Discord support
process (Order ID + Key required), no-refund policy, 7-day report window,
checkout-detail responsibility, personal-use license, chargeback = ban.
Nothing left to do here unless you want to add/edit a rule.

## Phase 7 — Deploy
1. Connect the GitHub repo to Cloudflare Pages.
2. Cloudflare Pages free tier allows commercial use (unlike Vercel's
   Hobby tier) and includes a free custom domain slot.
3. Add all env vars (Supabase keys, R2 keys, Discord webhook URL, Opn keys
   once issued) in Cloudflare Pages → Settings → Environment variables.

## Phase 8 — Launch (still ฿0)
1. Default: launch on the free `zeroplus.pages.dev` subdomain — this is
   the ฿0 option and it's a fully working, fully commercial-legal URL.
   Buying a custom domain (~300–500 THB/year) is optional and only needed
   later for the credibility boost — not required to go live.
2. Soft-launch to a small group first (friends / your own server) before
   announcing publicly, so early bugs surface at low stakes.

---

## What's built vs. what's still ahead

## What's built vs. what's still ahead

See the detailed status tables near the top of this file ("Current status") —
that's the accurate, page-by-page source of truth. This section intentionally
left as a pointer instead of a second table that could drift out of sync.
