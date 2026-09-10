// lib/notifyDiscord.js
//
// Sends an order-event notification to a Discord channel via a webhook.
// Must run server-side — DISCORD_WEBHOOK_URL should be treated as a secret
// (anyone with the URL can post messages into your channel), so keep it in
// env vars, never hard-code it or expose it to the browser.
//
// Env var needed (Cloudflare Pages > Settings > Environment variables,
// and .env.local for local dev):
//   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxx/yyyy

export async function notifyDiscord(payload) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.error('[notifyDiscord] Missing DISCORD_WEBHOOK_URL — skipping.');
    return { ok: false, skipped: true };
  }

  const body = typeof payload === 'string'
    ? { content: payload }
    : payload; // allow passing a full embed object too

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[notifyDiscord] Discord error:', res.status, text);
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true };
}

// ---- Ready-made embeds for the events in the Zero+ order flow ----
// Using embeds instead of plain text gives you color-coded cards in Discord,
// which makes it much faster to scan a busy #order-alerts channel.

const COLORS = {
  info: 0x5865f2,     // blurple
  pending: 0xffbd2e,  // amber
  success: 0x4ade80,  // green
  danger: 0xff3b3b,   // red
};

function embed(title, order, color, extraFields = []) {
  return {
    embeds: [{
      title,
      color,
      fields: [
        { name: 'Order', value: order.id, inline: true },
        { name: 'Amount', value: `฿${order.amount}`, inline: true },
        { name: 'Method', value: order.method || '—', inline: true },
        ...extraFields,
      ],
      timestamp: new Date().toISOString(),
    }],
  };
}

export const discordMessages = {
  orderCreated: (order) =>
    embed('🆕 New order', order, COLORS.info),

  truemoneyAutoConfirmed: (order) =>
    embed('💰 Money in — auto-confirmed', order, COLORS.success, [
      { name: 'Source', value: 'TrueMoney gift link' },
    ]),

  slipUploaded: (order) =>
    embed('⏳ New slip waiting for review', order, COLORS.pending, [
      { name: 'Action needed', value: 'Check the admin panel to approve or reject.' },
    ]),

  slipApproved: (order) =>
    embed('✅ Slip approved', order, COLORS.success, [
      { name: 'Result', value: 'Download unlocked for the customer.' },
    ]),

  slipRejected: (order) =>
    embed('❌ Slip rejected', order, COLORS.danger, [
      { name: 'Result', value: 'Customer will be asked to resubmit.' },
    ]),

  refundIssued: (order) =>
    embed('↩️ Manual refund issued', order, COLORS.danger),
};
