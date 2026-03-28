'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Form dipisah ke komponen sendiri karena pakai useSearchParams ────────────
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [mode,     setMode]     = useState<'password' | 'magic'>('password');
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState('');
  const [isError,  setIsError]  = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) { setMessage(urlError); setIsError(true); }
  }, [searchParams]);

  const supabase = createClient();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsError(true);
      setMessage(error.message.includes('Invalid login')
        ? 'Email atau password salah.' : error.message);
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) { setIsError(true); setMessage(error.message); return; }
    setIsError(false);
    setMessage(`Link masuk dikirim ke ${email}. Cek inbox kamu.`);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: 'var(--text-muted)',
    fontSize: '13px', fontWeight: '500', marginBottom: '8px',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background grid - very subtle */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(var(--border-color) 0.5px, transparent 0.5px)',
        backgroundSize: '32px 32px',
        opacity: 0.4,
      }}/>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--accent-primary)',
            color: 'var(--accent-primary-fg)',
            marginBottom: '20px', fontSize: '24px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          }}>💰</div>
          <h1 style={{
            color: 'var(--text-main)', fontSize: '24px', fontWeight: '500',
            margin: '0 0 6px', letterSpacing: '-0.4px',
          }}>FinTrack AI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0 }}>
            Dashboard Keuangan Pribadi
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', padding: '36px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: '4px',
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            padding: '4px', marginBottom: '32px',
          }}>
            {(['password', 'magic'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setMessage(''); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none',
                  fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                  transition: 'all .15s',
                  background: mode === m ? 'var(--card-bg)' : 'transparent',
                  color: mode === m ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                }}>
                {m === 'password' ? 'Password' : 'Magic Link'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} placeholder="kamu@email.com"
                onChange={e => setEmail(e.target.value)} required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            {/* Password */}
            {mode === 'password' && (
              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)} required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>
            )}

            {mode === 'magic' && (
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 24px', lineHeight: '1.5' }}>
                Kami kirim link masuk ke email kamu. Tidak perlu password.
              </p>
            )}

            {/* Message */}
            {message && (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '20px',
                fontSize: '13px', lineHeight: '1.5',
                background: isError ? 'var(--color-negative-bg)' : 'var(--color-positive-bg)',
                border: `1px solid ${isError ? 'var(--color-negative)' : 'var(--color-positive)'}`,
                color: isError ? 'var(--color-negative)' : 'var(--color-positive)',
              }}>
                {message}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: loading ? 'var(--text-muted)' : 'var(--accent-primary-fg)',
                fontSize: '15px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget).style.opacity = '0.9'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget).style.opacity = '1'; }}
            >
              {loading ? 'Memproses...' : mode === 'password' ? 'Masuk' : 'Kirim Magic Link'}
            </button>
          </form>
        </div>

        {/* Demo button */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ textAlign:'center', fontSize:'12px', color:'var(--text-muted)', marginBottom:'12px' }}>
            Ingin lihat dulu sebelum daftar?
          </div>
          <button
            type="button"
            onClick={async () => {
              setLoading(true); setMessage('');
              const { error } = await supabase.auth.signInWithPassword({
                email: 'demo@fintrack.app', password: 'Demo1234!',
              });
              if (error) { setIsError(true); setMessage('Demo tidak tersedia saat ini.'); setLoading(false); return; }
              router.push('/dashboard'); router.refresh();
            }}
            style={{
              width:'100%', padding:'12px', background:'transparent',
              border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)',
              color:'var(--text-main)', fontSize:'13px', fontWeight:'600', cursor:'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget).style.background='var(--bg-secondary)'}
            onMouseLeave={e => (e.currentTarget).style.background='transparent'}
          >
            🎭 Lihat Demo Gratis
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '24px' }}>
          Akses terbatas. Hubungi admin untuk pendaftaran.
        </p>
      </div>
    </div>
  );
}

// ─── Page: bungkus LoginForm dengan Suspense ──────────────────────────────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Memuat...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
