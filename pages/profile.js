// pages/profile.js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLang } from '../contexts/LangContext';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const T = {
  en: {
    downloads: 'My Downloads', orders: 'Orders', wishlist: 'Wishlist',
    editProfile: 'Edit profile', signOut: 'Sign out',
    noDownloads: "You haven't unlocked anything yet.", browseStore: 'Browse the store',
    noOrders: 'No orders yet.', noWishlist: 'Your wishlist is empty.',
    order: 'Order', item: 'Item', price: 'Price', status: 'Status',
    download: 'Download', joined: 'joined',
    statusPaid: 'paid', statusPending: 'pending', statusRejected: 'rejected',
  },
  th: {
    downloads: 'ไฟล์ของฉัน', orders: 'คำสั่งซื้อ', wishlist: 'รายการโปรด',
    editProfile: 'แก้ไขโปรไฟล์', signOut: 'ออกจากระบบ',
    noDownloads: 'ยังไม่มีไฟล์ที่ปลดล็อก', browseStore: 'ไปเลือกซื้อสินค้า',
    noOrders: 'ยังไม่มีคำสั่งซื้อ', noWishlist: 'รายการโปรดว่างเปล่า',
    order: 'ออเดอร์', item: 'สินค้า', price: 'ราคา', status: 'สถานะ',
    download: 'ดาวน์โหลด', joined: 'เข้าร่วมเมื่อ',
    statusPaid: 'ชำระแล้ว', statusPending: 'รอตรวจสอบ', statusRejected: 'ถูกปฏิเสธ',
  },
};

export default function Profile() {
  const { lang } = useLang();
  const t = T[lang];
  const router = useRouter();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('downloads');

  const [downloads, setDownloads] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth?redirect=/profile');
      } else {
        setUser(data.user);
      }
      setLoadingAuth(false);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoadingData(true);
      const [{ data: prof }, { data: dls }, { data: ords }, { data: wish }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('downloads').select('*, products(name, slug, version)').eq('user_id', user.id).order('unlocked_at', { ascending: false }),
        supabase.from('orders').select('*, products(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('wishlist').select('*, products(*)').eq('user_id', user.id),
      ]);
      setProfile(prof);
      setDownloads(dls || []);
      setOrders(ords || []);
      setWishlist(wish || []);
      setLoadingData(false);
    }
    load();
  }, [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loadingAuth || !user) {
    return (<><Nav /><div className="wrap" style={{ padding: '60px 0' }}>...</div><Footer /></>);
  }

  const initials = (profile?.display_name || profile?.username || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <>
      <Head><title>Profile — ZERO+</title></Head>
      <Nav />

      <div className="wrap">
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '30px 0', borderBottom: '1px solid var(--line)', marginBottom: 30, flexWrap: 'wrap' }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,var(--red),var(--red-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff',
            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 5 }}>{profile?.display_name || profile?.username || user.email}</h2>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {user.email} · {t.joined} {new Date(user.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { year: 'numeric', month: 'short' })}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={handleSignOut}>{t.signOut}</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 26, borderBottom: '1px solid var(--line)' }}>
          {['downloads', 'orders', 'wishlist'].map((tabKey) => (
            <button
              key={tabKey}
              className="mono"
              onClick={() => setTab(tabKey)}
              style={{
                background: 'none', border: 'none', padding: '11px 18px', fontSize: 12.5,
                color: tab === tabKey ? 'var(--red)' : 'var(--text-faint)',
                borderBottom: tab === tabKey ? '2px solid var(--red)' : '2px solid transparent', marginBottom: -1,
              }}
            >{t[tabKey]}</button>
          ))}
        </div>

        {loadingData && <p className="mono" style={{ color: 'var(--text-faint)' }}>...</p>}

        {!loadingData && tab === 'downloads' && (
          <div>
            {downloads.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>{t.noDownloads}</p>
                <Link href="/store" className="btn btn-primary">{t.browseStore}</Link>
              </div>
            )}
            {downloads.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--panel-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}>
                  <svg className="ic-md"><use href="#i-cube" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 4 }}>{d.products?.name}</h4>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {d.products?.version} · {new Date(d.unlocked_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH')}
                  </span>
                </div>
                <button className="btn btn-ghost"><svg className="ic"><use href="#i-download" /></svg>{t.download}</button>
              </div>
            ))}
          </div>
        )}

        {!loadingData && tab === 'orders' && (
          <div>
            {orders.length === 0 && <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>{t.noOrders}</p>}
            {orders.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <thead>
                  <tr>
                    {[t.order, t.item, t.price, t.status].map((h) => (
                      <th key={h} className="mono" style={{ textAlign: 'left', fontSize: 11, color: 'var(--text-faint)', padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="mono" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>{o.order_number}</td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>{o.products?.name}</td>
                      <td className="mono" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>฿{o.amount}</td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                        <span className="mono" style={{
                          fontSize: 10.5, padding: '4px 10px', borderRadius: 20,
                          background: o.status === 'paid' ? 'rgba(74,222,128,.15)' : o.status === 'pending' ? 'rgba(255,189,46,.15)' : 'rgba(255,59,59,.15)',
                          color: o.status === 'paid' ? 'var(--ok)' : o.status === 'pending' ? '#ffbd2e' : 'var(--red)',
                        }}>{t[`status${o.status[0].toUpperCase()}${o.status.slice(1)}`]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loadingData && tab === 'wishlist' && (
          <div className="product-grid">
            {wishlist.length === 0 && <div className="pc-empty">{t.noWishlist}</div>}
            {wishlist.map((w) => w.products && (
              <Link href={`/product/${w.products.slug}`} key={w.id} className="product-card">
                <div className="pc-media"><svg className="ic-lg"><use href="#i-cube" /></svg></div>
                <div className="pc-body">
                  <h3>{w.products.name}</h3>
                  <div className="pc-foot"><div className="pc-price">{w.products.is_free ? 'FREE' : `฿${w.products.price}`}</div></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
