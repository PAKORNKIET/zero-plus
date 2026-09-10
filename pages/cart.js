// pages/cart.js
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

function productIcon(item) {
  if (item.name.toLowerCase().includes('sword')) return 'i-sword';
  if (item.name.toLowerCase().includes('fx') || item.name.toLowerCase().includes('particle')) return 'i-spark';
  if (item.is_free) return 'i-gift';
  return 'i-cube';
}

const T = {
  en: {
    cart: 'cart', yourCart: 'Your cart', empty: 'Your cart is empty.',
    browseStore: 'Browse the store', remove: 'remove',
    orderSummary: 'Order summary', subtotal: 'Subtotal', total: 'Total',
    paymentMethod: 'Payment method', uploadSlip: 'Upload payment slip',
    uploadSlipSub: 'Screenshot of the transfer or payment confirmation',
    submit: 'Submit for verification', agree: 'By confirming, you agree to our',
    rules: 'Purchase Rules', noRefund: 'No refunds once payment is confirmed',
    needLogin: 'You need an account to check out.', logIn: 'Log in / Sign up',
    bankInfo: 'Kasikorn Bank 123-4-56789-0 — ZERO PLUS STORE',
    pending: 'Slip submitted — status: pending review',
    checkoutError: 'Something went wrong — please try again.',
  },
  th: {
    cart: 'ตะกร้า', yourCart: 'ตะกร้าสินค้า', empty: 'ตะกร้าของคุณว่างเปล่า',
    browseStore: 'ไปเลือกซื้อสินค้า', remove: 'ลบ',
    orderSummary: 'สรุปคำสั่งซื้อ', subtotal: 'รวมสินค้า', total: 'ยอดชำระ',
    paymentMethod: 'ช่องทางชำระเงิน', uploadSlip: 'แนบสลิปการโอนเงิน',
    uploadSlipSub: 'แคปหน้าโอนเงิน หรือหน้ายืนยันการชำระเงิน',
    submit: 'ส่งเพื่อตรวจสอบ', agree: 'การยืนยันถือว่ายอมรับ',
    rules: 'กฎการซื้อขาย', noRefund: 'ไม่มีการคืนเงินหลังชำระเงินแล้ว',
    needLogin: 'ต้องมีบัญชีก่อนถึงจะชำระเงินได้', logIn: 'เข้าสู่ระบบ / สมัครสมาชิก',
    bankInfo: 'ธ.กสิกรไทย 123-4-56789-0 — ZERO PLUS STORE',
    pending: 'ส่งสลิปแล้ว — สถานะ: รอตรวจสอบ',
    checkoutError: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  },
};

export default function Cart() {
  const { lang } = useLang();
  const t = T[lang];
  const { items, removeItem, total, clearCart } = useCart();

  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { needLogin } | { status, message }

  function handleSlipUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSlipPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function submitForVerification() {
    setResult(null);
    setChecking(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setResult({ needLogin: true });
      setChecking(false);
      return;
    }

    try {
      // 1. Turn the cart into real order rows (server re-checks prices).
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ productIds: items.map((i) => i.id), method: 'bank_transfer' }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      // Nothing left to pay for (e.g. cart was all free items) — already unlocked.
      if (orderData.orders.length === 0) {
        clearCart();
        setResult({ status: 'paid', message: t.pending });
        setChecking(false);
        return;
      }

      // 2. Convert the slip to base64 and send it for verification against
      //    the combined total of every order in this batch.
      const imageBase64 = slipPreview.split(',')[1]; // strip the "data:image/...;base64," prefix

      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          orderIds: orderData.orders.map((o) => o.id),
          amount: orderData.total,
          imageBase64,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

      if (verifyData.status === 'paid') clearCart();
      setResult({ status: verifyData.status, message: verifyData.message || t.pending });
    } catch (err) {
      console.error('[cart] checkout failed', err);
      setResult({ status: 'error', message: String(err.message || err) });
    }

    setChecking(false);
  }

  if (items.length === 0) {
    return (
      <>
        <Head><title>Cart — ZERO+</title></Head>
        <Nav />
        <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>{t.empty}</p>
          <Link href="/store" className="btn btn-primary">{t.browseStore}</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head><title>Cart — ZERO+</title></Head>
      <Nav />

      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/" style={{ color: 'var(--red)' }}>{lang === 'en' ? 'home' : 'หน้าแรก'}</Link> / {t.cart}
        </div>
        <h2 style={{ marginBottom: 28 }}>{t.yourCart}</h2>

        <div className="cart-layout">
          <div>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 8, background: 'var(--panel-2)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0,
                }}>
                  <svg className="ic-md"><use href={`#${productIcon(item)}`} /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 5 }}>{item.name}</h4>
                </div>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--red)', fontSize: 14 }}>
                  {item.is_free ? (lang === 'en' ? 'FREE' : 'ฟรี') : `฿${item.price}`}
                </div>
                <button
                  className="mono"
                  onClick={() => removeItem(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <svg className="ic"><use href="#i-trash" /></svg>{t.remove}
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 24 }}>
            <h3 style={{ marginBottom: 18, fontSize: 16 }}>{t.orderSummary}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 12 }}>
              <span>{t.subtotal} ({items.length})</span><span>฿{total}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', color: 'var(--text)', fontWeight: 700, fontSize: 17,
              borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 6,
            }}>
              <span>{t.total}</span><b className="mono" style={{ color: 'var(--red)' }}>฿{total}</b>
            </div>

            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '.05em', margin: '20px 0 10px' }}>
              {t.paymentMethod.toUpperCase()}
            </div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '10px 0' }}>{t.bankInfo}</div>

            {result?.status !== 'pending' && (
              <>
                <div
                  onClick={() => document.getElementById('slipInput').click()}
                  style={{ border: '1.5px dashed var(--line)', borderRadius: 8, padding: 18, textAlign: 'center', cursor: 'pointer', marginTop: 14 }}
                >
                  <svg className="ic-md" style={{ color: 'var(--text-faint)', marginBottom: 6 }}><use href="#i-file" /></svg>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t.uploadSlip}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{t.uploadSlipSub}</div>
                </div>
                <input id="slipInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSlipUpload} />
                {slipPreview && (
                  <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                    <img src={slipPreview} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} alt="slip preview" />
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                  disabled={!slipFile || checking}
                  onClick={submitForVerification}
                >
                  {checking ? '...' : t.submit}
                </button>
              </>
            )}

            {result?.needLogin && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--red-wash)', border: '1px solid var(--red-dim)', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>{t.needLogin}</p>
                <Link href="/auth?redirect=/cart" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>{t.logIn}</Link>
              </div>
            )}

            {result?.status === 'pending' && (
              <div style={{ marginTop: 14, padding: 14, background: 'rgba(255,189,46,.1)', border: '1px solid rgba(255,189,46,.3)', borderRadius: 8, textAlign: 'center' }}>
                <p className="mono" style={{ fontSize: 12.5, color: '#ffbd2e' }}>{t.pending}</p>
              </div>
            )}

            {(result?.status === 'error' || result?.status === 'rejected' || result?.status === 'retry_later') && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--red-wash)', border: '1px solid var(--red-dim)', borderRadius: 8, textAlign: 'center' }}>
                <p className="mono" style={{ fontSize: 12.5, color: 'var(--red)' }}>
                  {result.status === 'error' ? t.checkoutError : result.message}
                </p>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-faint)' }} className="mono">
              {t.agree} <Link href="/rules" style={{ color: 'var(--red)', textDecoration: 'underline' }}>{t.rules}</Link>
            </div>
            <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: 'var(--text-faint)' }} className="mono">
              {t.noRefund}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
