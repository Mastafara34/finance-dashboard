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
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)' }}>
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
  const [savingProfile,  setSavingProfile]  = useState(false);

  // ── Category state ────────────────────────────────────────────────────────
  const [cats,           setCats]           = useState<Category[]>(categories);
  const [catTab,         setCatTab]         = useState<'expense' | 'income'>('expense');
  const [showCatForm,    setShowCatForm]    = useState(false);
  const [editCat,        setEditCat]        = useState<Category | null>(null);
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

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  async function saveProfile() {
    setSavingProfile(true);
    
    const { error } = await supabase
      .from('users')
      .update({
        display_name:   displayName.trim() || null,
        monthly_income: monthlyIncome || null,
        timezone,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', profile.id);

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
    setNewPassword('');
    setConfirmPass('');
    showToast('Password berhasil diubah');
  }

  // ── Open cat form ─────────────────────────────────────────────────────────
  function openNewCat() {
    setEditCat(null);
    setCatForm({ name: '', icon: '📦', color: '#6b7280', type: catTab });
    setShowCatForm(true);
  }

  function openEditCat(cat: Category) {
    setEditCat(cat);
    setCatForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setShowCatForm(true);
  }

  // ── Save category ─────────────────────────────────────────────────────────
  async function saveCat() {
    if (!catForm.name.trim()) { showToast('Nama kategori wajib diisi', false); return; }
    setSavingCat(true);

    if (editCat?.id) {
      // Hanya boleh edit kategori milik user, bukan default sistem
      if (editCat.is_default) { showToast('Kategori sistem tidak bisa diedit', false); setSavingCat(false); return; }

      const { error } = await supabase.from('categories').update({
        name: catForm.name.trim(), icon: catForm.icon, color: catForm.color,
      }).eq('id', editCat.id);

      if (error) { showToast('Gagal menyimpan', false); setSavingCat(false); return; }
      setCats(prev => prev.map(c => c.id === editCat.id
        ? { ...c, name: catForm.name.trim(), icon: catForm.icon, color: catForm.color }
        : c));
      showToast('Kategori diperbarui');
    } else {
      const { data: newCat, error } = await supabase.from('categories').insert([{
        user_id:    profile.id,
        name:       catForm.name.trim(),
        icon:       catForm.icon,
        color:      catForm.color,
        type:       catForm.type,
        is_default: false,
        sort_order: 50,
      }]).select().single();

      if (error) { showToast('Gagal membuat kategori', false); setSavingCat(false); return; }
      setCats(prev => [...prev, newCat as unknown as Category]);
      showToast('Kategori ditambahkan');
    }

    setSavingCat(false);
    setShowCatForm(false);
    setEditCat(null);
  }

  // ── Delete category ───────────────────────────────────────────────────────
  async function deleteCat() {
    if (!deletingCat) return;
    if (deletingCat.is_default) { showToast('Kategori sistem tidak bisa dihapus', false); return; }

    const { error } = await supabase.from('categories').delete().eq('id', deletingCat.id);
    if (error) { showToast('Gagal menghapus', false); setDeletingCat(null); return; }
    setCats(prev => prev.filter(c => c.id !== deletingCat.id));
    setDeletingCat(null);
    showToast('Kategori dihapus');
  }

  // ── Reset functions ──────────────────────────────────────────────────────
  async function resetAllTransactions() {
    setReseting(true);
    const { error } = await supabase.from('transactions').update({ is_deleted: true }).eq('user_id', profile.id);
    setReseting(false);
    setConfirmResetTx(false);
    if (error) { showToast('Gagal reset transaksi', false); return; }
    showToast('Semua transaksi berhasil dihapus');
  }

  async function resetCustomCategories() {
    setReseting(true);
    const { error } = await supabase.from('categories').delete().eq('user_id', profile.id);
    setReseting(false);
    setConfirmResetCat(false);
    if (error) { showToast('Gagal reset kategori', false); return; }
    setCats(prev => prev.filter(c => c.is_default));
    showToast('Kategori kustom berhasil direset');
  }

  const filteredCats = cats.filter(c => c.type === catTab);
  const userCats     = filteredCats.filter(c => !c.is_default);
  const systemCats   = filteredCats.filter(c => c.is_default);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: 'var(--text-main)', fontFamily: '"DM Sans", system-ui, sans-serif', maxWidth: '720px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 200,
          padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          background: toast.ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${toast.ok ? 'rgba(22, 163, 74, 0.6)' : 'rgba(185, 28, 28, 0.6)'}`,
          color: toast.ok ? '#15803d' : '#b91c1c',
          boxShadow: '0 4px 20px rgba(15,23,42,.18)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Pengaturan
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
          Kelola profil, kategori, dan preferensi
        </p>
      </div>

      {/* ── 1. Profil ──────────────────────────────────────────────────────── */}
      <Section title="Profil" subtitle="Nama tampil dan informasi akun">
        <Field label="Nama tampil">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Nama kamu" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
          />
        </Field>

        <Field label="Email">
          <div style={{ ...inputStyle, color: '#6b7280', cursor: 'not-allowed' }}>
            {authEmail}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="Pemasukan bulanan (untuk analisis %)">
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '12px', color: '#6b7280', pointerEvents: 'none',
              }}>Rp</span>
              <input
                type="text" inputMode="numeric" value={incomeDisplay}
                placeholder="0"
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const num = parseInt(raw, 10) || 0;
                  setIncomeDisplay(num === 0 ? '' : num.toLocaleString('id-ID'));
                  setMonthlyIncome(num);
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#2563eb';
                  setIncomeDisplay(monthlyIncome === 0 ? '' : monthlyIncome.toString());
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#2a2a3a';
                  setIncomeDisplay(monthlyIncome === 0 ? '' : monthlyIncome.toLocaleString('id-ID'));
                }}
                style={{ ...inputStyle, paddingLeft: '32px' }}
              />
            </div>
            {monthlyIncome > 0 && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                {fmt(monthlyIncome)} / bulan
              </div>
            )}
          </Field>

          <Field label="Timezone">
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
            >
              <option value="Asia/Jakarta">WIB — Jakarta (UTC+7)</option>
              <option value="Asia/Makassar">WITA — Makassar (UTC+8)</option>
              <option value="Asia/Jayapura">WIT — Jayapura (UTC+9)</option>
            </select>
          </Field>
        </div>

        <button onClick={saveProfile} disabled={savingProfile} style={{
          padding: '10px 24px', background: savingProfile ? '#1f1f2e' : '#2563eb',
          border: 'none', borderRadius: '9px', color: '#fff',
          fontSize: '13px', fontWeight: '600',
          cursor: savingProfile ? 'not-allowed' : 'pointer',
        }}
          onMouseEnter={e => { if (!savingProfile) (e.currentTarget).style.background = '#1d4ed8'; }}
          onMouseLeave={e => { if (!savingProfile) (e.currentTarget).style.background = '#2563eb'; }}
        >
          {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </Section>

      {/* ── 2. Tampilan ───────────────────────────────────────────────────── */}
      <Section title="Tampilan" subtitle="Pilih tema aplikasi">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div 
            onClick={() => applyTheme('dark')}
            style={{
              padding: '16px', borderRadius: '12px', border: '2px solid',
              cursor: 'pointer', transition: 'all 0.2s',
              background: '#0a0a0f',
              borderColor: theme === 'dark' ? 'var(--accent-primary)' : '#1f1f2e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '18px' }}>🌙</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>Gelap</div>
              {theme === 'dark' && <div style={{ marginLeft: 'auto', color: '#2563eb' }}>✓</div>}
            </div>
            <div style={{ height: '40px', background: '#111118', borderRadius: '6px', border: '1px solid #1f1f2e' }} />
          </div>

          <div 
            onClick={() => applyTheme('light')}
            style={{
              padding: '16px', borderRadius: '12px', border: '2px solid',
              cursor: 'pointer', transition: 'all 0.2s',
              background: '#f8fafc',
              borderColor: theme === 'light' ? '#2563eb' : '#e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '18px' }}>☀️</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Terang</div>
              {theme === 'light' && <div style={{ marginLeft: 'auto', color: '#2563eb' }}>✓</div>}
            </div>
            <div style={{ height: '40px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
          </div>
        </div>
      </Section>

      {/* ── User Management Link (owner/admin only) ───────────────────── */}
      {(profile.role === 'owner' || profile.role === 'admin') && (
        <a href="/dashboard/settings/users" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: '14px', padding: '16px 20px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'border-color .15s', cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: '#0c1f3a', border: '1px solid #1e3a5f',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>👥</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Kelola User</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>
                  Tambah user, ubah role, kelola akses bot
                </div>
              </div>
            </div>
            <span style={{ color: '#374151', fontSize: '16px' }}>→</span>
          </div>
        </a>
      )}

      {/* ── 2. Koneksi Telegram ────────────────────────────────────────────── */}
      <Section
        title="Koneksi Telegram Bot"
        subtitle="Status koneksi antara akun web dan bot Telegram"
      >
        {profile.telegram_chat_id ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px',
            background: 'rgba(22, 163, 74, 0.08)',
            border: '1px solid rgba(22, 163, 74, 0.5)',
            borderRadius: '10px',
          }}>
            <div style={{ fontSize: '24px' }}>✅</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', marginBottom: '2px' }}>
                Bot sudah terhubung
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Chat ID: <code style={{ background: 'rgba(15, 118, 110, 0.06)', padding: '1px 6px',
                  borderRadius: '4px', color: '#166534' }}>{profile.telegram_chat_id}</code>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '14px 16px', background: '#1a1000',
              border: '1px solid #3d2a00', borderRadius: '10px', marginBottom: '14px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#fbbf24', marginBottom: '4px' }}>
                Bot belum terhubung
              </div>
              <div style={{ fontSize: '12px', color: '#6b5a2a', lineHeight: '1.6' }}>
                Tanpa koneksi bot, kamu tidak bisa input transaksi via Telegram.
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.8' }}>
              Cara menghubungkan:
              <ol style={{ marginTop: '8px', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <li>Buka Telegram, cari bot kamu</li>
                <li>Kirim pesan <code style={{ background: 'var(--card-bg)', padding: '1px 6px',
                  borderRadius: '4px', color: 'var(--accent-primary)' }}>/start</code></li>
                <li>Bot akan otomatis mendaftarkan akunmu</li>
                <li>Refresh halaman ini untuk melihat status</li>
              </ol>
            </div>
          </div>
        )}
      </Section>

      {/* ── 3. Kategori ───────────────────────────────────────────────────── */}
      <Section
        title="Manajemen Kategori"
        subtitle="Tambah dan kelola kategori transaksi kustom"
      >
        {/* Tab */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => setCatTab(t)} style={{
              padding: '7px 16px', borderRadius: '99px', border: '1px solid',
              fontSize: '12px', cursor: 'pointer', fontWeight: '500',
              borderColor: catTab === t ? '#2563eb' : '#2a2a3a',
              background: catTab === t ? '#0c1f3a' : 'transparent',
              color: catTab === t ? '#60a5fa' : '#6b7280',
            }}>
              {t === 'expense' ? '🔴 Pengeluaran' : '💚 Pemasukan'}
              <span style={{ marginLeft: '6px', fontSize: '11px', opacity: .7 }}>
                {cats.filter(c => c.type === t).length}
              </span>
            </button>
          ))}
          <button onClick={openNewCat} style={{
            marginLeft: 'auto', padding: '7px 14px',
            background: '#2563eb', border: 'none', borderRadius: '99px',
            color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget).style.background = '#1d4ed8'}
            onMouseLeave={e => (e.currentTarget).style.background = '#2563eb'}
          >+ Tambah</button>
        </div>

        {/* Category form inline */}
        {showCatForm && (
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: '10px', padding: '16px', marginBottom: '14px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '14px' }}>
              {editCat ? 'Edit Kategori' : 'Kategori Baru'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#6b7280',
                  fontWeight: '500', marginBottom: '5px' }}>Nama</label>
                <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="cth: Olahraga, Langganan"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
                />
              </div>
              {!editCat && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280',
                    fontWeight: '500', marginBottom: '5px' }}>Tipe</label>
                  <select value={catForm.type} onChange={e => setCatForm(p => ({ ...p, type: e.target.value as any }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>
              )}
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280',
                fontWeight: '500', marginBottom: '6px' }}>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {CATEGORY_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setCatForm(p => ({ ...p, icon: ic }))}
                    style={{
                      width: '34px', height: '34px', fontSize: '18px', borderRadius: '7px',
                      border: '1px solid', cursor: 'pointer',
                      borderColor: catForm.icon === ic ? 'var(--accent-primary)' : 'var(--border-color)',
                      background: catForm.icon === ic ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)',
                    }}>{ic}</button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280',
                fontWeight: '500', marginBottom: '6px' }}>Warna</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CATEGORY_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setCatForm(p => ({ ...p, color: c }))}
                    style={{
                      width: '28px', height: '28px', borderRadius: '99px', border: '2px solid',
                      background: c, cursor: 'pointer',
                      borderColor: catForm.color === c ? '#fff' : 'transparent',
                      outline: catForm.color === c ? `2px solid ${c}` : 'none',
                    }}/>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px', borderRadius: '8px', marginBottom: '14px',
              background: catForm.color + '22', border: `1px solid ${catForm.color}44`,
            }}>
              <span style={{ fontSize: '16px' }}>{catForm.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: catForm.color }}>
                {catForm.name || 'Preview'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveCat} disabled={savingCat} style={{
                padding: '8px 18px', background: savingCat ? 'var(--border-color)' : 'var(--accent-primary)',
                border: 'none', borderRadius: '8px', color: '#fff',
                fontSize: '13px', fontWeight: '600',
                cursor: savingCat ? 'not-allowed' : 'pointer',
              }}>
                {savingCat ? 'Menyimpan...' : editCat ? 'Simpan' : 'Tambah'}
              </button>
              <button onClick={() => { setShowCatForm(false); setEditCat(null); }} style={{
                padding: '8px 14px', background: 'transparent',
                border: '1px solid var(--border-color)', borderRadius: '8px',
                color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
              }}>Batal</button>
            </div>
          </div>
        )}

        {/* User categories */}
        {userCats.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500',
              marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Kategori kustom kamu ({userCats.length})
            </div>
            {userCats.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px',
                border: '1px solid var(--border-color)', marginBottom: '6px',
                background: 'var(--card-bg)',
              }}>
                <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{cat.name}</div>
                </div>
                <div style={{ width: '12px', height: '12px', borderRadius: '99px',
                  background: cat.color, flexShrink: 0 }}/>
                <button onClick={() => openEditCat(cat)} style={{
                  padding: '4px 10px', background: 'transparent',
                  border: '1px solid var(--border-color)', borderRadius: '6px',
                  color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--accent-primary)'; (e.currentTarget).style.color = 'var(--accent-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
                >Edit</button>
                <button onClick={() => setDeletingCat(cat)} style={{
                  padding: '4px 8px', background: 'transparent',
                  border: '1px solid var(--border-color)', borderRadius: '6px',
                  color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget).style.borderColor = '#b91c1c'; (e.currentTarget).style.color = '#b91c1c'; }}
                  onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* System categories - collapsed */}
        <details style={{ cursor: 'pointer' }}>
          <summary style={{
            fontSize: '12px', color: '#6b7280', fontWeight: '500',
            padding: '8px 0', userSelect: 'none', listStyle: 'none',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '10px' }}>▶</span>
            Kategori sistem ({systemCats.length}) — tidak bisa dihapus
          </summary>
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {systemCats.map(cat => (
              <div key={cat.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 10px', borderRadius: '99px',
                background: 'var(--bg-secondary)', fontSize: '12px', color: '#9ca3af',
              }}>
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </details>
      </Section>

      {/* ── 4. Keamanan ───────────────────────────────────────────────────── */}
      <Section title="Keamanan" subtitle="Ubah password akun">
        <Field label="Password baru">
          <input type="password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
          />
        </Field>
        <Field label="Konfirmasi password">
          <input type="password" value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            placeholder="Ulangi password baru"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
          />
        </Field>
        {newPassword && confirmPass && newPassword !== confirmPass && (
          <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '10px' }}>
            Password tidak cocok
          </div>
        )}
        <button
          onClick={changePassword}
          disabled={savingPass || !newPassword || newPassword !== confirmPass}
          style={{
            padding: '10px 24px', border: 'none', borderRadius: '9px',
            color: '#fff', fontSize: '13px', fontWeight: '600',
            background: savingPass || !newPassword || newPassword !== confirmPass
              ? '#1f1f2e' : '#2563eb',
            cursor: savingPass || !newPassword || newPassword !== confirmPass
              ? 'not-allowed' : 'pointer',
          }}
        >
          {savingPass ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </Section>

      {/* ── 5. Danger zone ────────────────────────────────────────────────── */}
      <div style={{
        marginTop: '32px',
        background: showDanger ? 'rgba(239, 68, 68, 0.02)' : 'var(--card-bg)',
        border: `1px solid ${showDanger ? '#ef4444' : 'var(--border-color)'}`,
        borderRadius: '16px', padding: '24px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: showDanger ? '0 10px 30px -10px rgba(239, 68, 68, 0.15)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDanger ? '16px' : '0' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: showDanger ? '#ef4444' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>☢️</span> Danger Zone
            </div>
            {showDanger && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan.
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowDanger(!showDanger)}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
              background: showDanger ? 'var(--bg-secondary)' : 'transparent',
              border: `1px solid ${showDanger ? 'var(--border-color)' : '#ef4444'}`,
              color: showDanger ? 'var(--text-muted)' : '#ef4444',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {showDanger ? 'Tutup' : 'Buka Akses'}
          </button>
        </div>

        {showDanger && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInDown 0.3s ease' }}>
            <div style={{ height: '1px', background: 'rgba(239, 68, 68, 0.1)', margin: '4px 0' }}></div>
            
            {/* Reset Transactions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.03)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Hapus Semua Transaksi</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Menghapus seluruh riwayat pemasukan dan pengeluaran kamu.</div>
              </div>
              <button onClick={() => setConfirmResetTx(true)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Hapus</button>
            </div>

            {/* Reset Categories */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.03)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Reset Kategori Kustom</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Menghapus semua kategori yang kamu buat dan kembali ke default.</div>
              </div>
              <button onClick={() => setConfirmResetCat(true)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reset</button>
            </div>

            {/* Global Sign Out */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.03)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Keluar dari Semua Perangkat</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mengakhiri sesi login di semua browser dan perangkat lain.</div>
              </div>
              <button onClick={() => setConfirmLogout(true)} style={{ padding: '6px 12px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Sign Out Global</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Danger Zone Modals ─────────────────────────────────────────────── */}
      <ConfirmModal 
        open={!!deletingCat}
        title="Hapus Kategori?"
        message={`Apakah kamu yakin ingin menghapus kategori "${deletingCat?.name}"? Transaksi dengan kategori ini tidak akan terhapus namun kategorinya akan menjadi kosong.`}
        confirmLabel="Ya, Hapus Kategori"
        danger={true}
        onConfirm={deleteCat}
        onCancel={() => setDeletingCat(null)}
      />

      <ConfirmModal 
        open={confirmResetTx}
        title="Hapus Semua Transaksi?"
        message="Tindakan ini akan menghapus permanen seluruh riwayat transaksi kamu. Data tidak dapat dipulihkan."
        confirmLabel={reseting ? 'Menghapus...' : 'Ya, Hapus Semua'}
        requireWord="HAPUS"
        onConfirm={resetAllTransactions}
        onCancel={() => setConfirmResetTx(false)}
      />

      <ConfirmModal 
        open={confirmResetCat}
        title="Reset Kategori Kustom?"
        message="Semua kategori yang kamu buat sendiri akan dihapus. Transaksi yang sudah ada akan tetap ada namun kategorinya menjadi kosong."
        confirmLabel={reseting ? 'Mereset...' : 'Ya, Reset Kategori'}
        requireWord="RESET"
        onConfirm={resetCustomCategories}
        onCancel={() => setConfirmResetCat(false)}
      />

      <ConfirmModal 
        open={confirmLogout}
        title="Sign Out Global?"
        message="Kamu akan dikeluarkan dari semua perangkat yang sedang login menggunakan akun ini."
        confirmLabel="Ya, Sign Out Global"
        danger={true}
        onConfirm={async () => {
          await supabase.auth.signOut({ scope: 'global' });
          window.location.href = '/login';
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
