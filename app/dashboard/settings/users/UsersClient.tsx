// app/dashboard/settings/users/UsersClient.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createAuthUser, updateAuthUser } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'owner' | 'admin' | 'user' | 'readonly';

interface UserRow {
  id: string;
  display_name: string | null;
  email: string | null;
  telegram_chat_id: number | null;
  role: Role;
  onboarded_at: string | null;
  created_at: string;
}

interface WhitelistRow {
  chat_id: number;
  role: Role;
  is_active: boolean;
}

interface Props {
  currentUserId: string;
  currentUserRole: 'owner' | 'admin';
  users: UserRow[];
  whitelist: WhitelistRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_META: Record<Role, { label: string; color: string; bg: string; border: string; desc: string }> = {
  owner:    { label: 'Owner',    color: 'var(--accent-primary)', bg: 'var(--bg-secondary)', border: 'var(--accent-primary)', desc: 'Akses penuh + kelola user' },
  admin:    { label: 'Admin',    color: 'var(--color-neutral)', bg: 'var(--bg-secondary)', border: 'var(--border-color)', desc: 'Akses penuh, tidak bisa hapus owner' },
  user:     { label: 'User',     color: 'var(--color-positive)', bg: 'var(--bg-secondary)', border: 'var(--color-positive)', desc: 'Input & lihat data sendiri' },
  readonly: { label: 'Readonly', color: 'var(--text-muted)', bg: 'var(--bg-secondary)', border: 'var(--border-color)', desc: 'Hanya bisa lihat, tidak bisa edit' },
};

const inpStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function RoleSelector({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(['user', 'readonly', 'admin'] as Role[]).map(r => {
        const meta = ROLE_META[r];
        const isActive = value === r;
        return (
          <div key={r} onClick={() => onChange(r)} style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            background: isActive ? 'var(--bg-secondary)' : 'transparent',
            display: 'flex', alignItems: 'center', gap: '12px',
            transition: 'all 0.15s'
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '99px', background: isActive ? meta.color : 'var(--border-color)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{meta.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{meta.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ onSave, onClose }: {
  onSave: (chatId: number | null, displayName: string, email: string, role: Role, password?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [chatId,      setChatId]      = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [role,        setRole]        = useState<Role>('user');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError('Nama wajib diisi'); return; }
    if (!chatId && !email.trim()) { setError('Isi minimal Chat ID Telegram atau Email'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Format email tidak valid'); return; }

    const numId = chatId ? parseInt(chatId, 10) : null;
    if (chatId && (isNaN(numId!) || numId! <= 0)) { setError('Chat ID harus berupa angka positif'); return; }

    setSaving(true); setError('');
    try {
      await onSave(numId, displayName.trim(), email.trim(), role, password.trim());
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', padding: '32px', width: '100%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '500', margin: '0 0 6px' }}>Tambah User Baru</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Isi minimal Chat ID atau Email</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer', lineHeight: 1, opacity: 0.6 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nama */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>
              Nama <span style={{ color: 'var(--color-negative)' }}>*</span>
            </label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="cth: athia, ananda, dll" style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>
              Email (untuk login Dashboard)
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="cth: athia@gmail.com"
              style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Wajib jika user ingin akses dashboard via web
            </div>
          </div>

          {/* Password (if email provided) */}
          {email.trim() && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '6px' }}>
                Password Dashboard
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                style={inpStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Password awal untuk user ini login di web
              </div>
            </div>
          )}

          {/* Chat ID */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '6px' }}>
              Telegram Chat ID (untuk akses bot)
            </label>
            <input type="text" inputMode="numeric" value={chatId}
              onChange={e => setChatId(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="cth: 123456789"
              style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Minta user kirim pesan ke @userinfobot di Telegram
            </div>
          </div>

          {/* Role */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>
              Role Akses
            </label>
            <RoleSelector value={role} onChange={setRole} />
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'var(--color-negative-bg)', border: '1px solid var(--color-negative)', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: 'var(--color-negative)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '11px', background: saving ? '#1f1f2e' : '#2563eb',
              border: 'none', borderRadius: '9px', color: '#fff',
              fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Menambahkan...' : 'Tambah User'}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', background: 'transparent',
              border: '1px solid #2a2a3a', borderRadius: '9px',
              color: '#9ca3af', fontSize: '14px', cursor: 'pointer',
            }}>Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onSave, onClose }: {
  user: UserRow;
  onSave: (userId: string, data: { display_name: string; email: string; telegram_chat_id: number | null; role: Role; password?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [email,       setEmail]       = useState(user.email ?? '');
  const [password,    setPassword]    = useState('');
  const [chatId,      setChatId]      = useState(user.telegram_chat_id?.toString() ?? '');
  const [role,        setRole]        = useState<Role>(user.role);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError('Nama wajib diisi'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Format email tidak valid'); return; }

    const numId = chatId ? parseInt(chatId, 10) : null;
    if (chatId && (isNaN(numId!) || numId! <= 0)) { setError('Chat ID harus berupa angka positif'); return; }

    setSaving(true); setError('');
    try {
      await onSave(user.id, {
        display_name: displayName.trim(),
        email: email.trim(),
        telegram_chat_id: numId,
        role,
        password: password.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', fontSize: '17px', fontWeight: '600', margin: '0 0 2px' }}>Edit User</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>{user.display_name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nama */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '6px' }}>
              Nama <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Nama user" style={inpStyle}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '6px' }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@gmail.com" style={inpStyle}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
          </div>

          {/* Password (optional update) */}
          {email.trim() && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '6px' }}>
                Reset Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Isi jika ingin ganti password" style={inpStyle}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Kosongkan jika tidak ingin mengubah password
              </div>
            </div>
          )}

          {/* Role — tidak bisa set ke owner */}
          {user.role !== 'owner' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>
                Role Akses
              </label>
              <RoleSelector value={role} onChange={setRole} />
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 12px', background: '#2d0f0f', border: '1px solid #7f1d1d', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '11px', background: saving ? '#1f1f2e' : '#166534',
              border: 'none', borderRadius: '9px', color: '#fff',
              fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', background: 'transparent',
              border: '1px solid var(--border-color)', borderRadius: '9px',
              color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer',
            }}>Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Card Component ──────────────────────────────────────────────────
function UserCard({
  u,
  isMe,
  canEdit,
  botActive,
  meta,
  loadingToggleId,
  onEdit,
  onToggleBot
}: {
  u: UserRow;
  isMe: boolean;
  canEdit: boolean;
  botActive: boolean;
  meta: typeof ROLE_META[Role];
  loadingToggleId: string | null;
  onEdit: (u: UserRow) => void;
  onToggleBot: (userId: string, chatId: number, currentActive: boolean) => void;
}) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: `1px solid ${isMe ? 'var(--accent-primary)' : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-lg)', padding: '24px',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      boxShadow: isMe ? '0 8px 32px rgba(0,0,0,0.15)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* Avatar */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px',
          background: meta.bg, border: `1px solid ${meta.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', flexShrink: 0, color: meta.color, fontWeight: '700',
        }}>
          {(u.display_name ?? u.email ?? '?')[0].toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-main)' }}>
              {u.display_name ?? 'tanpa nama'}
            </span>
            {isMe && (
              <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', fontWeight: '600' }}>
                Saya
              </span>
            )}
            <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: 'var(--radius-sm)', border: `1px solid ${meta.color}`, color: meta.color, fontWeight: '600' }}>
              {meta.label}
            </span>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {u.email?.toLowerCase() ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>belum ada email</span>}
          </div>

          {u.telegram_chat_id ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>📱 {u.telegram_chat_id}</span>
              <span style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '99px',
                background: botActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(185, 28, 28, 0.1)',
                color: botActive ? '#22c55e' : '#ef4444',
                border: `1px solid ${botActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(185, 28, 28, 0.2)'}`,
                fontWeight: '600',
              }}>
                Bot {botActive ? '✓ Aktif' : '✗ Nonaktif'}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Belum punya Telegram Chat ID
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          {canEdit && (
            <button
              onClick={() => onEdit(u)}
              style={{
                padding: '6px 12px', background: 'transparent',
                border: '1px solid var(--border-color)', borderRadius: '8px',
                color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              ✏️ Edit
            </button>
          )}

          {canEdit && u.telegram_chat_id && (
            <button
              onClick={() => onToggleBot(u.id, u.telegram_chat_id!, botActive)}
              disabled={loadingToggleId === u.id}
              style={{
                padding: '6px 12px',
                background: botActive ? '#2d0f0f' : '#0f2d1a',
                border: `1px solid ${botActive ? '#7f1d1d' : '#166534'}`,
                borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                color: botActive ? '#f87171' : '#4ade80',
                cursor: loadingToggleId === u.id ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.2s ease',
                opacity: loadingToggleId === u.id ? 0.6 : 1,
              }}
            >
              {loadingToggleId === u.id && (
                <div style={{ width: '11px', height: '11px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              )}
              {botActive ? 'Nonaktifkan' : 'Aktifkan'} Bot
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const DEMO_EMAIL = 'demo@fintrack.app';

export default function UsersClient({ currentUserId, currentUserRole, users, whitelist }: Props) {
  const supabase = createClient();

  const [userList,         setUserList]         = useState<UserRow[]>(users);
  const [wlData,           setWlData]           = useState<WhitelistRow[]>(whitelist);
  const [showAdd,          setShowAdd]          = useState(false);
  const [editingUser,      setEditingUser]      = useState<UserRow | null>(null);
  const [toast,            setToast]            = useState<{ msg: string; ok: boolean } | null>(null);
  const [updatingId,       setUpdatingId]       = useState<string | null>(null);
  const [loadingToggleId,  setLoadingToggleId]  = useState<string | null>(null);

  const whitelistMap = new Map(wlData.map(w => [w.chat_id, w]));

  const familyUsers = userList.filter(u => u.email !== DEMO_EMAIL);
  const demoUsers   = userList.filter(u => u.email === DEMO_EMAIL);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ... (rest of the logic remains the same)

  // ── Add user ──────────────────────────────────────────────────────────────
  async function handleAddUser(chatId: number | null, displayName: string, email: string, role: Role, password?: string) {
    if (chatId) {
      const existing = userList.find(u => u.telegram_chat_id === chatId);
      if (existing) throw new Error(`Chat ID ${chatId} sudah terdaftar sebagai "${existing.display_name}"`);
    }
    if (email) {
      const existing = userList.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) throw new Error(`Email ${email} sudah terdaftar sebagai "${existing.display_name}"`);
    }

    let authUserId: string | null = null;
    if (email && password) {
       const res = await createAuthUser(email, password);
       if (res.error) throw new Error('Gagal membuat Auth user: ' + res.error);
       authUserId = res.data?.id || null;
    }

    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert([{
        id: authUserId || undefined, // Gunakan ID auth jika dibuat
        telegram_chat_id: chatId,
        display_name: displayName,
        email: email || null,
        role,
        onboarded_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (userErr) throw new Error('Gagal tambah ke tabel users: ' + userErr.message);

    // Jika ada chat ID, tambahkan ke whitelist
    if (chatId) {
      const { error: wlErr } = await supabase
        .from('whitelisted_users')
        .upsert([{ chat_id: chatId, display_name: displayName, role, is_active: true }], { onConflict: 'chat_id' });
      if (wlErr) throw new Error('Gagal tambah ke whitelist: ' + wlErr.message);
      const newWl: WhitelistRow = { chat_id: chatId, role, is_active: true };
      setWlData(prev => [...prev, newWl]);
    }

    setUserList(prev => [...prev, newUser as unknown as UserRow]);
    setShowAdd(false);
    showToast(`User "${displayName}" berhasil ditambahkan` + (authUserId ? ' & Auth account created' : ''));
  }

  // ── Edit user ─────────────────────────────────────────────────────────────
  async function handleEditUser(userId: string, data: { display_name: string; email: string; telegram_chat_id: number | null; role: Role; password?: string }) {
    setUpdatingId(userId);
    const target = userList.find(u => u.id === userId);
    if (!target) return;

    // Check email uniqueness (ignore self)
    if (data.email) {
      const conflict = userList.find(u => u.id !== userId && u.email?.toLowerCase() === data.email.toLowerCase());
      if (conflict) throw new Error(`Email ${data.email} sudah dipakai "${conflict.display_name}"`);
    }

    // Update Auth user if password provided
    if (data.password) {
      const res = await updateAuthUser(userId, { password: data.password });
      if (res.error) { showToast('Gagal update Auth password: ' + res.error, false); setUpdatingId(null); return; }
    }

    const { error: userErr } = await supabase
      .from('users')
      .update({
        display_name: data.display_name,
        email: data.email || null,
        telegram_chat_id: data.telegram_chat_id,
        role: target.role === 'owner' ? 'owner' : data.role, // proteksi owner
      })
      .eq('id', userId);

    if (userErr) { showToast('Gagal edit tabel users: ' + userErr.message, false); setUpdatingId(null); return; }

    // Sync whitelist jika chat id berubah atau ada
    const newChatId = data.telegram_chat_id;
    if (newChatId) {
      const effectiveRole = target.role === 'owner' ? 'owner' : data.role;
      await supabase.from('whitelisted_users').upsert([{
        chat_id: newChatId, display_name: data.display_name, role: effectiveRole, is_active: true,
      }], { onConflict: 'chat_id' });

      // Remove old whitelist entry if chat id changed
      if (target.telegram_chat_id && target.telegram_chat_id !== newChatId) {
        await supabase.from('whitelisted_users').update({ is_active: false }).eq('chat_id', target.telegram_chat_id);
      }

      setWlData(prev => {
        const filtered = prev.filter(w => w.chat_id !== newChatId && w.chat_id !== target.telegram_chat_id);
        return [...filtered, { chat_id: newChatId, role: effectiveRole as Role, is_active: true }];
      });
    }

    setUserList(prev => prev.map(u => u.id === userId ? {
      ...u,
      display_name: data.display_name,
      email: data.email || null,
      telegram_chat_id: data.telegram_chat_id,
      role: target.role === 'owner' ? 'owner' : data.role,
    } : u));

    setUpdatingId(null);
    setEditingUser(null);
    showToast(`"${data.display_name}" diperbarui` + (data.password ? ' & password diubah' : ''));
  }

  // ── Toggle bot access ─────────────────────────────────────────────────────
  async function handleToggleBot(userId: string, chatId: number, currentActive: boolean) {
    const target = userList.find(u => u.id === userId);
    if (!target) return;

    setLoadingToggleId(userId);

    const { error } = await supabase
      .from('whitelisted_users')
      .upsert({
        chat_id: chatId,
        display_name: target.display_name || 'User',
        role: target.role,
        is_active: !currentActive,
      }, { onConflict: 'chat_id' });

    if (error) {
      showToast('Gagal update akses bot', false);
      setLoadingToggleId(null);
      return;
    }

    const updatedWl: WhitelistRow = { chat_id: chatId, role: target.role, is_active: !currentActive };
    setWlData(prev => [...prev.filter(w => w.chat_id !== chatId), updatedWl]);
    setLoadingToggleId(null);
    showToast(!currentActive ? '✅ Akses bot diaktifkan' : '🔴 Akses bot dinonaktifkan');
  }

  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif', maxWidth: '720px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 200,
          padding: '14px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '500',
          background: 'var(--bg-elevated)',
          border: `1px solid ${toast.ok ? 'var(--color-positive)' : 'var(--color-negative)'}`,
          color: toast.ok ? 'var(--color-positive)' : 'var(--color-negative)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>{toast.msg}</div>
      )}

      {showAdd && (
        <AddUserModal onSave={handleAddUser} onClose={() => setShowAdd(false)} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} onSave={handleEditUser} onClose={() => setEditingUser(null)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Kelola User</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {userList.length} user terdaftar
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '10px 20px', background: 'var(--accent-primary)', border: 'none',
          borderRadius: 'var(--radius-md)', color: 'var(--accent-primary-fg)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          transition: 'all 0.15s'
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >+ Tambah User</button>
      </div>

      {/* Role legend */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
        padding: '12px 16px', background: 'var(--card-bg)',
        border: '1px solid var(--border-color)', borderRadius: '10px',
      }}>
        {(Object.entries(ROLE_META) as [Role, typeof ROLE_META[Role]][]).map(([role, meta]) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: meta.color }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong style={{ color: meta.color }}>{meta.label}</strong>: {meta.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Family Section */}
        <section>
          <h2 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            AKUN KELUARGA <span style={{ padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>{familyUsers.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {familyUsers.map(u => (
              <UserCard
                key={u.id}
                u={u}
                isMe={u.id === currentUserId}
                canEdit={!(u.role === 'owner' && currentUserRole !== 'owner')}
                botActive={u.telegram_chat_id ? (whitelistMap.get(u.telegram_chat_id)?.is_active ?? false) : false}
                meta={ROLE_META[u.role]}
                loadingToggleId={loadingToggleId}
                onEdit={setEditingUser}
                onToggleBot={handleToggleBot}
              />
            ))}
            {familyUsers.length === 0 && (
              <div style={{ padding: '30px', textAlign: 'center', background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada anggota keluarga terdaftar.
              </div>
            )}
          </div>
        </section>

        {/* Demo Section */}
        {demoUsers.length > 0 && (
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b', marginBottom: '12px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎭 AKUN DEMO <span style={{ padding: '2px 6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px', fontSize: '10px' }}>{demoUsers.length}</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {demoUsers.map(u => (
                <UserCard
                  key={u.id}
                  u={u}
                  isMe={u.id === currentUserId}
                  canEdit={currentUserRole === 'owner'}
                  botActive={u.telegram_chat_id ? (whitelistMap.get(u.telegram_chat_id)?.is_active ?? false) : false}
                  meta={ROLE_META[u.role]}
                  loadingToggleId={loadingToggleId}
                  onEdit={setEditingUser}
                  onToggleBot={handleToggleBot}
                />
              ))}
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
                Note: Akun demo digunakan untuk presentasi dan instruksi awal.
              </div>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Info box */}
      <div style={{
        marginTop: '20px', padding: '14px 16px',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6',
      }}>
        💡 User baru yang ditambahkan dengan Chat ID akan otomatis mendapat akses bot Telegram.
        Minta mereka kirim <code style={{ background: 'var(--card-bg)', padding: '1px 5px', borderRadius: '4px', color: 'var(--accent-primary)' }}>/start</code> ke bot untuk menyelesaikan setup.
        Jika hanya isi Email, user bisa login ke dashboard tapi tidak bisa pakai bot sampai Chat ID ditambahkan.
      </div>
    </div>
  );
}
