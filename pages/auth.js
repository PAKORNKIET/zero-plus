// pages/auth.js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLang } from '../contexts/LangContext';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const T = {
  en: {
    login: 'Login', register: 'Register', email: 'Email', password: 'Password',
    confirmPassword: 'Confirm password', logIn: 'Log in', createAccount: 'Create account',
    or: 'OR', google: 'Google', discord: 'Discord', forgot: 'Forgot password?',
    passwordsDontMatch: "Passwords don't match.", checkEmail: 'Check your email to confirm your account.',
    resetSent: 'Password reset email sent — check your inbox.',
  },
  th: {
    login: 'เข้าสู่ระบบ', register: 'สมัครสมาชิก', email: 'อีเมล', password: 'รหัสผ่าน',
    confirmPassword: 'ยืนยันรหัสผ่าน', logIn: 'เข้าสู่ระบบ', createAccount: 'สมัครสมาชิก',
    or: 'หรือ', google: 'Google', discord: 'Discord', forgot: 'ลืมรหัสผ่าน?',
    passwordsDontMatch: 'รหัสผ่านไม่ตรงกัน', checkEmail: 'เช็คอีเมลเพื่อยืนยันบัญชี',
    resetSent: 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว เช็คอินบ็อกซ์',
  },
};

export default function Auth() {
  const { lang } = useLang();
  const t = T[lang];
  const router = useRouter();
  const redirectTo = typeof router.query.redirect === 'string' ? router.query.redirect : '/';

  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(redirectTo);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null); setNotice(null);
    if (password !== confirm) return setError(t.passwordsDontMatch);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    setNotice(t.checkEmail);
  }

  async function handleForgot() {
    if (!email) return setError('Enter your email above first.');
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return setError(error.message);
    setNotice(t.resetSent);
  }

  async function handleOAuth(provider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
  }

  return (
    <>
      <Head><title>{t.login} — ZERO+</title></Head>
      <Nav />

      <div className="wrap">
        <div style={{ maxWidth: 400, margin: '40px auto' }}>
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 26 }}>
            <button
              className="mono"
              onClick={() => { setTab('login'); setError(null); setNotice(null); }}
              style={{ flex: 1, textAlign: 'center', padding: 12, fontSize: 13, border: 'none', background: tab === 'login' ? 'var(--red)' : 'var(--panel)', color: tab === 'login' ? '#fff' : 'var(--text-faint)' }}
            >{t.login}</button>
            <button
              className="mono"
              onClick={() => { setTab('register'); setError(null); setNotice(null); }}
              style={{ flex: 1, textAlign: 'center', padding: 12, fontSize: 13, border: 'none', background: tab === 'register' ? 'var(--red)' : 'var(--panel)', color: tab === 'register' ? '#fff' : 'var(--text-faint)' }}
            >{t.register}</button>
          </div>

          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10, padding: 28 }}>
            <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
              <div style={{ marginBottom: 16 }}>
                <label className="mono" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 7 }}>{t.email}</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 13px', color: 'var(--text)', fontSize: 13.5 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="mono" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 7 }}>{t.password}</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 13px', color: 'var(--text)', fontSize: 13.5 }}
                />
              </div>
              {tab === 'register' && (
                <div style={{ marginBottom: 16 }}>
                  <label className="mono" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 7 }}>{t.confirmPassword}</label>
                  <input
                    type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 13px', color: 'var(--text)', fontSize: 13.5 }}
                  />
                </div>
              )}

              {error && <p className="mono" style={{ color: 'var(--red)', fontSize: 12, marginBottom: 14 }}>{error}</p>}
              {notice && <p className="mono" style={{ color: 'var(--ok)', fontSize: 12, marginBottom: 14 }}>{notice}</p>}

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? '...' : (tab === 'login' ? t.logIn : t.createAccount)}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-faint)', fontSize: 11, margin: '18px 0' }} className="mono">
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />{t.or}<div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleOAuth('google')} className="mono" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, color: 'var(--text-dim)', background: 'var(--panel-2)' }}>
                <svg className="ic"><use href="#i-user" /></svg>{t.google}
              </button>
              <button onClick={() => handleOAuth('discord')} className="mono" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, color: 'var(--text-dim)', background: 'var(--panel-2)' }}>
                <svg className="ic"><use href="#i-user" /></svg>{t.discord}
              </button>
            </div>

            {tab === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={handleForgot} className="mono" style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-faint)', textDecoration: 'underline' }}>{t.forgot}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
