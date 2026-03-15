// app/dashboard/transactions/TransactionsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; type: string; icon: string }
interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  note: string | null;
  date: string;
  source: string;
  categories: Category | null;
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
  userId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function TransactionsClient({ transactions, categories, userId }: Props) {
  const supabase = createClient();

  const [data,        setData]        = useState<Transaction[]>(transactions);
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState<'all' | 'income' | 'expense'>('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editForm,    setEditForm]    = useState<Partial<Transaction>>({});
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Show toast ──────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Months available ─────────────────────────────────────────────────────
  const months = useMemo(() => {
    const set = new Set(data.map(t => t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [data]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return data.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false;
      if (search) {
        const q = search.toLowerCase();
        const inNote = t.note?.toLowerCase().includes(q) ?? false;
        const inCat  = t.categories?.name.toLowerCase().includes(q) ?? false;
        const inAmt  = t.amount.toString().includes(q);
        if (!inNote && !inCat && !inAmt) return false;
      }
      return true;
    });
  }, [data, filterType, filterMonth, search]);

  // ── Summary of filtered ───────────────────────────────────────────────────
  const summary = useMemo(() => ({
    income:  filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    count:   filtered.length,
  }), [filtered]);

  // ── Edit ──────────────────────────────────────────────────────────────────
  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setEditForm({ amount: t.amount, note: t.note ?? '', type: t.type,
      date: t.date, categories: t.categories });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);

    // Find category_id
    const cat = categories.find(c => c.id === (editForm.categories as any)?.id
      || c.name === (editForm.categories as any)?.name);

    const { error } = await supabase
      .from('transactions')
      .update({
        amount:      Number(editForm.amount),
        note:        editForm.note,
        type:        editForm.type,
        date:        editForm.date,
        category_id: cat?.id ?? null,
      })
      .eq('id', editingId);

    setSaving(false);

    if (error) { showToast('Gagal menyimpan: ' + error.message, false); return; }

    setData(prev => prev.map(t => t.id === editingId ? {
      ...t,
      amount:     Number(editForm.amount),
      note:       editForm.note ?? null,
      type:       editForm.type as 'income' | 'expense',
      date:       editForm.date ?? t.date,
      categories: cat ? { id: cat.id, name: cat.name, type: cat.type, icon: cat.icon } : t.categories,
    } : t));

    setEditingId(null);
    showToast('Transaksi diperbarui');
  }

  // ── Soft delete ───────────────────────────────────────────────────────────
  async function deleteTransaction(id: string) {
    setDeletingId(id);

    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true })
      .eq('id', id);

    setDeletingId(null);

    if (error) { showToast('Gagal menghapus: ' + error.message, false); return; }

    setData(prev => prev.filter(t => t.id !== id));
    showToast('Transaksi dihapus');
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 999,
          padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          background: toast.ok ? '#0f2d1a' : '#2d0f0f',
          border: `1px solid ${toast.ok ? '#166534' : '#7f1d1d'}`,
          color: toast.ok ? '#4ade80' : '#f87171',
          boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Transaksi
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
          Riwayat 3 bulan terakhir
        </p>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px',
      }}>
        {[
          { label: 'Pemasukan', value: fmt(summary.income), color: '#4ade80' },
          { label: 'Pengeluaran', value: fmt(summary.expense), color: '#f87171' },
          { label: 'Transaksi', value: `${summary.count} item`, color: '#9ca3af' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#111118', border: '1px solid #1f1f2e',
            borderRadius: '10px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px',
              textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <input
          placeholder="Cari transaksi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '180px', padding: '9px 14px',
            background: '#111118', border: '1px solid #1f1f2e',
            borderRadius: '8px', color: '#f0f0f5', fontSize: '13px', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#2563eb'}
          onBlur={e  => e.target.style.borderColor = '#1f1f2e'}
        />

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          style={{
            padding: '9px 12px', background: '#111118', border: '1px solid #1f1f2e',
            borderRadius: '8px', color: '#f0f0f5', fontSize: '13px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Semua tipe</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>

        {/* Month filter */}
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{
            padding: '9px 12px', background: '#111118', border: '1px solid #1f1f2e',
            borderRadius: '8px', color: '#f0f0f5', fontSize: '13px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Semua bulan</option>
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: '#111118', border: '1px solid #1f1f2e',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 140px 120px 90px 80px',
          padding: '10px 16px',
          borderBottom: '1px solid #1f1f2e',
          fontSize: '11px', color: '#6b7280', fontWeight: '500',
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          <span>Catatan / Kategori</span>
          <span>Nominal</span>
          <span>Tanggal</span>
          <span>Sumber</span>
          <span style={{ textAlign: 'right' }}>Aksi</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            {data.length === 0
              ? 'Belum ada transaksi. Kirim pesan ke bot untuk mulai mencatat.'
              : 'Tidak ada transaksi yang sesuai filter.'}
          </div>
        ) : (
          filtered.map((t, i) => (
            <div key={t.id}>
              {/* Normal row */}
              {editingId !== t.id ? (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 120px 90px 80px',
                  padding: '12px 16px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a1a24' : 'none',
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#16161f'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  {/* Note + category */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '500',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {t.note || '-'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {t.categories?.icon ?? ''} {t.categories?.name ?? 'Tidak dikategori'}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{
                    fontSize: '14px', fontWeight: '600',
                    color: t.type === 'income' ? '#4ade80' : '#f87171',
                  }}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {fmtDate(t.date)}
                  </div>

                  {/* Source badge */}
                  <div>
                    <span style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
                      background: t.source === 'bot' ? '#0c1f3a' : '#1a1000',
                      color: t.source === 'bot' ? '#60a5fa' : '#fbbf24',
                      border: `1px solid ${t.source === 'bot' ? '#1e3a5f' : '#3d2a00'}`,
                    }}>
                      {t.source}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => startEdit(t)}
                      style={{
                        padding: '4px 10px', background: 'transparent',
                        border: '1px solid #1f1f2e', borderRadius: '6px',
                        color: '#9ca3af', fontSize: '11px', cursor: 'pointer',
                      }}
                      onMouseEnter={e => { (e.currentTarget).style.borderColor = '#2563eb'; (e.currentTarget).style.color = '#60a5fa'; }}
                      onMouseLeave={e => { (e.currentTarget).style.borderColor = '#1f1f2e'; (e.currentTarget).style.color = '#9ca3af'; }}
                    >Edit</button>
                    <button
                      onClick={() => { if (confirm('Hapus transaksi ini?')) deleteTransaction(t.id); }}
                      disabled={deletingId === t.id}
                      style={{
                        padding: '4px 8px', background: 'transparent',
                        border: '1px solid #1f1f2e', borderRadius: '6px',
                        color: '#6b7280', fontSize: '11px', cursor: 'pointer',
                      }}
                      onMouseEnter={e => { (e.currentTarget).style.borderColor = '#7f1d1d'; (e.currentTarget).style.color = '#f87171'; }}
                      onMouseLeave={e => { (e.currentTarget).style.borderColor = '#1f1f2e'; (e.currentTarget).style.color = '#6b7280'; }}
                    >{deletingId === t.id ? '...' : '✕'}</button>
                  </div>
                </div>
              ) : (
                /* Edit row */
                <div style={{
                  padding: '14px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a1a24' : 'none',
                  background: '#16161f',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    {/* Note */}
                    <div>
                      <label style={lbl}>Catatan</label>
                      <input value={editForm.note ?? ''} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
                        style={inp} onFocus={e => e.target.style.borderColor = '#2563eb'}
                        onBlur={e => e.target.style.borderColor = '#2a2a3a'} />
                    </div>
                    {/* Amount */}
                    <div>
                      <label style={lbl}>Nominal</label>
                      <input type="number" value={editForm.amount ?? ''} onChange={e => setEditForm(p => ({ ...p, amount: Number(e.target.value) }))}
                        style={inp} onFocus={e => e.target.style.borderColor = '#2563eb'}
                        onBlur={e => e.target.style.borderColor = '#2a2a3a'} />
                    </div>
                    {/* Type */}
                    <div>
                      <label style={lbl}>Tipe</label>
                      <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value as any }))}
                        style={{ ...inp, cursor: 'pointer' }}>
                        <option value="expense">Pengeluaran</option>
                        <option value="income">Pemasukan</option>
                      </select>
                    </div>
                    {/* Date */}
                    <div>
                      <label style={lbl}>Tanggal</label>
                      <input type="date" value={editForm.date ?? ''} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                        style={inp} onFocus={e => e.target.style.borderColor = '#2563eb'}
                        onBlur={e => e.target.style.borderColor = '#2a2a3a'} />
                    </div>
                  </div>

                  {/* Category select */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={lbl}>Kategori</label>
                    <select
                      value={(editForm.categories as any)?.id ?? ''}
                      onChange={e => {
                        const cat = categories.find(c => c.id === e.target.value);
                        setEditForm(p => ({ ...p, categories: cat ?? null }));
                      }}
                      style={{ ...inp, cursor: 'pointer', width: '100%', maxWidth: '280px' }}
                    >
                      <option value="">— Tidak dikategori —</option>
                      {categories
                        .filter(c => editForm.type === 'all' || c.type === editForm.type)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Save / cancel */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={saveEdit} disabled={saving}
                      style={{
                        padding: '7px 18px', background: saving ? '#1f1f2e' : '#2563eb',
                        border: 'none', borderRadius: '7px', color: '#fff',
                        fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer',
                      }}>
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{
                        padding: '7px 14px', background: 'transparent',
                        border: '1px solid #2a2a3a', borderRadius: '7px',
                        color: '#9ca3af', fontSize: '13px', cursor: 'pointer',
                      }}>
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', color: '#374151', fontSize: '12px', marginTop: '14px' }}>
          Menampilkan {filtered.length} dari {data.length} transaksi
        </div>
      )}
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: '#0a0a0f', border: '1px solid #2a2a3a',
  borderRadius: '7px', color: '#f0f0f5',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: '#6b7280',
  fontWeight: '500', marginBottom: '5px',
};
