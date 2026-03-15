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
    width: '100%', padding: '11px 14px',
    background: '#0a0a0f', border: '1px solid #1f1f2e',
    borderRadius: '9px', color: '#f0f0f5', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#9ca3af',
    fontSize: '13px', fontWeight: '500', marginBottom: '8px',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}/>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            marginBottom: '16px', fontSize: '22px',
          }}>💰</div>
          <h1 style={{
            color: '#f0f0f5', fontSize: '24px', fontWeight: '600',
            margin: '0 0 6px', letterSpacing: '-0.5px',
          }}>FinTrack AI</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Dashboard keuangan pribadi
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111118', border: '1px solid #1f1f2e',
          borderRadius: '16px', padding: '32px',
        }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: '4px',
            background: '#0a0a0f', borderRadius: '10px',
            padding: '4px', marginBottom: '28px',
          }}>
            {(['password', 'magic'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setMessage(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '7px', border: 'none',
                  fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                  transition: 'all .15s',
                  background: mode === m ? '#1f1f2e' : 'transparent',
                  color: mode === m ? '#f0f0f5' : '#6b7280',
                }}>
                {m === 'password' ? 'Password' : 'Magic Link'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} placeholder="kamu@email.com"
                onChange={e => setEmail(e.target.value)} required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e  => e.target.style.borderColor = '#1f1f2e'}
              />
            </div>

            {/* Password */}
            {mode === 'password' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)} required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e  => e.target.style.borderColor = '#1f1f2e'}
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
                padding: '11px 14px', borderRadius: '9px', marginBottom: '16px',
                fontSize: '13px', lineHeight: '1.5',
                background: isError ? '#1a0a0a' : '#0a1a0f',
                border: `1px solid ${isError ? '#3d1515' : '#153d1f'}`,
                color: isError ? '#f87171' : '#4ade80',
              }}>
                {message}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? '#1f1f2e' : '#2563eb',
                border: 'none', borderRadius: '9px',
                color: loading ? '#6b7280' : '#fff',
                fontSize: '14px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget).style.background = '#1d4ed8'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget).style.background = '#2563eb'; }}
            >
              {loading ? 'Memproses...' : mode === 'password' ? 'Masuk' : 'Kirim Magic Link'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#374151', fontSize: '12px', marginTop: '24px' }}>
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
        minHeight: '100vh', background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#374151', fontSize: '14px' }}>Memuat...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
