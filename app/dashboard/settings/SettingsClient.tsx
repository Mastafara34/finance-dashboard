// app/dashboard/settings/SettingsClient.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  telegram_chat_id: number | null;
  role: string;
  monthly_income: number | null;
  timezone: string;
  currency: string;
  notify_weekly: boolean;
  notify_monthly: boolean;
  notify_ai: boolean;
  notify_reminders: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  color: string;
  is_default: boolean;
  user_id: string | null;
  sort_order: number;
}

interface Props {
  profile: Profile;
  categories: Category[];
  authEmail: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const CATEGORY_ICONS = [
  '🍽️','🚗','🛒','💡','🏥','🎮','📚','👕','✂️','🏠',
  '🤝','📈','🏦','📦','💼','💻','🏪','🎁','💰','✈️',
  '🎯','🎸','🏋️','🌿','🚌','⛽','🍕','☕','🛍️','🎬',
];

const CATEGORY_COLORS = [
  '#2563eb','#16a34a','#d97706','#dc2626','#7c3aed',
  '#0891b2','#be185d','#059669','#9333ea','#ea580c',
];

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border-color)',
      borderRadius: '14px', overflow: 'hidden', marginBottom: '16px',
      boxShadow: 'var(--card-shadow)'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

// ─── Input helper ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block', fontSize: '12px', color: 'var(--text-muted)',
        fontWeight: '600', marginBottom: '6px',
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
  borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box',
  transition: 'all 0.15s',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsClient({ profile, categories, authEmail }: Props) {
  const supabase = createClient();

  // ── Profile state ─────────────────────────────────────────────────────────
  const [displayName,    setDisplayName]    = useState(profile.display_name ?? '');
  const [monthlyIncome,  setMonthlyIncome]  = useState(profile.monthly_income ?? 0);
  const [incomeDisplay,  setIncomeDisplay]  = useState(
    profile.monthly_income ? profile.monthly_income.toLocaleString('id-ID') : ''
  );
  const [timezone,       setTimezone]       = useState(profile.timezone ?? 'Asia/Jakarta');
  const [notifyWeekly,   setNotifyWeekly]   = useState(profile.notify_weekly ?? true);
  const [notifyMonthly,  setNotifyMonthly]  = useState(profile.notify_monthly ?? true);
  const [notifyAi,       setNotifyAi]       = useState(profile.notify_ai ?? true);
  const [notifyRemind,   setNotifyRemind]   = useState(profile.notify_reminders ?? true);
  const [savingProfile,  setSavingProfile]  = useState(false);

  // ── Category state ────────────────────────────────────────────────────────
  const [cats,           setCats]           = useState<Category[]>(categories);
  const [catTab,         setCatTab]         = useState<'expense' | 'income'>('expense');
  const [showCatForm,    setShowCatForm]    = useState(false);
  const [editCat,        setEditCat]        = useState<Category | null>(null);
  const [catPage,        setCatPage]        = useState(1);
  const CAT_PAGE_SIZE = 8;
  const [catForm,        setCatForm]        = useState({
    name: '', icon: '📦', color: '#6b7280', type: 'expense' as 'income' | 'expense',
  });
  const [savingCat,      setSavingCat]      = useState(false);

  // ── Password state ────────────────────────────────────────────────────────
  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPass,    setConfirmPass]    = useState('');
  const [savingPass,     setSavingPass]     = useState(false);

  // ── Theme state ───────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  const applyTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // ── Danger Zone state ─────────────────────────────────────────────────────
  const [showDanger, setShowDanger] = useState(false);
  const [confirmResetTx, setConfirmResetTx] = useState(false);
  const [confirmResetCat, setConfirmResetCat] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [reseting, setReseting] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [passStrength, setPassStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: '', color: '' });

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function checkPassStrength(pass: string) {
    let s = 0;
    if (pass.length === 0) { setPassStrength({ score: 0, label: '', color: '' }); return; }
    if (pass.length >= 6) s++;
    if (/[A-Z]/.test(pass)) s++;
    if (/[0-9]/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;

    const map = [
      { label: 'Sangat Lemah', color: '#ef4444' },
      { label: 'Lemah', color: '#f97316' },
      { label: 'Cukup', color: '#eab308' },
      { label: 'Kuat', color: '#22c55e' },
      { label: 'Sangat Kuat', color: '#10b981' },
    ];
    setPassStrength({ score: s, label: map[s].label, color: map[s].color });
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  async function saveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.from('users').update({
      display_name: displayName.trim() || null,
      monthly_income: monthlyIncome || null,
      timezone,
      notify_weekly: notifyWeekly,
      notify_monthly: notifyMonthly,
      notify_ai: notifyAi,
      notify_reminders: notifyRemind,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    setSavingProfile(false);
    if (error) { showToast('Gagal menyimpan: ' + error.message, false); return; }
    showToast('Profil berhasil disimpan.');
  }

  // ── Change password ───────────────────────────────────────────────────────
  async function changePassword() {
    if (newPassword.length < 6) { showToast('Password minimal 6 karakter', false); return; }
    if (newPassword !== confirmPass) { showToast('Konfirmasi password tidak cocok', false); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPass(false);
    if (error) { showToast('Gagal ubah password: ' + error.message, false); return; }
    setNewPassword(''); setConfirmPass('');
    showToast('Password berhasil diubah');
  }

  const openNewCat = () => { setEditCat(null); setCatForm({ name: '', icon: '📦', color: '#6b7280', type: catTab }); setShowCatForm(true); };
  const openEditCat = (cat: Category) => { setEditCat(cat); setCatForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type }); setShowCatForm(true); };

  async function saveCat() {
    if (!catForm.name.trim()) { showToast('Nama wajib diisi', false); return; }
    setSavingCat(true);
    if (editCat?.id) {
      if (editCat.is_default) { showToast('Kategori sistem tidak bisa diedit', false); setSavingCat(false); return; }
      const { error } = await supabase.from('categories').update({ name: catForm.name.trim(), icon: catForm.icon, color: catForm.color }).eq('id', editCat.id);
      if (!error) setCats(prev => prev.map(c => c.id === editCat.id ? { ...c, name: catForm.name.trim(), icon: catForm.icon, color: catForm.color } : c));
    } else {
      const { data, error } = await supabase.from('categories').insert([{ user_id: profile.id, name: catForm.name.trim(), icon: catForm.icon, color: catForm.color, type: catForm.type, is_default: false, sort_order: 50 }]).select().single();
      if (!error) setCats(prev => [...prev, data as unknown as Category]);
    }
    setSavingCat(false); setShowCatForm(false); setEditCat(null);
  }

  async function deleteCat() {
    if (!deletingCat || deletingCat.is_default) return;
    const { error } = await supabase.from('categories').delete().eq('id', deletingCat.id);
    if (!error) setCats(prev => prev.filter(c => c.id !== deletingCat.id));
    setDeletingCat(null);
  }

  async function resetAllTransactions() {
    setReseting(true);
    const { error } = await supabase.from('transactions').update({ is_deleted: true }).eq('user_id', profile.id);
    setReseting(false); setConfirmResetTx(false);
    if (error) { showToast('Gagal reset', false); return; }
    showToast('Semua transaksi dihapus');
  }

  async function resetCustomCategories() {
    setReseting(true);
    const { error } = await supabase.from('categories').delete().eq('user_id', profile.id);
    setReseting(false); setConfirmResetCat(false);
    if (error) { showToast('Gagal reset', false); return; }
    setCats(prev => prev.filter(c => c.is_default));
    showToast('Kategori kustom direset');
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const filteredCats = cats.filter(c => c.type === catTab);
  const userCats     = filteredCats.filter(c => !c.is_default);
  const systemCats   = filteredCats.filter(c => c.is_default);

  return (
    <div style={{ color: 'var(--text-main)', maxWidth: '720px', margin: '0 auto', paddingBottom: '100px' }}>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .toast-notify {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {toast && (
        <div className="toast-notify" style={{ 
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000, 
          padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', 
          background: 'var(--card-bg)', 
          border: `1px solid ${toast.ok ? '#10b981' : '#ef4444'}`, 
          color: toast.ok ? '#10b981' : '#ef4444',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '18px' }}>{toast.ok ? '✅' : '❌'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>Pengaturan</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Kelola profil, tampilan, dan integrasi aplikasi</p>
      </div>

      {/* ── GROUP 1: AKUN & KEAMANAN ─────────────────────────────────── */}
      <h2 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.1em' }}>PENGATURAN AKUN</h2>
      
      <Section title="Profil" subtitle="Informasi identitas akun kamu">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Field label="Nama Lengkap">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Email">
            <input value={authEmail} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <Field label="Pendapatan Bulanan">
            <input value={incomeDisplay} onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setIncomeDisplay(raw ? parseInt(raw).toLocaleString('id-ID') : ''); setMonthlyIncome(parseInt(raw) || 0); }} style={inputStyle} placeholder="cth: 5.000.000" />
          </Field>
          <Field label="Zona Waktu">
            <select value={timezone} onChange={e => setTimezone(e.target.value)} style={inputStyle}>
              <option value="Asia/Jakarta">WIB (UTC+7)</option>
              <option value="Asia/Makassar">WITA (UTC+8)</option>
              <option value="Asia/Jayapura">WIT (UTC+9)</option>
            </select>
          </Field>
        </div>
        <button onClick={saveProfile} disabled={savingProfile} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{savingProfile ? 'Saving...' : 'Simpan Profil'}</button>
      </Section>

      <Section title="Keamanan" subtitle="Ganti password untuk perlindungan akun">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Field label="Password Baru">
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => {
                setNewPassword(e.target.value);
                checkPassStrength(e.target.value);
              }} 
              style={inputStyle} 
            />
            {newPassword && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ 
                    height: '100%', width: `${(passStrength.score + 1) * 20}%`, 
                    background: passStrength.color, transition: 'all 0.3s' 
                  }}/>
                </div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: passStrength.color, textTransform: 'uppercase' }}>
                  Strength: {passStrength.label}
                </div>
              </div>
            )}
          </Field>
          <Field label="Konfirmasi Password">
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} style={inputStyle} />
            {confirmPass && newPassword !== confirmPass && (
              <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '6px', fontWeight: '700' }}>⚠️ Password tidak cocok</div>
            )}
          </Field>
        </div>
        <button onClick={changePassword} disabled={savingPass || !newPassword || newPassword !== confirmPass} style={{ padding: '10px 20px', background: !newPassword || newPassword !== confirmPass ? 'var(--bg-secondary)' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Ubah Password</button>
      </Section>

      <Section title="Notifikasi Telegram" subtitle="Aktifkan laporan otomatis ke akun Telegram">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { id: 'weekly',   label: 'Laporan Mingguan', sub: 'Ringkasan performa setiap Sabtu pagi', value: notifyWeekly, set: setNotifyWeekly },
            { id: 'monthly',  label: 'Laporan Bulanan', sub: 'Tinjauan mendalam setiap tanggal 1', value: notifyMonthly, set: setNotifyMonthly },
            { id: 'ai',       label: 'Vonis Strategis AI', sub: 'Insight tajam tentang pola belanja Anda', value: notifyAi, set: setNotifyAi },
            { id: 'reminder', label: 'Pengingat Tidak Isi', sub: 'Notifikasi jika tidak ada transaksi > 2 hari', value: notifyRemind, set: setNotifyRemind },
          ].map(opt => (
            <div key={opt.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap:'12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.sub}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    const old = btn.innerText; btn.innerText = 'Testing...';
                    const res = await fetch('/api/cron/test-report', { method: 'POST', body: JSON.stringify({ type: opt.id }) });
                    btn.innerText = res.ok ? 'Sukses ✅' : 'Gagal ❌';
                    setTimeout(() => { btn.innerText = old; }, 2000);
                  }}
                  style={{ 
                    padding: '4px 10px', fontSize: '10px', fontWeight: '800', 
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                    color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer' 
                  }}
                >
                  TEST
                </button>

                <div 
                  onClick={() => opt.set(!opt.value)}
                  style={{
                    width: '40px', height: '22px', borderRadius: '12px',
                    background: opt.value ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    border: `1px solid ${opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '2px', left: opt.value ? '20px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(37,99,235,0.05)', borderRadius: '10px', border: '1px dashed var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '700' }}>
             🆔 Telegram ID: {profile.telegram_chat_id || 'Belum Terhubung'}
          </div>
        </div>
        <button onClick={saveProfile} disabled={savingProfile} style={{ marginTop:'20px', padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Simpan Pengaturan Notifikasi</button>
      </Section>

      {/* ── GROUP 2: APLIKASI & DATA ─────────────────────────────────── */}
      <h2 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '32px', letterSpacing: '0.1em' }}>PENGATURAN APLIKASI</h2>

      <Section title="Mode Tampilan">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div onClick={() => applyTheme('dark')} style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${theme === 'dark' ? '#2563eb' : 'var(--border-color)'}`, cursor: 'pointer', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>🌙 Dark Mode {theme === 'dark' && '✓'}</div>
          </div>
          <div onClick={() => applyTheme('light')} style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${theme === 'light' ? '#2563eb' : 'var(--border-color)'}`, cursor: 'pointer', background: '#fff', color: '#000' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>☀️ Light Mode {theme === 'light' && '✓'}</div>
          </div>
        </div>
      </Section>

      <Section title="Kategori Transaksi" subtitle="Kelola kategori kustom kamu">
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => { setCatTab(t); setCatPage(1); }} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: catTab === t ? 'var(--card-bg)' : 'transparent', color: catTab === t ? '#2563eb' : 'var(--text-muted)' }}>{t === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={openNewCat} style={{ fontSize: '12px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>+ Kategori Baru</button>
        </div>
        {showCatForm && (
          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
            <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, marginBottom: '10px' }} placeholder="Nama" />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {CATEGORY_ICONS.slice(0, 10).map(ic => <button key={ic} onClick={() => setCatForm(p => ({ ...p, icon: ic }))} style={{ fontSize: '18px', padding: '6px', background: catForm.icon === ic ? 'rgba(37,99,235,0.1)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{ic}</button>)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveCat} style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '12px' }}>Simpan</button>
              <button onClick={() => setShowCatForm(false)} style={{ padding: '6px 14px', background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '12px' }}>Batal</button>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {userCats.slice((catPage - 1) * CAT_PAGE_SIZE, catPage * CAT_PAGE_SIZE).map(c => (
            <div key={c.id} style={{ padding: '8px 10px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span>{c.icon}</span> <span style={{ flex: 1, fontWeight: '500' }}>{c.name}</span>
              <button onClick={() => openEditCat(c)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
            </div>
          ))}
        </div>
        {userCats.length > CAT_PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
            <button disabled={catPage === 1} onClick={() => setCatPage(p => p - 1)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', color: 'var(--text-main)' }}>‹</button>
            <span style={{ fontSize: '11px' }}>{catPage}/{Math.ceil(userCats.length / CAT_PAGE_SIZE)}</span>
            <button disabled={catPage >= Math.ceil(userCats.length / CAT_PAGE_SIZE)} onClick={() => setCatPage(p => p + 1)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', color: 'var(--text-main)' }}>›</button>
          </div>
        )}
      </Section>

      {/* ── GROUP 3: ADMINISTRASI & DATA ────────────────────────────── */}
      <h2 style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444', marginBottom: '12px', marginTop: '32px', letterSpacing: '0.1em' }}>ADMINISTRASI & DATA</h2>
      
      {(profile.role === 'owner' || profile.role === 'admin') && (
        <a href="/dashboard/settings/users" style={{ textDecoration: 'none' }}>
        <Section title="Manajemen User">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Kelola Anggota Keluarga</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tambah user atau ganti password admin</div>
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
          </div>
        </Section>
        </a>
      )}

      <div style={{ marginTop: '16px', border: `1px solid ${showDanger ? '#ef4444' : 'var(--border-color)'}`, borderRadius: '14px', padding: '20px', background: showDanger ? 'rgba(239,68,68,0.02)' : 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: '14px', fontWeight: '700', color: showDanger ? '#ef4444' : 'var(--text-main)' }}>☢️ Danger Zone</div> {showDanger && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hapus data bersifat permanen.</div>}</div>
          <button onClick={() => setShowDanger(!showDanger)} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: `1px solid ${showDanger ? 'var(--border-color)' : '#ef4444'}`, color: showDanger ? 'var(--text-muted)' : '#ef4444' }}>{showDanger ? 'Tutup' : 'Buka'}</button>
        </div>

        {showDanger && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '1px', background: 'rgba(239, 68, 68, 0.1)' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '13px', fontWeight: '600' }}>Hapus Transaksi</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bersihkan semua histori transaksi kamu</div></div>
              <button onClick={() => setConfirmResetTx(true)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Hapus</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '13px', fontWeight: '600' }}>Reset Kategori</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hapus semua kategori kustom yang Anda buat</div></div>
              <button onClick={() => setConfirmResetCat(true)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Reset</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Sign Out</button>
      </div>

      <ConfirmModal 
        open={confirmResetTx} 
        title="Hapus Semua Transaksi?" 
        message="Ini akan menghapus seluruh data transaksi Anda selamanya." 
        confirmLabel="Ya, Hapus Semua" 
        danger 
        onConfirm={resetAllTransactions} 
        onCancel={() => setConfirmResetTx(false)} 
      />

      <ConfirmModal 
        open={confirmResetCat} 
        title="Reset Kategori Kustom?" 
        message="Seluruh kategori yang Anda buat akan dihapus." 
        confirmLabel="Ya, Reset" 
        danger 
        onConfirm={resetCustomCategories} 
        onCancel={() => setConfirmResetCat(false)} 
      />

      <ConfirmModal 
        open={deletingCat !== null} 
        title="Hapus Kategori?" 
        message={`Yakin ingin menghapus ${deletingCat?.name}?`} 
        confirmLabel="Hapus" 
        danger 
        onConfirm={deleteCat} 
        onCancel={() => setDeletingCat(null)} 
      />
    </div>
  );
}
