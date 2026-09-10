// pages/api/verify-payment.js  (Next.js Pages Router)
//
// Flow, using the real SlipOK error codes (see docs/SLIPOK_SETUP.md):
//   success            → auto-confirmed: real slip, right amount, not a
//                         duplicate, landed in the right account. Unlock
//                         instantly, no human involved.
//   1012 (duplicate)   → likely fraud — same slip reused. Reject outright,
//                         flag Discord as high-priority, do NOT quietly
//                         drop it into the normal review queue.
//   1013 (wrong amount)→ real slip, wrong amount. Pending — could be an
//                         honest underpay/overpay, needs a human look.
//   1014 (wrong account)→ money went somewhere else. Pending — could be a
//                         customer mistake, needs a human look.
//   1009 / 1010        → not the customer's fault, not fraud — bank is
//                         slow or temporarily down. Tell them to wait,
//                         don't burn a manual-review slot on it.
//   anything else       → not a valid slip at all. Pending for review.
//
// One slip pays for a whole cart "batch" (see pages/api/create-order.js —
// N products in a cart become N order rows). This endpoint takes the
// full array of order ids from that batch plus the combined amount, and
// resolves every order in the batch together against the one SlipOK check.

import { verifySlip } from '../../lib/verifySlip';
import { notifyDiscord, discordMessages } from '../../lib/notifyDiscord';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { orderIds, amount, imageBase64, imageUrl } = req.body || {};

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: 'orderIds must be a non-empty array' });
  }
  if (amount == null) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const admin = supabaseAdmin();

  // --- auth: same session-token pattern as create-order.js ---
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token> header' });
  }
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // --- load the orders and make sure they're really this user's,
  //     really still pending, and really sum to the claimed amount ---
  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select('id, user_id, product_id, amount, status')
    .in('id', orderIds);

  if (ordersError) {
    console.error('[verify-payment] order lookup failed:', ordersError);
    return res.status(500).json({ error: 'Failed to look up orders' });
  }
  if (orders.length !== orderIds.length) {
    return res.status(400).json({ error: 'One or more orderIds not found' });
  }
  if (orders.some((o) => o.user_id !== user.id)) {
    return res.status(403).json({ error: 'Order does not belong to this user' });
  }
  if (orders.some((o) => o.status !== 'pending')) {
    return res.status(409).json({ error: 'One or more orders already resolved' });
  }
  const realTotal = orders.reduce((sum, o) => sum + Number(o.amount), 0);
  if (Number(amount) !== realTotal) {
    return res.status(400).json({ error: `amount (${amount}) does not match order total (${realTotal})` });
  }

  const orderLabel = orders.map((o) => o.id).join(', ');
  const summary = { id: orderLabel, amount: realTotal };

  const result = await verifySlip({ imageBase64, imageUrl, expectedAmount: amount });

  // --- auto-confirmed path ---
  if (result.ok) {
    const transRef = result.data?.transRef;

    const { error: updateError } = await admin
      .from('orders')
      .update({
        status: 'paid',
        slip_image_url: imageUrl ?? null,
        resolved_at: new Date().toISOString(),
      })
      .in('id', orderIds);

    if (updateError) {
      console.error('[verify-payment] failed to mark orders paid:', updateError);
      return res.status(500).json({ error: 'Slip verified but failed to update order(s)' });
    }

    // log the transRef against every order in the batch — second layer
    // of duplicate-slip protection alongside SlipOK's own log:true check
    if (transRef) {
      const { error: slipLogError } = await admin
        .from('payment_slips')
        .insert(orderIds.map((orderId) => ({ order_id: orderId, trans_ref: transRef, raw_response: result.data })));
      // A unique-constraint hit here means this transRef was already
      // logged — SlipOK's own log:true should have caught reuse as
      // error 1012 before we ever got here, so this is just a backstop.
      if (slipLogError) console.error('[verify-payment] payment_slips log failed:', slipLogError);
    }

    // unlock downloads for every product in the batch
    const { error: downloadError } = await admin
      .from('downloads')
      .upsert(
        orders.map((o) => ({ user_id: user.id, product_id: o.product_id, order_id: o.id })),
        { onConflict: 'user_id,product_id', ignoreDuplicates: true }
      );
    if (downloadError) console.error('[verify-payment] download grant failed:', downloadError);

    await notifyDiscord(discordMessages.slipApproved(summary));
    return res.status(200).json({ status: 'paid', transRef, orderIds });
  }

  // --- likely fraud: duplicate slip — do not treat like a normal pending case ---
  if (result.code === 1012) {
    const { error: updateError } = await admin
      .from('orders')
      .update({
        status: 'rejected',
        slipok_code: result.code,
        slipok_message: result.message,
        resolved_at: new Date().toISOString(),
      })
      .in('id', orderIds);
    if (updateError) console.error('[verify-payment] failed to mark orders rejected:', updateError);

    await notifyDiscord({
      content: `🚨 **Duplicate slip submitted** — Order(s) ${orderLabel}. This slip was already used before. Possible fraud attempt, not just a delay.`,
      embeds: [{
        title: '🚨 Duplicate slip detected',
        color: 0xff3b3b,
        fields: [
          { name: 'Order(s)', value: orderLabel, inline: true },
          { name: 'Amount', value: `฿${realTotal}`, inline: true },
          { name: 'SlipOK message', value: result.message },
        ],
      }],
    });
    return res.status(200).json({ status: 'rejected', reason: 'duplicate_slip', orderIds });
  }

  // --- bank is slow/down — not the customer's fault, not fraud ---
  if (result.code === 1009 || result.code === 1010) {
    const waitMsg = result.code === 1010
      ? `This bank needs about ${result.data?.delay ?? 'a few'} minutes to settle — try again shortly.`
      : `Bank data is temporarily unavailable — try again in about 15 minutes.`;
    // Orders stay 'pending' as-is — this doesn't need a human, just a
    // retry, so we don't touch the DB or alert Discord for it.
    return res.status(200).json({ status: 'retry_later', message: waitMsg, orderIds });
  }

  // --- everything else: wrong amount, wrong account, or not a real slip ---
  const { error: updateError } = await admin
    .from('orders')
    .update({
      slip_image_url: imageUrl ?? null,
      slipok_code: result.code,
      slipok_message: result.message,
    })
    .in('id', orderIds);
  // status intentionally left as 'pending' — already the default, this
  // just attaches the slip + SlipOK's reason so the Admin queue has
  // something to show alongside the manual approve/reject buttons.
  if (updateError) console.error('[verify-payment] failed to attach slip info to orders:', updateError);

  await notifyDiscord({
    content: `⏳ Order(s) **${orderLabel}** need manual review.`,
    embeds: [{
      title: '⏳ New slip waiting for review',
      color: 0xffbd2e,
      fields: [
        { name: 'Order(s)', value: orderLabel, inline: true },
        { name: 'Expected amount', value: `฿${realTotal}`, inline: true },
        { name: 'SlipOK code', value: `${result.code} — ${result.message}` },
      ],
      image: imageUrl ? { url: imageUrl } : undefined,
    }],
  });

  return res.status(200).json({ status: 'pending', code: result.code, message: result.message, orderIds });
}
