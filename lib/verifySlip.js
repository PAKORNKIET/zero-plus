// lib/verifySlip.js
//
// Calls SlipOK to verify a payment slip against the actual bank transaction.
// Built directly from SlipOK API Guide v1.13 (28 Feb 2026) — no more guessing.
//
// Key finding from the real docs: sending `log: true` together with
// `amount` makes SlipOK itself check THREE things server-side, not just
// "is this slip real":
//   1. Is the slip real (verified against the issuing bank)
//   2. Does the amount match what you expected  → error 1013 if not
//   3. Is this a duplicate slip already used before → error 1012 if so
//   4. Did the money actually land in YOUR configured account → error 1014
//      (requires setting up your receiving bank account in the SlipOK
//      LINE LIFF for this branch first — see docs/SLIPOK_SETUP.md)
// This means you do NOT need to build your own transRef-tracking database
// just to catch reused slips — SlipOK already does it per branch.
//
// Must run server-side — your API key is a secret.
//
// Env vars needed:
//   SLIPOK_BRANCH_ID=   (from your SlipOK LINE LIFF dashboard)
//   SLIPOK_API_KEY=     (from the same dashboard)

const SLIPOK_BASE = 'https://api.slipok.com/api/line/apikey';

export async function verifySlip({ imageBase64, imageUrl, qrData, expectedAmount }) {
  const branchId = process.env.SLIPOK_BRANCH_ID;
  const apiKey = process.env.SLIPOK_API_KEY;

  if (!branchId || !apiKey) {
    return { ok: false, code: 'not_configured', message: 'Missing SLIPOK_BRANCH_ID or SLIPOK_API_KEY' };
  }

  const body = { log: true }; // always on — unlocks duplicate + receiver-account checks
  if (expectedAmount != null) body.amount = expectedAmount; // always on — unlocks amount check
  if (imageBase64) body.files = imageBase64;       // base64 string, no "data:" prefix
  else if (imageUrl) body.url = imageUrl;           // must be a plain public URL — signed/expiring
                                                       // URLs (S3 signed, Google Drive) are documented
                                                       // as unreliable because SlipOK needs to check
                                                       // file size first. Prefer imageBase64 if possible.
  else if (qrData) body.data = qrData;               // raw string read from the slip's QR code
  else return { ok: false, code: 'no_input', message: 'Provide imageBase64, imageUrl, or qrData' };

  let res;
  try {
    res = await fetch(`${SLIPOK_BASE}/${branchId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authorization': apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[verifySlip] Network error calling SlipOK:', err);
    return { ok: false, code: 'network_error', message: String(err) };
  }

  const json = await res.json().catch(() => null);

  if (res.ok && json?.success) {
    // Verified: real, amount matches, not a duplicate, receiver matches.
    return { ok: true, data: json.data };
  }

  // Not ok — SlipOK's `code` tells you exactly why. See docs/SLIPOK_SETUP.md
  // for the full table; the ones worth branching on in your own logic:
  //   1009 = bank temporarily down, retry in 15 min, doesn't cost quota
  //   1010 = this bank (BBL/SCB) needs a few minutes to settle — data.delay
  //          tells you how many minutes to wait before rechecking
  //   1012 = duplicate slip — likely fraud, reuse attempt
  //   1013 = amount on the real slip doesn't match the order
  //   1014 = money went to a different account than yours
  //   1005/1006/1007/1008/1011 = not a valid/real payment slip at all
  return {
    ok: false,
    code: json?.code ?? res.status,
    message: json?.message ?? 'Unknown SlipOK error',
    data: json?.data, // present for 1012/1013/1014 — still has the real slip details
  };
}

// Optional: check remaining free quota (100/month on the free tier) —
// handy to surface in the Admin dashboard so you see it coming before
// you hit the wall.
export async function getSlipOKQuota() {
  const branchId = process.env.SLIPOK_BRANCH_ID;
  const apiKey = process.env.SLIPOK_API_KEY;
  const res = await fetch(`${SLIPOK_BASE}/${branchId}/quota`, {
    headers: { 'x-authorization': apiKey },
  });
  const json = await res.json().catch(() => null);
  return json?.data ?? null; // { quota, overQuota, specialQuota, endDate, specialEndDate }
}

