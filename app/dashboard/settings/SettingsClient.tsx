// app/dashboard/settings/SettingsClient.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  telegram_chat_id: number | null;
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
      background: '#111118', border: '1px solid #1f1f2e',
      borderRadius: '14px', overflow: 'hidden', marginBottom: '16px',
    }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #1f1f2e' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f5' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{subtitle}</div>}
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
        display: 'block', fontSize: '12px', color: '#9ca3af',
        fontWeight: '500', marginBottom: '6px',
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: '#0a0a0f', border: '1px solid #2a2a3a',
  borderRadius: '8px', color: '#f0f0f5', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box',
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

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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
    showToast('Profil berhasil disimpan');
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
  async function deleteCat(cat: Category) {
    if (cat.is_default) { showToast('Kategori sistem tidak bisa dihapus', false); return; }
    if (!confirm(`Hapus kategori "${cat.name}"? Transaksi dengan kategori ini tidak akan terhapus.`)) return;

    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) { showToast('Gagal menghapus', false); return; }
    setCats(prev => prev.filter(c => c.id !== cat.id));
    showToast('Kategori dihapus');
  }

  const filteredCats = cats.filter(c => c.type === catTab);
  const userCats     = filteredCats.filter(c => !c.is_default);
  const systemCats   = filteredCats.filter(c => c.is_default);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif', maxWidth: '720px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 200,
          padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          background: toast.ok ? '#0f2d1a' : '#2d0f0f',
          border: `1px solid ${toast.ok ? '#166534' : '#7f1d1d'}`,
          color: toast.ok ? '#4ade80' : '#f87171',
          boxShadow: '0 4px 20px rgba(0,0,0,.4)',
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

      {/* ── 2. Koneksi Telegram ────────────────────────────────────────────── */}
      <Section
        title="Koneksi Telegram Bot"
        subtitle="Status koneksi antara akun web dan bot Telegram"
      >
        {profile.telegram_chat_id ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', background: '#0f2d1a',
            border: '1px solid #166534', borderRadius: '10px',
          }}>
            <div style={{ fontSize: '24px' }}>✅</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#4ade80', marginBottom: '2px' }}>
                Bot sudah terhubung
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Chat ID: <code style={{ background: '#0a1a0f', padding: '1px 6px',
                  borderRadius: '4px', color: '#4ade80' }}>{profile.telegram_chat_id}</code>
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
              <ol style={{ marginTop: '8px', paddingLeft: '18px', fontSize: '13px', color: '#9ca3af' }}>
                <li>Buka Telegram, cari bot kamu</li>
                <li>Kirim pesan <code style={{ background: '#1f1f2e', padding: '1px 6px',
                  borderRadius: '4px', color: '#60a5fa' }}>/start</code></li>
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
            background: '#0a0a0f', border: '1px solid #2a2a3a',
            borderRadius: '10px', padding: '16px', marginBottom: '14px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f5', marginBottom: '14px' }}>
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
                      borderColor: catForm.icon === ic ? '#2563eb' : '#2a2a3a',
                      background: catForm.icon === ic ? '#0c1f3a' : '#111118',
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
                padding: '8px 18px', background: savingCat ? '#1f1f2e' : '#2563eb',
                border: 'none', borderRadius: '8px', color: '#fff',
                fontSize: '13px', fontWeight: '600',
                cursor: savingCat ? 'not-allowed' : 'pointer',
              }}>
                {savingCat ? 'Menyimpan...' : editCat ? 'Simpan' : 'Tambah'}
              </button>
              <button onClick={() => { setShowCatForm(false); setEditCat(null); }} style={{
                padding: '8px 14px', background: 'transparent',
                border: '1px solid #2a2a3a', borderRadius: '8px',
                color: '#9ca3af', fontSize: '13px', cursor: 'pointer',
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
                border: '1px solid #2a2a3a', marginBottom: '6px',
                background: '#0a0a0f',
              }}>
                <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{cat.name}</div>
                </div>
                <div style={{ width: '12px', height: '12px', borderRadius: '99px',
                  background: cat.color, flexShrink: 0 }}/>
                <button onClick={() => openEditCat(cat)} style={{
                  padding: '4px 10px', background: 'transparent',
                  border: '1px solid #2a2a3a', borderRadius: '6px',
                  color: '#9ca3af', fontSize: '11px', cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget).style.borderColor = '#2563eb'; (e.currentTarget).style.color = '#60a5fa'; }}
                  onMouseLeave={e => { (e.currentTarget).style.borderColor = '#2a2a3a'; (e.currentTarget).style.color = '#9ca3af'; }}
                >Edit</button>
                <button onClick={() => deleteCat(cat)} style={{
                  padding: '4px 8px', background: 'transparent',
                  border: '1px solid #2a2a3a', borderRadius: '6px',
                  color: '#6b7280', fontSize: '11px', cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget).style.borderColor = '#7f1d1d'; (e.currentTarget).style.color = '#f87171'; }}
                  onMouseLeave={e => { (e.currentTarget).style.borderColor = '#2a2a3a'; (e.currentTarget).style.color = '#6b7280'; }}
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
                background: '#1f1f2e', fontSize: '12px', color: '#9ca3af',
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
        background: '#111118', border: '1px solid #3d1515',
        borderRadius: '14px', padding: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f87171', marginBottom: '4px' }}>
          Danger Zone
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px', lineHeight: '1.6' }}>
          Tindakan di bawah ini tidak dapat dibatalkan. Harap berhati-hati.
        </div>
        <button
          onClick={async () => {
            if (!confirm('Yakin ingin keluar dari semua perangkat?')) return;
            await supabase.auth.signOut({ scope: 'global' });
            window.location.href = '/login';
          }}
          style={{
            padding: '9px 18px', background: 'transparent',
            border: '1px solid #7f1d1d', borderRadius: '8px',
            color: '#f87171', fontSize: '13px', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget).style.background = '#2d0f0f'}
          onMouseLeave={e => (e.currentTarget).style.background = 'transparent'}
        >
          Keluar dari Semua Perangkat
        </button>
      </div>
    </div>
  );
}
