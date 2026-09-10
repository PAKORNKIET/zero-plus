// components/Nav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';

const LABELS = {
  en: { home: 'home', store: 'store', profile: 'profile', admin: 'admin' },
  th: { home: 'หน้าแรก', store: 'ร้านค้า', profile: 'โปรไฟล์', admin: 'แอดมิน' },
};

export default function Nav() {
  const { lang, setLang } = useLang();
  const { items } = useCart();
  const router = useRouter();
  const t = LABELS[lang];
  const isActive = (path) => (path === '/' ? router.pathname === '/' : router.pathname.startsWith(path));

  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header>
      <div className="wrap">
        <nav>
          <Link href="/" className="logo">ZERO<span className="dot">+</span></Link>
          <div className="navlinks">
            <Link href="/" style={isActive('/') ? { color: 'var(--red)' } : undefined}>{t.home}</Link>
            <Link href="/store" style={isActive('/store') ? { color: 'var(--red)' } : undefined}>{t.store}</Link>
            <Link href="/profile" style={isActive('/profile') ? { color: 'var(--red)' } : undefined}>{t.profile}</Link>
            <Link href="/admin" style={isActive('/admin') ? { color: 'var(--red)' } : undefined}>{t.admin}</Link>
          </div>
          <div className="nav-icons">
            <div className="lang-toggle">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            </div>
            <Link href={user ? '/profile' : '/auth'} className="icon-btn" title={user?.email || ''}>
              <svg className="ic"><use href="#i-user" /></svg>
            </Link>
            <Link href="/cart" className="icon-btn" style={{ position: 'relative' }}>
              <svg className="ic"><use href="#i-cart" /></svg>
              {items.length > 0 && <span className="cart-count">{items.length}</span>}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
