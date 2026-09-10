# SlipOK Setup — Zero+

Based on the real SlipOK API Guide v1.13 (28 Feb 2026) that was provided —
no more guessing on this one, everything below is confirmed from the doc.

Free tier: **100 verified slips/month, forever** (only successful checks
count against quota — a rejected/garbage image doesn't cost you anything).
Beyond 100/month: ฿1 per extra slip.

## 1. Signup (already done if you followed the earlier steps)
Add SlipOK on LINE → business channel → filled in business info → chose
**API** as the channel → named the branch something like `Zero Plus - Website`.

## 2. One setup step that's easy to miss: register your receiving bank account
For SlipOK to catch "customer sent money to the wrong account" (error 1014
below), it needs to know what YOUR correct account is. Do this once inside
the SlipOK LINE LIFF dashboard for this branch: set/confirm the bank
account that should be receiving payments. Skip this and the
wrong-account check silently won't fire.

## 3. Get your credentials
From the SlipOK LINE LIFF dashboard for this branch:
- **Branch ID**
- **API Key**

Set as env vars (Cloudflare Pages → Settings → Environment variables, and
`.env.local` for local dev):
```
SLIPOK_BRANCH_ID=xxxxxxx
SLIPOK_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. How the request actually works (confirmed from the real doc)
```
POST https://api.slipok.com/api/line/apikey/<BRANCH_ID>
Header: x-authorization: <API_KEY>
Content-Type: application/json

Body:
{
  "files": "<base64 image, no data: prefix>",   // or "url" or "data" instead
  "log": true,        // ALWAYS send this — see below
  "amount": 149       // ALWAYS send this — see below
}
```

**The important discovery:** sending `log: true` together with `amount`
makes SlipOK check FOUR things in one call, not just "is this a real slip":
1. Is the slip real (checked against the issuing bank)
2. Does the amount match what you expected
3. **Is this the same slip that was already used before** (duplicate/reuse)
4. Did the money land in the bank account you registered in step 2

This means **you do not need to build your own database check for
reused slips** — earlier guidance said this needed a custom transRef
table; the real docs show SlipOK already does it per branch, as long as
`log: true` is sent every time. (Storing `transRef` yourself is still a
reasonable extra safety net once Phase 2's database exists, but it's no
longer something you're missing without it.)

## 5. What each result means (this drives `api/verify-payment.js`)

| Result | Meaning | What the code does |
|---|---|---|
| success | Real, right amount, not reused, right account | Auto-confirm instantly, no human |
| code 1012 | **Duplicate slip** — reused | Reject outright, Discord alert marked high-priority (likely fraud, not just a mixup) |
| code 1013 | Real slip, wrong amount | Pending → Discord review queue |
| code 1014 | Money went to a different account | Pending → Discord review queue |
| code 1009 | Bank data temporarily down (doesn't cost quota) | Tell customer to retry in ~15 min |
| code 1010 | Bank (BBL/SCB) needs a few minutes to settle | Tell customer to retry in `data.delay` minutes |
| anything else (1005–1008, 1011) | Not a real/valid payment slip at all | Pending → Discord review queue |

## 6. Test it
Once wired up, send a real slip through the checkout flow and confirm in
Discord you get the right embed for at least: a normal successful payment,
and — to test the duplicate check — submitting the exact same slip image
twice in a row (second attempt should come back as code 1012).

## 7. Keep an eye on quota
`lib/verifySlip.js` exports `getSlipOKQuota()` — call it from the Admin
page to show remaining free checks for the month before you accidentally
run into the ฿1/slip overage without noticing.
