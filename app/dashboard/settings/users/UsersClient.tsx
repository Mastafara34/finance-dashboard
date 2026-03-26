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
  owner:    { label: 'Owner',    color: '#fbbf24', bg: '#1a1000', border: '#3d2a00', desc: 'Akses penuh + kelola user' },
  admin:    { label: 'Admin',    color: '#60a5fa', bg: '#0c1f3a', border: '#1e3a5f', desc: 'Akses penuh, tidak bisa hapus owner' },
  user:     { label: 'User',     color: '#4ade80', bg: '#0f2d1a', border: '#166534', desc: 'Input & lihat data sendiri' },
  readonly: { label: 'Readonly', color: '#9ca3af', bg: '#1f1f2e', border: '#2a2a3a', desc: 'Hanya bisa lihat, tidak bisa edit' },
};

const inpStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
  borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px',
  offset: 'none', boxSizing: 'border-box',
};

function RoleSelector({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(['user', 'readonly', 'admin'] as Role[]).map(r => {
        const meta = ROLE_META[r];
        return (
          <div key={r} onClick={() => onChange(r)} style={{
            padding: '10px 14px', borderRadius: '9px', cursor: 'pointer',
            border: `1px solid ${value === r ? meta.border : 'var(--border-color)'}`,
            background: value === r ? meta.bg : 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: value === r ? meta.color : 'var(--text-muted)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: value === r ? meta.color : 'var(--text-main)' }}>{meta.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{meta.desc}</div>
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
            <h2 style={{ color: 'var(--text-main)', fontSize: '17px', fontWeight: '600', margin: '0 0 2px' }}>Tambah User Baru</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Isi minimal Chat ID atau Email</p>
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
              placeholder="cth: Athia, Ananda, dll" style={inpStyle}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '6px' }}>
              Email (untuk login dashboard)
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="cth: athia@gmail.com"
              style={inpStyle}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
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
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
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
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'} />
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
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
            <div style={{ padding: '10px 12px', background: '#2d0f0f', border: '1px solid #7f1d1d', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#f87171' }}>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

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
          position: 'fixed', top: '20px', right: '20px', zIndex: 200,
          padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          background: toast.ok ? '#0f2d1a' : '#2d0f0f',
          border: `1px solid ${toast.ok ? '#166534' : '#7f1d1d'}`,
          color: toast.ok ? '#4ade80' : '#f87171',
          boxShadow: '0 4px 20px rgba(0,0,0,.4)',
          animation: 'slideIn 0.2s ease',
        }}>{toast.msg}</div>
      )}

      {showAdd && (
        <AddUserModal onSave={handleAddUser} onClose={() => setShowAdd(false)} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} onSave={handleEditUser} onClose={() => setEditingUser(null)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text-main)' }}>Kelola User</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            {userList.length} user terdaftar
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '9px 18px', background: '#2563eb', border: 'none',
          borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
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

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {userList.map(u => {
          const meta      = ROLE_META[u.role];
          const wlEntry   = u.telegram_chat_id ? whitelistMap.get(u.telegram_chat_id) : null;
          const botActive = wlEntry?.is_active ?? false;
          const isMe      = u.id === currentUserId;
          const canEdit   = !(u.role === 'owner' && currentUserRole !== 'owner');

          return (
            <div key={u.id} style={{
              background: 'var(--card-bg)', border: `1px solid ${isMe ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              borderRadius: '12px', padding: '16px 18px',
              transition: 'all 0.2s ease',
              boxShadow: isMe ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'var(--card-shadow)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {u.display_name ?? 'Tanpa nama'}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
                        Saya
                      </span>
                    )}
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontWeight: '500' }}>
                      {meta.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {u.email ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada email</span>}
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
                  {/* Edit button — visible for all except self-downgrade of owner */}
                  {canEdit && (
                    <button
                      onClick={() => setEditingUser(u)}
                      style={{
                        padding: '6px 12px', background: 'transparent',
                        border: '1px solid var(--border-color)', borderRadius: '8px',
                        color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      ✏️ Edit
                    </button>
                  )}

                  {/* Toggle bot — only if has telegram */}
                  {canEdit && u.telegram_chat_id && (
                    <button
                      onClick={() => handleToggleBot(u.id, u.telegram_chat_id!, botActive)}
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
                      {loadingToggleId === u.id ? (
                        <div style={{ width: '11px', height: '11px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      ) : null}
                      {botActive ? 'Nonaktifkan' : 'Aktifkan'} Bot
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
