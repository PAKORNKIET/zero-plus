// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLang } from '../contexts/LangContext';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const CATEGORY_ICON = {
  'java-edition': 'i-mug',
  'bedrock-edition': 'i-pick',
  'website': 'i-window',
  'free-downloads': 'i-gift',
};

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
    eyebrow: 'store is live — instant download',
    heroLine1: 'I build the tools', heroLine2: 'other devs skip.',
    lede: "Zero+ is the workshop of a solo developer — mods, launchers, and dev tooling shipped straight to your download center. No middleman, no wait.",
    browseStore: 'browse the store', viewFree: 'view free downloads',
    itemsSold: 'ITEMS SOLD', productsLive: 'PRODUCTS LIVE', developer: 'DEVELOPER', waitTime: 'WAIT TIME',
    shopByCategory: 'Shop by category',
    featuredWork: 'Projects worth breaking things for',
    featuredWorkDesc: 'A mix of shipped tools and things still cooking — every one built solo, end to end.',
    underTheHood: '// under the hood', realCode: 'Real code. No mockups.',
    realCodeDesc: "Every product on this site ships with source I actually wrote — no stock templates, no filler. This is the kind of thing you'll find in the repo.",
    bestSellers: '// best sellers', topPicks: 'Top picks from the store', viewAll: 'view all',
    letsTalk: "// let's talk", gotBuild: 'Got a build in mind?',
    gotBuildDesc: "Whether it's a mod, a launcher, or a full web platform — if it needs to ship, I'm probably interested.",
    startProject: 'start a project',
    noProducts: 'No products yet — add some in Supabase to see them here.',
  },
  th: {
    eyebrow: 'ร้านเปิดแล้ว — โหลดได้ทันที',
    heroLine1: 'ผมสร้างเครื่องมือ', heroLine2: 'ที่ dev คนอื่นข้ามไป',
    lede: 'Zero+ คือร้านของ dev คนเดียว ขาย Mods, Launcher และเครื่องมือสำหรับนักพัฒนา ซื้อแล้วโหลดได้ทันทีไม่ต้องรอแอดมิน',
    browseStore: 'เข้าร้านค้า', viewFree: 'ดูของฟรี',
    itemsSold: 'ยอดขายทั้งหมด', productsLive: 'สินค้าที่ขาย', developer: 'นักพัฒนา', waitTime: 'เวลารอ',
    shopByCategory: 'เลือกซื้อตามหมวดหมู่',
    featuredWork: 'โปรเจกต์ที่คุ้มค่ากับการลองผิดลองถูก',
    featuredWorkDesc: 'รวมทั้งเครื่องมือที่ปล่อยแล้วและที่กำลังทำ — สร้างเองทั้งหมดตั้งแต่ต้นจนจบ',
    underTheHood: '// เบื้องหลัง', realCode: 'โค้ดจริง ไม่มี mockup',
    realCodeDesc: 'สินค้าทุกชิ้นในเว็บนี้มาพร้อมซอร์สโค้ดที่เขียนเองจริง ไม่ใช้เทมเพลตสำเร็จรูป นี่คือตัวอย่างสิ่งที่จะเจอใน repo',
    bestSellers: '// สินค้าขายดี', topPicks: 'สินค้าขายดีจากร้าน', viewAll: 'ดูทั้งหมด',
    letsTalk: '// ติดต่อ', gotBuild: 'มีโปรเจกต์อยากให้ช่วยทำ?',
    gotBuildDesc: 'ไม่ว่าจะเป็น mod, launcher หรือเว็บแอปเต็มรูปแบบ — ถ้าต้องปล่อยจริง ผมสนใจแน่นอน',
    startProject: 'เริ่มโปรเจกต์',
    noProducts: 'ยังไม่มีสินค้า — เพิ่มใน Supabase เพื่อให้แสดงตรงนี้',
  },
};

export default function Home() {
  const { lang } = useLang();
  const t = T[lang];

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').is('parent_id', null).order('sort_order'),
        supabase.from('products').select('*').eq('is_hidden', false).order('created_at', { ascending: false }).limit(4),
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Head><title>ZERO+ Store</title></Head>
      <Nav />

      <div className="wrap">
        <section className="hero" style={{ paddingTop: 60 }}>
          <div>
            <div className="eyebrow"><span className="blink" />{t.eyebrow}</div>
            <h1 className="hero-h">{t.heroLine1}<br /><span className="redline">{t.heroLine2}</span></h1>
            <p className="lede">{t.lede}</p>
            <div className="hero-actions">
              <Link href="/store" className="btn btn-primary"><svg className="ic"><use href="#i-arrow" /></svg>{t.browseStore}</Link>
              <Link href="/store" className="btn btn-ghost">{t.viewFree}</Link>
            </div>
            <div className="hero-tags">
              <span className="tag">Java / Forge</span><span className="tag">TypeScript</span>
              <span className="tag">Electron</span><span className="tag">Next.js</span>
            </div>
          </div>

          <div className="terminal">
            <div className="term-bar">
              <div className="term-dot" style={{ background: '#ff5f56' }} />
              <div className="term-dot" style={{ background: '#ffbd2e' }} />
              <div className="term-dot" style={{ background: '#27c93f' }} />
              <div className="term-title">zero@plus: ~/store</div>
            </div>
            <div className="term-body">
              <div><span className="prompt">$</span> <span className="path">whoami</span></div>
              <div className="out">&gt; solo dev — mods, tools, launchers</div>
              <br />
              <div><span className="prompt">$</span> <span className="path">ls projects/</span></div>
              <div className="out">vcn-nickname/&nbsp;&nbsp;swordclash/</div>
              <div className="out">zerofx/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;nextstep/</div>
              <br />
              <div><span className="prompt">$</span> <span className="path">status --build</span></div>
              <div className="out"><span className="ok">●</span> building in public<span className="cursor" /></div>
            </div>
          </div>
        </section>
      </div>

      <div className="stats">
        <div className="wrap">
          <div className="stats-row">
            <div className="stat"><b>340+</b><span>{t.itemsSold}</span></div>
            <div className="stat"><b>{products.length}</b><span>{t.productsLive}</span></div>
            <div className="stat"><b>1</b><span>{t.developer}</span></div>
            <div className="stat"><b>0</b><span>{t.waitTime}</span></div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <section>
          <div className="sec-head"><div><h2>{t.shopByCategory}</h2></div></div>
          <div className="cat-strip">
            {loading && <span className="mono" style={{ color: 'var(--text-faint)' }}>...</span>}
            {!loading && categories.map((c) => (
              <Link href={`/store?category=${c.slug}`} key={c.id} className="cat-box">
                <div className="ic-wrap"><svg className="ic-md"><use href={`#${CATEGORY_ICON[c.slug] || 'i-cube'}`} /></svg></div>
                <h3>{c.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="sec-head">
            <div>
              <div className="sec-eyebrow">// featured work</div>
              <h2>{t.featuredWork}</h2>
            </div>
            <p className="sec-desc">{t.featuredWorkDesc}</p>
          </div>
          <div className="grid-work">
            <div className="card">
              <div className="card-top"><span className="card-tag">MOD</span><svg className="ic card-arrow"><use href="#i-arrow" /></svg></div>
              <h3>VCN Nickname</h3>
              <p>PlasmoVoice addon for custom voice-overlay nicknames, with cross-server nick storage.</p>
              <div className="card-stack"><span>Forge 1.20.1</span><span>Java</span></div>
            </div>
            <div className="card">
              <div className="card-top"><span className="card-tag">MOD</span><svg className="ic card-arrow"><use href="#i-arrow" /></svg></div>
              <h3>SwordClash</h3>
              <p>Anime-style sword clash QTE mechanics integrating with EpicFight mod.</p>
              <div className="card-stack"><span>Forge 1.20.1</span><span>EpicFight</span></div>
            </div>
            <div className="card">
              <div className="card-top"><span className="card-tag">WEB APP</span><svg className="ic card-arrow"><use href="#i-arrow" /></svg></div>
              <h3>NEXTSTEP</h3>
              <p>Career &amp; university guidance platform mapping 141 universities and 4,900+ programs.</p>
              <div className="card-stack"><span>Next.js</span><span>Supabase</span></div>
            </div>
            <div className="card">
              <div className="card-top"><span className="card-tag">MOD</span><svg className="ic card-arrow"><use href="#i-arrow" /></svg></div>
              <h3>ZeroFX</h3>
              <p>Toggle-on-demand AAA particle effects with a custom animated toast notification system.</p>
              <div className="card-stack"><span>Forge</span><span>Mixin</span></div>
            </div>
          </div>
        </section>
      </div>

      <div className="showcase">
        <div className="wrap">
          <div className="showcase-inner">
            <div>
              <div className="sec-eyebrow">{t.underTheHood}</div>
              <h2 style={{ marginBottom: 16 }}>{t.realCode}</h2>
              <p className="sec-desc" style={{ maxWidth: '100%', marginBottom: 22 }}>{t.realCodeDesc}</p>
            </div>
            <div className="code-window">
              <div className="code-tabs"><div className="code-tab active">VoiceNick.java</div></div>
              <div className="code-body">
                <div className="code-line"><span className="ln">1</span><span className="cm">// registers per-player nickname overlay</span></div>
                <div className="code-line"><span className="ln">2</span><span className="kw">public class</span>&nbsp;<span className="fn">NickHandler</span> {'{'}</div>
                <div className="code-line"><span className="ln">3</span>&nbsp;&nbsp;<span className="kw">public void</span> <span className="fn">onVoiceJoin</span>(Player p) {'{'}</div>
                <div className="code-line"><span className="ln">4</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="prop">String</span> nick = store.<span className="fn">get</span>(p.<span className="fn">getUUID</span>());</div>
                <div className="code-line"><span className="ln">5</span>&nbsp;&nbsp;&nbsp;&nbsp;overlay.<span className="fn">render</span>(p, nick);</div>
                <div className="code-line"><span className="ln">6</span>&nbsp;&nbsp;{'}'}</div>
                <div className="code-line"><span className="ln">7</span>{'}'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <section>
          <div className="sec-head">
            <div><div className="sec-eyebrow">{t.bestSellers}</div><h2>{t.topPicks}</h2></div>
            <Link href="/store" className="btn btn-ghost">{t.viewAll}<svg className="ic"><use href="#i-arrow" /></svg></Link>
          </div>
          <div className="product-grid">
            {loading && <span className="mono" style={{ color: 'var(--text-faint)' }}>...</span>}
            {!loading && products.length === 0 && <div className="pc-empty">{t.noProducts}</div>}
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
        </section>

        <section className="cta-band" style={{ paddingTop: 20 }}>
          <div className="sec-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>{t.letsTalk}</div>
          <h2>{t.gotBuild}</h2>
          <p>{t.gotBuildDesc}</p>
          <Link href="/auth" className="btn btn-primary">{t.startProject}</Link>
        </section>
      </div>

      <Footer />
    </>
  );
}
