// pages/product/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../contexts/LangContext';
import { useCart } from '../../contexts/CartContext';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';

function productIcon(product) {
  if (!product) return 'i-cube';
  const tags = (product.tags || []).map((t) => t.toLowerCase());
  if (product.name.toLowerCase().includes('sword')) return 'i-sword';
  if (product.name.toLowerCase().includes('fx') || product.name.toLowerCase().includes('particle')) return 'i-spark';
  if (tags.includes('blockbench')) return 'i-layers';
  if (product.is_free) return 'i-gift';
  return 'i-cube';
}

const T = {
  en: {
    home: 'home', store: 'store', addToCart: 'add to cart', inCart: 'in cart',
    wishlist: 'wishlist', description: 'Description', reviews: 'Reviews',
    noReviews: 'No reviews yet — be the first once you\'ve bought this.',
    noDescription: 'No description yet.', downloads: 'downloads', notFound: 'Product not found.',
    backToStore: 'Back to store',
  },
  th: {
    home: 'หน้าแรก', store: 'ร้านค้า', addToCart: 'เพิ่มลงตะกร้า', inCart: 'อยู่ในตะกร้าแล้ว',
    wishlist: 'รายการโปรด', description: 'รายละเอียด', reviews: 'รีวิว',
    noReviews: 'ยังไม่มีรีวิว — เป็นคนแรกได้เลยหลังซื้อสินค้านี้',
    noDescription: 'ยังไม่มีคำอธิบาย', downloads: 'ดาวน์โหลด', notFound: 'ไม่พบสินค้านี้',
    backToStore: 'กลับไปหน้าร้านค้า',
  },
};

export default function ProductDetail() {
  const { lang } = useLang();
  const t = T[lang];
  const router = useRouter();
  const { slug } = router.query;
  const { items, addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [category, setCategory] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('desc');

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      const { data: p } = await supabase.from('products').select('*').eq('slug', slug).single();
      if (p) {
        setProduct(p);
        if (p.category_id) {
          const { data: c } = await supabase.from('categories').select('*').eq('id', p.category_id).single();
          setCategory(c);
        }
        const { data: r } = await supabase
          .from('reviews').select('*, profiles(username)')
          .eq('product_id', p.id).eq('is_hidden', false)
          .order('created_at', { ascending: false });
        setReviews(r || []);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (<><Nav /><div className="wrap" style={{ padding: '60px 0' }}>...</div><Footer /></>);
  }

  if (!product) {
    return (
      <>
        <Nav />
        <div className="wrap" style={{ padding: '60px 0', textAlign: 'center' }}>
          <p className="mono" style={{ color: 'var(--text-faint)' }}>{t.notFound}</p>
          <Link href="/store" className="btn btn-ghost" style={{ marginTop: 16 }}>{t.backToStore}</Link>
        </div>
        <Footer />
      </>
    );
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const alreadyInCart = items.some((i) => i.id === product.id);

  return (
    <>
      <Head><title>{product.name} — ZERO+</title></Head>
      <Nav />

      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/" style={{ color: 'var(--red)' }}>{t.home}</Link> / <Link href="/store" style={{ color: 'var(--red)' }}>{t.store}</Link> / {product.name}
        </div>

        <div className="pd-layout">
          <div>
            <div style={{
              height: 320, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', marginBottom: 12,
            }}>
              <svg className="ic-xl"><use href={`#${productIcon(product)}`} /></svg>
            </div>
          </div>

          <div>
            {category && <div className="mono" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{category.name.toUpperCase()}</div>}
            <h1 style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 800, marginBottom: 12 }}>{product.name}</h1>
            <div className="mono" style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 22, flexWrap: 'wrap' }}>
              {avgRating
                ? <span><svg className="ic"><use href="#i-star" /></svg>{avgRating} ({reviews.length} {t.reviews.toLowerCase()})</span>
                : <span>{t.noReviews.split('—')[0]}</span>}
              {product.version && <span>{product.version}</span>}
            </div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 800, color: 'var(--red)', marginBottom: 20 }}>
              {product.is_free ? (lang === 'en' ? 'FREE' : 'ฟรี') : `฿${product.price}`}
            </div>
            <p className="sec-desc" style={{ maxWidth: '100%', marginBottom: 22 }}>
              {product.description || t.noDescription}
            </p>

            <div style={{ display: 'flex', gap: 12, margin: '22px 0', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                disabled={alreadyInCart}
                onClick={() => addItem(product)}
              >
                <svg className="ic"><use href="#i-cart" /></svg>
                {alreadyInCart ? t.inCart : t.addToCart}
              </button>
              <button className="btn btn-ghost"><svg className="ic"><use href="#i-heart" /></svg>{t.wishlist}</button>
            </div>

            {product.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 26 }}>
                {product.tags.map((tg) => <span key={tg} className="tag">{tg}</span>)}
              </div>
            )}

            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', margin: '40px 0 20px', gap: 6 }}>
              <button
                className="mono"
                onClick={() => setTab('desc')}
                style={{
                  background: 'none', border: 'none', padding: '11px 18px', fontSize: 12.5,
                  color: tab === 'desc' ? 'var(--red)' : 'var(--text-faint)',
                  borderBottom: tab === 'desc' ? '2px solid var(--red)' : '2px solid transparent', marginBottom: -1,
                }}
              >{t.description}</button>
              <button
                className="mono"
                onClick={() => setTab('reviews')}
                style={{
                  background: 'none', border: 'none', padding: '11px 18px', fontSize: 12.5,
                  color: tab === 'reviews' ? 'var(--red)' : 'var(--text-faint)',
                  borderBottom: tab === 'reviews' ? '2px solid var(--red)' : '2px solid transparent', marginBottom: -1,
                }}
              >{t.reviews} ({reviews.length})</button>
            </div>

            {tab === 'desc' && (
              <p className="sec-desc" style={{ maxWidth: '100%' }}>{product.description || t.noDescription}</p>
            )}
            {tab === 'reviews' && (
              <div>
                {reviews.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>{t.noReviews}</p>}
                {reviews.map((r) => (
                  <div key={r.id} style={{ borderBottom: '1px solid var(--line)', padding: '18px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: 'var(--red)', fontSize: 13, letterSpacing: 2 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>@{r.profiles?.username || 'user'}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
