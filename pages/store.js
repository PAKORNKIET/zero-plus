// pages/store.js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLang } from '../contexts/LangContext';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

function productIcon(product) {
  const tags = (product.tags || []).map((t) => t.toLowerCase());
  if (product.name.toLowerCase().includes('sword')) return 'i-sword';
  if (product.name.toLowerCase().includes('fx') || product.name.toLowerCase().includes('particle')) return 'i-spark';
  if (tags.includes('blockbench')) return 'i-layers';
  if (product.is_free) return 'i-gift';
  return 'i-cube';
}

const T = {
  en: {
    home: 'home', store: 'store', allProducts: 'All Products',
    items: 'items', sortPopular: 'Sort: Popular', sortLowHigh: 'Price: Low to High',
    sortHighLow: 'Price: High to Low', sortNewest: 'Newest',
    empty: 'No products in this category yet.',
  },
  th: {
    home: 'หน้าแรก', store: 'ร้านค้า', allProducts: 'สินค้าทั้งหมด',
    items: 'รายการ', sortPopular: 'เรียงตาม: ยอดนิยม', sortLowHigh: 'ราคา: น้อยไปมาก',
    sortHighLow: 'ราคา: มากไปน้อย', sortNewest: 'ใหม่ล่าสุด',
    empty: 'ยังไม่มีสินค้าในหมวดนี้',
  },
};

export default function Store() {
  const { lang } = useLang();
  const t = T[lang];
  const router = useRouter();
  const selectedSlug = router.query.category || null;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from('products').select('*').eq('is_hidden', false);

      if (selectedSlug && categories.length) {
        const selected = categories.find((c) => c.slug === selectedSlug);
        if (selected) {
          const isParent = !selected.parent_id;
          const categoryIds = isParent
            ? [selected.id, ...categories.filter((c) => c.parent_id === selected.id).map((c) => c.id)]
            : [selected.id];
          query = query.in('category_id', categoryIds);
        }
      }

      const sortMap = {
        popular: { column: 'created_at', ascending: false },
        newest: { column: 'created_at', ascending: false },
        price_asc: { column: 'price', ascending: true },
        price_desc: { column: 'price', ascending: false },
      };
      const { column, ascending } = sortMap[sort];
      const { data } = await query.order(column, { ascending });
      setProducts(data || []);
      setLoading(false);
    }
    if (categories.length) load();
  }, [selectedSlug, categories, sort]);

  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (id) => categories.filter((c) => c.parent_id === id);

  return (
    <>
      <Head><title>Store — ZERO+</title></Head>
      <Nav />

      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/" style={{ color: 'var(--red)' }}>{t.home}</Link> / {t.store}
        </div>

        <div className="store-layout">
          <aside className="filter-panel">
            <div className="filter-title">{t.allProducts.toUpperCase()}</div>
            <div className="cat-tree">
              <Link href="/store" className={!selectedSlug ? 'active' : ''}>{t.allProducts}</Link>
              {topLevel.map((cat) => (
                <div key={cat.id}>
                  <Link href={`/store?category=${cat.slug}`} className={selectedSlug === cat.slug ? 'active' : ''}>
                    {cat.name}
                  </Link>
                  {childrenOf(cat.id).map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/store?category=${sub.slug}`}
                      className={`sub ${selectedSlug === sub.slug ? 'active' : ''}`}
                    >
                      — {sub.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          <div>
            <div className="store-filter-bar">
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
                {loading ? '...' : products.length} {t.items}
              </span>
              <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">{t.sortPopular}</option>
                <option value="price_asc">{t.sortLowHigh}</option>
                <option value="price_desc">{t.sortHighLow}</option>
                <option value="newest">{t.sortNewest}</option>
              </select>
            </div>

            <div className="product-grid">
              {loading && <span className="mono" style={{ color: 'var(--text-faint)' }}>...</span>}
              {!loading && products.length === 0 && <div className="pc-empty">{t.empty}</div>}
              {!loading && products.map((p) => (
                <Link href={`/product/${p.slug}`} key={p.id} className="product-card">
                  <div className="pc-media">
                    {p.is_free && <span className="pc-badge pc-free">FREE</span>}
                    <svg className="ic-lg"><use href={`#${productIcon(p)}`} /></svg>
                  </div>
                  <div className="pc-body">
                    <h3>{p.name}</h3>
                    <div className="pc-stack">{(p.tags || []).map((tg) => <span key={tg}>{tg}</span>)}</div>
                    <div className="pc-foot">
                      <div className="pc-price">{p.is_free ? (lang === 'en' ? 'FREE' : 'ฟรี') : `฿${p.price}`}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
