// app/dashboard/settings/users/UsersClient.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ onSave, onClose }: {
  onSave: (chatId: number, displayName: string, role: Role) => Promise<void>;
  onClose: () => void;
}) {
  const [chatId,      setChatId]      = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role,        setRole]        = useState<Role>('user');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(chatId, 10);
    if (!id || isNaN(id)) { setError('Chat ID harus berupa angka'); return; }
    if (!displayName.trim()) { setError('Nama wajib diisi'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave(id, displayName.trim(), role);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: '#0a0a0f', border: '1px solid #2a2a3a',
    borderRadius: '8px', color: '#f0f0f5', fontSize: '16px',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#111118', border: '1px solid #1e3a5f',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h2 style={{ color: '#f0f0f5', fontSize: '17px', fontWeight: '600', margin: 0 }}>Tambah User Baru</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Chat ID */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '6px' }}>
              Telegram Chat ID <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text" inputMode="numeric" value={chatId}
              onChange={e => setChatId(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="cth: 123456789"
              style={inp}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
            />
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              Minta user kirim pesan ke @userinfobot di Telegram untuk dapat Chat ID
            </div>
          </div>

          {/* Display name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '6px' }}>
              Nama <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="cth: Istri, Anak, dll"
              style={inp}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e  => e.target.style.borderColor = '#2a2a3a'}
            />
          </div>

          {/* Role */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '8px' }}>
              Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['user', 'readonly', 'admin'] as Role[]).map(r => {
                const meta = ROLE_META[r];
                return (
                  <div key={r}
                    onClick={() => setRole(r)}
                    style={{
                      padding: '10px 14px', borderRadius: '9px', cursor: 'pointer',
                      border: `1px solid ${role === r ? meta.border : '#2a2a3a'}`,
                      background: role === r ? meta.bg : '#0a0a0f',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '99px',
                      background: role === r ? meta.color : '#374151', flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: role === r ? meta.color : '#f0f0f5' }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{meta.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UsersClient({ currentUserId, currentUserRole, users, whitelist }: Props) {
  const supabase = createClient();

  const [userList,  setUserList]  = useState<UserRow[]>(users);
  const [wlData,    setWlData]    = useState<WhitelistRow[]>(whitelist);
  const [showAdd,   setShowAdd]   = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loadingToggleId, setLoadingToggleId] = useState<string | null>(null);

  const whitelistMap = new Map(wlData.map(w => [w.chat_id, w]));

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Add user ──────────────────────────────────────────────────────────────
  async function handleAddUser(chatId: number, displayName: string, role: Role) {
    // 1. Cek apakah chat ID sudah ada
    const existing = userList.find(u => u.telegram_chat_id === chatId);
    if (existing) throw new Error(`Chat ID ${chatId} sudah terdaftar sebagai "${existing.display_name}"`);

    // 2. Insert ke tabel users
    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert([{
        telegram_chat_id: chatId,
        display_name: displayName,
        role,
        onboarded_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (userErr) throw new Error('Gagal tambah user: ' + userErr.message);

    // 3. Insert ke whitelist (untuk bot access)
    const { error: wlErr } = await supabase
      .from('whitelisted_users')
      .upsert([{
        chat_id: chatId,
        display_name: displayName,
        role,
        is_active: true,
      }], { onConflict: 'chat_id' });

    if (wlErr) throw new Error('Gagal tambah ke whitelist: ' + wlErr.message);

    const newWl: WhitelistRow = { chat_id: chatId, role, is_active: true };
    setWlData(prev => [...prev, newWl]);
    setUserList(prev => [...prev, newUser as unknown as UserRow]);
    setShowAdd(false);
    showToast(`User "${displayName}" berhasil ditambahkan`);
  }

  // ── Update role ───────────────────────────────────────────────────────────
  async function handleRoleChange(userId: string, newRole: Role) {
    // Proteksi: tidak bisa downgrade owner kecuali oleh owner lain
    const target = userList.find(u => u.id === userId);
    if (!target) return;
    if (target.role === 'owner' && currentUserRole !== 'owner') {
      showToast('Hanya owner yang bisa mengubah role owner lain', false);
      return;
    }
    // Proteksi: tidak bisa set role owner (harus manual via SQL)
    if (newRole === 'owner') {
      showToast('Role owner hanya bisa diset via database langsung', false);
      return;
    }

    setUpdatingId(userId);

    // Update di tabel users
    const { error: userErr } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (userErr) { showToast('Gagal update role', false); setUpdatingId(null); return; }

    // Sync ke whitelist kalau ada
    if (target.telegram_chat_id) {
      const chatId = target.telegram_chat_id;
      await supabase
        .from('whitelisted_users')
        .update({ role: newRole })
        .eq('chat_id', chatId);
      
      setWlData(prev => prev.map(w => w.chat_id === chatId ? { ...w, role: newRole } : w));
    }

    setUserList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setUpdatingId(null);
    showToast(`Role "${target.display_name ?? target.email}" diubah ke ${ROLE_META[newRole].label}`);
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

    // Update local state to reflect change immediately
    const updatedWl: WhitelistRow = { 
      chat_id: chatId, 
      role: target.role, 
      is_active: !currentActive 
    };
    setWlData(prev => {
      const filtered = prev.filter(w => w.chat_id !== chatId);
      return [...filtered, updatedWl];
    });

    setLoadingToggleId(null);
    showToast(!currentActive ? 'Akses bot diaktifkan' : 'Akses bot dinonaktifkan');
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
        }}>{toast.msg}</div>
      )}

      {showAdd && (
        <AddUserModal onSave={handleAddUser} onClose={() => setShowAdd(false)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px' }}>Kelola User</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            {userList.length} user terdaftar
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          padding: '9px 18px', background: '#2563eb', border: 'none',
          borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
        }}
          onMouseEnter={e => (e.currentTarget).style.background = '#1d4ed8'}
          onMouseLeave={e => (e.currentTarget).style.background = '#2563eb'}
        >+ Tambah User</button>
      </div>

      {/* Role legend */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
        padding: '12px 16px', background: '#111118',
        border: '1px solid #1f1f2e', borderRadius: '10px',
      }}>
        {(Object.entries(ROLE_META) as [Role, typeof ROLE_META[Role]][]).map(([role, meta]) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: meta.color }} />
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
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
          const canEdit   = !isMe && !(u.role === 'owner' && currentUserRole !== 'owner');

          return (
            <div key={u.id} style={{
              background: '#111118', border: '1px solid #1f1f2e',
              borderRadius: '12px', padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Avatar */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: meta.bg, border: `1px solid ${meta.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0, color: meta.color, fontWeight: '700',
                }}>
                  {(u.display_name ?? u.email ?? '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f5' }}>
                      {u.display_name ?? 'Tanpa nama'}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: '#0c1f3a', color: '#60a5fa', border: '1px solid #1e3a5f' }}>
                        Saya
                      </span>
                    )}
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontWeight: '500' }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                    {u.email ?? 'Belum ada email'}
                  </div>
                  {u.telegram_chat_id && (
                    <div style={{ fontSize: '11px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Telegram: {u.telegram_chat_id}</span>
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '99px',
                        background: botActive ? '#0f2d1a' : '#1a0a0a',
                        color: botActive ? '#4ade80' : '#f87171',
                        border: `1px solid ${botActive ? '#166534' : '#7f1d1d'}`,
                      }}>
                        Bot {botActive ? 'aktif' : 'nonaktif'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Role selector */}
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                      style={{
                        padding: '6px 10px', background: '#0a0a0f',
                        border: '1px solid #2a2a3a', borderRadius: '7px',
                        color: '#f0f0f5', fontSize: '12px', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="user">User</option>
                      <option value="readonly">Readonly</option>
                      <option value="admin">Admin</option>
                      {u.role === 'owner' && <option value="owner">Owner</option>}
                    </select>

                    {/* Toggle bot */}
                    {u.telegram_chat_id && (
                      <button
                        onClick={() => handleToggleBot(u.id, u.telegram_chat_id!, botActive)}
                        disabled={loadingToggleId === u.id}
                        style={{
                          padding: '6px 12px', background: botActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          border: `1px solid ${botActive ? '#ef4444' : '#10b981'}`,
                          borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                          color: botActive ? '#ef4444' : '#10b981',
                          cursor: loadingToggleId === u.id ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.2s ease',
                          opacity: loadingToggleId === u.id ? 0.6 : 1,
                        }}
                      >
                        {loadingToggleId === u.id ? (
                           <div style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        ) : null}
                        {botActive ? 'Nonaktifkan Bot' : 'Aktifkan Bot'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Info box */}
      <div style={{
        marginTop: '20px', padding: '14px 16px',
        background: '#0a0a0f', border: '1px solid #1f1f2e',
        borderRadius: '10px', fontSize: '12px', color: '#6b7280', lineHeight: '1.6',
      }}>
        💡 User yang ditambahkan di sini akan otomatis mendapat akses ke Telegram bot.
        Minta mereka kirim <code style={{ background: '#1f1f2e', padding: '1px 5px', borderRadius: '4px', color: '#60a5fa' }}>/start</code> ke bot untuk menyelesaikan setup.
        Data masing-masing user terisolasi — tidak bisa lihat data user lain.
      </div>
    </div>
  );
}
