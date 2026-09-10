// pages/api/create-order.js
//
// Turns the client-side cart (localStorage, see contexts/CartContext.js)
// into real rows in the `orders` table, so verify-payment.js has
// something to update once SlipOK confirms the slip.
//
// Design notes:
//  - Price is ALWAYS re-read from the database here, never trusted from
//    the client. The cart only sends product ids — if we trusted a
//    client-sent price, anyone could edit it in devtools and pay ฿1 for
//    a ฿500 product.
//  - Free products skip orders/payment entirely: they're unlocked
//    (a row in `downloads`) the moment this endpoint runs, no slip needed.
//  - Already-owned products (a `downloads` row already exists) are
//    silently dropped from the order instead of erroring — avoids
//    double-charging someone who re-adds an owned item to their cart.
//  - The schema has no `order_items` table, so a cart with N paid
//    products becomes N rows in `orders` (one per product, real price
//    each). They're returned together as a "batch" — the customer pays
//    the combined total in one transfer and uploads one slip;
//    verify-payment.js takes the whole batch (array of order ids) and
//    resolves them all together against that single SlipOK check.
//  - Regular users have no insert policy on `orders` (see schema.sql) —
//    only the service role (used here, server-side) can create them.
//    This is intentional: a customer can never fake their own "paid" order.

import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // --- auth: identify the user from their Supabase session token ---
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token> header' });
  }

  const admin = supabaseAdmin();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // --- validate body ---
  const { productIds, method } = req.body || {};
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'productIds must be a non-empty array' });
  }
  const validMethods = ['bank_transfer', 'promptpay', 'truemoney'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: `method must be one of: ${validMethods.join(', ')}` });
  }

  // de-dupe ids the client might have sent twice
  const uniqueIds = [...new Set(productIds)];

  // --- look up real products server-side (never trust client price) ---
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, name, price, is_free, is_hidden')
    .in('id', uniqueIds);

  if (productsError) {
    console.error('[create-order] products lookup failed:', productsError);
    return res.status(500).json({ error: 'Failed to look up products' });
  }

  const foundIds = new Set(products.map((p) => p.id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
  const purchasable = products.filter((p) => !p.is_hidden);

  if (purchasable.length === 0) {
    return res.status(400).json({ error: 'None of the requested products are available', missingIds });
  }

  // --- skip anything the user already owns ---
  const { data: owned, error: ownedError } = await admin
    .from('downloads')
    .select('product_id')
    .eq('user_id', user.id)
    .in('product_id', purchasable.map((p) => p.id));

  if (ownedError) {
    console.error('[create-order] downloads lookup failed:', ownedError);
    return res.status(500).json({ error: 'Failed to check existing downloads' });
  }
  const ownedIds = new Set((owned || []).map((d) => d.product_id));

  const toGrantFree = purchasable.filter((p) => p.is_free && !ownedIds.has(p.id));
  const toOrder = purchasable.filter((p) => !p.is_free && !ownedIds.has(p.id));
  const alreadyOwned = purchasable.filter((p) => ownedIds.has(p.id)).map((p) => p.id);

  // --- free products: unlock instantly, no order/slip needed ---
  let freeGranted = [];
  if (toGrantFree.length > 0) {
    const { data: grants, error: grantError } = await admin
      .from('downloads')
      .insert(toGrantFree.map((p) => ({ user_id: user.id, product_id: p.id })))
      .select('product_id');

    if (grantError) {
      console.error('[create-order] free grant failed:', grantError);
      return res.status(500).json({ error: 'Failed to unlock free product(s)' });
    }
    freeGranted = grants.map((g) => g.product_id);
  }

  // --- paid products: create one pending order per product ---
  let orders = [];
  if (toOrder.length > 0) {
    const { data: inserted, error: insertError } = await admin
      .from('orders')
      .insert(
        toOrder.map((p) => ({
          user_id: user.id,
          product_id: p.id,
          amount: p.price,
          method,
          status: 'pending',
        }))
      )
      .select('id, order_number, product_id, amount, status');

    if (insertError) {
      console.error('[create-order] order insert failed:', insertError);
      return res.status(500).json({ error: 'Failed to create order' });
    }
    orders = inserted;
  }

  const total = orders.reduce((sum, o) => sum + Number(o.amount), 0);

  return res.status(200).json({
    orders,               // [{ id, order_number, product_id, amount, status }] — pass these ids to verify-payment
    total,                 // combined amount the customer needs to transfer + the slip needs to match
    freeGranted,            // product ids unlocked instantly, no payment needed
    skipped: { alreadyOwned, missingOrHidden: missingIds },
  });
}
