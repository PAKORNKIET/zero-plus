# zero-plus

Real Next.js project — see `docs/MASTER_GUIDE.md` for the full plan and
status. Quick orientation:

```
zero-plus/
├── pages/
│   ├── _app.js
│   ├── index.js              ← placeholder, real homepage not wired up yet
│   └── api/
│       └── verify-payment.js ← SlipOK verification, working, needs DB TODOs filled in
├── lib/
│   ├── notifyDiscord.js      ← working
│   ├── verifySlip.js         ← working, matches real SlipOK API spec
│   └── supabase.js           ← client + admin Supabase helpers
├── design-reference/
│   └── mockup.html           ← the actual site design (all pages) — source
│                                of truth to convert into pages/ one page
│                                at a time
├── .github/workflows/        ← backup + keepalive, working
├── docs/                     ← all setup guides
├── .env.example              ← copy to .env.local and fill in
└── package.json
```

## Get it running locally
```bash
npm install
cp .env.example .env.local   # fill in what you have so far — partial is fine
npm run dev
```

## What's real vs. placeholder right now
- **Real and working**: `lib/notifyDiscord.js`, `lib/verifySlip.js`,
  `pages/api/verify-payment.js` (logic is real; the two `// TODO` lines
  inside it need Supabase queries once the schema exists), the two GitHub
  Actions workflows.
- **Placeholder**: `pages/index.js` and every other page — the actual
  design is fully built in `design-reference/mockup.html` but hasn't been
  converted into real Next.js pages/components yet.
- **Not started**: the database schema itself (tables discussed, not yet
  created in Supabase), and the product CRUD in the admin page (button
  exists visually, has no logic).

## Next steps, in order
1. Fill in `.env.local` with whatever accounts are ready (partial is fine —
   `verifySlip.js` will just skip cleanly if SlipOK vars are missing).
2. Create the actual tables in Supabase (SQL for this comes next, once the
   schema shown in this conversation is confirmed).
3. Convert `design-reference/mockup.html` into real pages, one at a time —
   suggest starting with Home + Store since they don't need auth yet.
4. Wire the two `// TODO` lines in `pages/api/verify-payment.js` to real
   Supabase writes once tables exist.
