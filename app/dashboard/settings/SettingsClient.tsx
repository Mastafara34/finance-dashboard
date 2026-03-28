// app/dashboard/settings/SettingsClient.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
  notify_budget_alert: boolean;
  notify_anomaly_alert: boolean;
  notify_forecast_alert: boolean;
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
      borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px',
      boxShadow: 'none'
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-main)', letterSpacing: '0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '400' }}>{subtitle}</div>}
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
        fontWeight: '500', marginBottom: '8px',
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
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
  const [notifyBudget,   setNotifyBudget]   = useState(profile.notify_budget_alert ?? true);
  const [notifyAnomaly,  setNotifyAnomaly]  = useState(profile.notify_anomaly_alert ?? true);
  const [notifyForecast, setNotifyForecast] = useState(profile.notify_forecast_alert ?? true);
  const [telegramId,     setTelegramId]     = useState(profile.telegram_chat_id?.toString() ?? '');
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
      notify_budget_alert: notifyBudget,
      notify_anomaly_alert: notifyAnomaly,
      notify_forecast_alert: notifyForecast,
      telegram_chat_id: telegramId ? parseInt(telegramId) : null,
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
          padding: '14px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '500', 
          background: 'var(--bg-elevated)', 
          border: `1px solid ${toast.ok ? 'var(--color-positive)' : 'var(--color-negative)'}`, 
          color: toast.ok ? 'var(--color-positive)' : 'var(--color-negative)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '18px' }}>{toast.ok ? '✅' : '❌'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 6px', letterSpacing: '-0.4px', color: 'var(--text-main)' }}>Pengaturan</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Kelola profil, tampilan, dan integrasi aplikasi</p>
      </div>

      {/* ── GROUP 1: AKUN & KEAMANAN ─────────────────────────────────── */}
      <h2 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em' }}>AKUN & KEAMANAN</h2>
      
      <Section title="Profil" subtitle="Informasi identitas akun kamu">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <Field label="Nama Lengkap">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
          </Field>
          <Field label="Email">
            <input value={authEmail} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <Field label="Pendapatan Bulanan">
            <input value={incomeDisplay} onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setIncomeDisplay(raw ? parseInt(raw).toLocaleString('id-ID') : ''); setMonthlyIncome(parseInt(raw) || 0); }} style={inputStyle} placeholder="cth: 5.000.000" onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
          </Field>
          <Field label="Zona Waktu">
            <SearchableSelect
              value={timezone}
              onValueChange={(v) => v && setTimezone(v)}
              options={[
                { value: 'Asia/Jakarta', label: 'WIB (UTC+7)' },
                { value: 'Asia/Makassar', label: 'WITA (UTC+8)' },
                { value: 'Asia/Jayapura', label: 'WIT (UTC+9)' }
              ]}
              style={{ width: '100%', height: '42px' }}
              placeholder="Pilih Zona Waktu"
            />
          </Field>
        </div>
        <button onClick={saveProfile} disabled={savingProfile} style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: 'var(--accent-primary-fg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: savingProfile ? 0.7 : 1 }}>
          {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
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
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
            {newPassword && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ 
                    height: '100%', width: `${(passStrength.score + 1) * 20}%`, 
                    background: passStrength.color, transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }}/>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: passStrength.color, letterSpacing: '0.02em' }}>
                  Kekuatan: {passStrength.label}
                </div>
              </div>
            )}
          </Field>
          <Field label="Konfirmasi Password">
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
            {confirmPass && newPassword !== confirmPass && (
              <div style={{ fontSize: '11px', color: 'var(--color-negative)', marginTop: '8px', fontWeight: '500' }}>⚠️ Password tidak cocok</div>
            )}
          </Field>
        </div>
        <button onClick={changePassword} disabled={savingPass || !newPassword || newPassword !== confirmPass} style={{ padding: '10px 24px', background: !newPassword || newPassword !== confirmPass ? 'var(--bg-secondary)' : 'var(--accent-primary)', color: 'var(--accent-primary-fg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: (savingPass || !newPassword || newPassword !== confirmPass) ? 0.7 : 1 }}>
          {savingPass ? 'Memproses...' : 'Ubah Password'}
        </button>
      </Section>

      <Section title="Notifikasi Telegram" subtitle="Aktifkan laporan otomatis ke akun Telegram">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[
            { id: 'weekly',   label: 'Laporan Mingguan', sub: 'Ringkasan performa setiap Sabtu pagi', value: notifyWeekly, set: setNotifyWeekly },
            { id: 'monthly',  label: 'Laporan Bulanan', sub: 'Tinjauan mendalam setiap tanggal 1', value: notifyMonthly, set: setNotifyMonthly },
            { id: 'ai',       label: 'Vonis Strategis AI', sub: 'Insight tajam tentang pola belanja Anda', value: notifyAi, set: setNotifyAi },
            { id: 'reminder', label: 'Pengingat Isi Transaksi', sub: 'Notifikasi jika tidak ada transaksi > 2 hari', value: notifyRemind, set: setNotifyRemind },
            { id: 'budget',   label: 'Peringatan Anggaran', sub: 'Instan jika budget kategori terpakai > 80%', value: notifyBudget, set: setNotifyBudget },
            { id: 'anomaly',  label: 'Deteksi Anomali Belanja', sub: 'Instan jika pengeluaran tidak wajar terdeteksi', value: notifyAnomaly, set: setNotifyAnomaly },
            { id: 'forecast', label: 'Prediksi Defisit (Forecast)', sub: 'Peringatan dini saldo minus di akhir bulan', value: notifyForecast, set: setNotifyForecast },
          ].map(opt => (
            <div key={opt.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap:'16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>{opt.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.sub}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={async (e) => {
                  const btn = e.currentTarget;
                    const old = btn.innerText; btn.innerText = 'Testing...';
                    btn.disabled = true;
                    const res = await fetch('/api/cron/test-report', { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: opt.id, chatId: telegramId ? parseInt(telegramId) : undefined }) 
                    });
                    btn.disabled = false;
                    if (res.ok) {
                      btn.innerText = 'Sukses ✅';
                    } else {
                      const err = await res.json().catch(() => ({}));
                      alert('Gagal: ' + (err.error || 'Unknown error'));
                      btn.innerText = 'Gagal ❌';
                    }
                    setTimeout(() => { btn.innerText = old; }, 3000);
                  }}
                  style={{ 
                    padding: '6px 12px', fontSize: '11px', fontWeight: '600', 
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                    color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  TEST
                </button>

                <div 
                  onClick={() => opt.set(!opt.value)}
                  style={{
                    width: '42px', height: '22px', borderRadius: '99px',
                    background: opt.value ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    border: `1px solid ${opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    position: 'relative', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '2px', left: opt.value ? '22px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px', letterSpacing: '0.05em' }}>🔗 LINK AKUN TELEGRAM</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={telegramId}
              placeholder="masukkan chat id anda..."
              onChange={(e) => setTelegramId(e.target.value.replace(/[^0-9-]/g, ''))}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Ketik <b style={{ color: 'var(--text-main)' }}>/id</b> ke bot Telegram Anda untuk melihat nomor ID Anda, lalu masukkan di sini.
          </div>
        </div>
        <button onClick={saveProfile} disabled={savingProfile} style={{ marginTop:'24px', padding: '10px 24px', background: 'var(--accent-primary)', color: 'var(--accent-primary-fg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          Simpan Pengaturan Notifikasi
        </button>
      </Section>

      {/* ── GROUP 2: APLIKASI & DATA ─────────────────────────────────── */}
      <h2 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '48px', letterSpacing: '0.05em' }}>APLIKASI & DATA</h2>

      <Section title="Mode Tampilan">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div onClick={() => applyTheme('dark')} style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: `1px solid ${theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-color)'}`, cursor: 'pointer', background: theme === 'dark' ? 'var(--bg-secondary)' : 'transparent', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: theme === 'dark' ? 'var(--text-main)' : 'var(--text-subtle)' }}>🌙 Dark Mode {theme === 'dark' && '✓'}</div>
          </div>
          <div onClick={() => applyTheme('light')} style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: `1px solid ${theme === 'light' ? 'var(--accent-primary)' : 'var(--border-color)'}`, cursor: 'pointer', background: theme === 'light' ? 'var(--bg-secondary)' : 'transparent', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: theme === 'light' ? 'var(--text-main)' : 'var(--text-subtle)' }}>☀️ Light Mode {theme === 'light' && '✓'}</div>
          </div>
        </div>
      </Section>

      <Section title="Kategori Transaksi" subtitle="Kelola kategori kustom kamu">
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => { setCatTab(t); setCatPage(1); }} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: catTab === t ? 'var(--card-bg)' : 'transparent', color: catTab === t ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'all 0.2s' }}>{t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
          <button onClick={openNewCat} style={{ fontSize: '12px', background: 'var(--bg-primary)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600' }}>+ Kategori Baru</button>
        </div>
        {showCatForm && (
          <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, marginBottom: '12px' }} placeholder="Nama Kategori" onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {CATEGORY_ICONS.slice(0, 10).map(ic => <button key={ic} onClick={() => setCatForm(p => ({ ...p, icon: ic }))} style={{ fontSize: '20px', padding: '8px', background: catForm.icon === ic ? 'var(--bg-secondary)' : 'transparent', border: `1px solid ${catForm.icon === ic ? 'var(--accent-primary)' : 'transparent'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.15s' }}>{ic}</button>)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveCat} style={{ padding: '8px 20px', background: 'var(--accent-primary)', color: 'var(--accent-primary-fg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Simpan</button>
              <button onClick={() => setShowCatForm(false)} style={{ padding: '8px 20px', background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {userCats.slice((catPage - 1) * CAT_PAGE_SIZE, catPage * CAT_PAGE_SIZE).map(c => (
            <div key={c.id} style={{ padding: '12px 14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', transition: 'border-color 0.15s' }}>
              <span style={{ fontSize: '18px' }}>{c.icon}</span> <span style={{ flex: 1, fontWeight: '500', color: 'var(--text-main)' }}>{c.name}</span>
              <button onClick={() => openEditCat(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
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
      <h2 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '48px', letterSpacing: '0.05em' }}>ADMINISTRASI & DATA</h2>
      
      {(profile.role === 'owner' || profile.role === 'admin') && (
        <a href="/dashboard/settings/users" style={{ textDecoration: 'none' }}>
        <Section title="Manajemen User">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>👥</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>Kelola Anggota Keluarga</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Tambah user atau ganti password admin</div>
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>→</span>
          </div>
        </Section>
        </a>
      )}

      <div style={{ marginTop: '16px', border: `1px solid ${showDanger ? 'var(--color-negative)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-lg)', padding: '24px', background: showDanger ? 'var(--color-negative-bg)' : 'var(--card-bg)', transition: 'all 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: '15px', fontWeight: '500', color: showDanger ? 'var(--color-negative)' : 'var(--text-main)' }}>☢️ Danger Zone</div> {showDanger && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Hapus data bersifat permanen.</div>}</div>
          <button onClick={() => setShowDanger(!showDanger)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '600', background: 'transparent', border: `1px solid ${showDanger ? 'var(--border-color)' : 'var(--color-negative)'}`, color: showDanger ? 'var(--text-muted)' : 'var(--color-negative)', cursor: 'pointer' }}>{showDanger ? 'Tutup' : 'Buka'}</button>
        </div>

        {showDanger && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '1px', background: 'rgba(239, 68, 68, 0.1)' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '13px', fontWeight: '600' }}>Hapus Transaksi</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bersihkan semua histori transaksi kamu</div></div>
              <button onClick={() => setConfirmResetTx(true)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-negative)', color: 'var(--color-negative)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Hapus</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '13px', fontWeight: '600' }}>Reset Kategori</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hapus semua kategori kustom yang Anda buat</div></div>
              <button onClick={() => setConfirmResetCat(true)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-negative)', color: 'var(--color-negative)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Reset</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '48px', textAlign: 'center' }}>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--color-negative)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.02em' }}>SIGN OUT</button>
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
