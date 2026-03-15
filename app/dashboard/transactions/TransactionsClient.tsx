// app/dashboard/transactions/TransactionsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category { id: string; name: string; type: string; icon: string }
interface Transaction {
  id: string; amount: number; type: 'income'|'expense';
  note: string|null; date: string; source: string;
  categories: Category|null;
}
interface Props { transactions: Transaction[]; categories: Category[]; userId: string }

const fmt     = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short' });

export default function TransactionsClient({ transactions, categories, userId }: Props) {
  const supabase = createClient();
  const [data,       setData]       = useState<Transaction[]>(transactions);
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState<'all'|'income'|'expense'>('all');
  const [filterMonth,setFilterMonth]= useState('all');
  const [editingId,  setEditingId]  = useState<string|null>(null);
  const [editForm,   setEditForm]   = useState<Partial<Transaction>>({});
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [toast,      setToast]      = useState<{msg:string;ok:boolean}|null>(null);
  const [amountDisplay, setAmountDisplay] = useState('');

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const months = useMemo(() => {
    const set = new Set(data.map(t => t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [data]);

  const filtered = useMemo(() => data.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.note?.toLowerCase().includes(q) ?? false) ||
             (t.categories?.name.toLowerCase().includes(q) ?? false) ||
             t.amount.toString().includes(q);
    }
    return true;
  }), [data, filterType, filterMonth, search]);

  const summary = useMemo(() => ({
    income:  filtered.filter(t => t.type==='income').reduce((s,t) => s+t.amount, 0),
    expense: filtered.filter(t => t.type==='expense').reduce((s,t) => s+t.amount, 0),
    count:   filtered.length,
  }), [filtered]);

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setEditForm({ amount:t.amount, note:t.note??'', type:t.type, date:t.date, categories:t.categories });
    setAmountDisplay(t.amount.toLocaleString('id-ID'));
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    const cat = categories.find(c => c.id === (editForm.categories as any)?.id);
    const { error } = await supabase.from('transactions').update({
      amount: Number(editForm.amount), note: editForm.note,
      type: editForm.type, date: editForm.date, category_id: cat?.id ?? null,
    }).eq('id', editingId);
    setSaving(false);
    if (error) { showToast('Gagal menyimpan', false); return; }
    setData(prev => prev.map(t => t.id === editingId ? {
      ...t, amount: Number(editForm.amount), note: editForm.note??null,
      type: editForm.type as 'income'|'expense', date: editForm.date??t.date,
      categories: cat ? {id:cat.id,name:cat.name,type:cat.type,icon:cat.icon} : t.categories,
    } : t));
    setEditingId(null);
    showToast('Transaksi diperbarui');
  }

  async function deleteTransaction(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('transactions').update({ is_deleted:true }).eq('id', id);
    setDeletingId(null);
    if (error) { showToast('Gagal menghapus', false); return; }
    setData(prev => prev.filter(t => t.id !== id));
    showToast('Transaksi dihapus');
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'8px 10px', background:'#0a0a0f',
    border:'1px solid #2a2a3a', borderRadius:'7px', color:'#f0f0f5',
    fontSize:'16px', outline:'none', boxSizing:'border-box',
  };

  return (
    <div style={{ color:'#f0f0f5', fontFamily:'"DM Sans",system-ui,sans-serif' }}>
      <style>{`
        .tx-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
        .tx-filters { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
        .tx-table-header { display:grid; grid-template-columns:1fr 120px 90px 70px; }
        .tx-row { display:grid; grid-template-columns:1fr 120px 90px 70px; }
        @media (max-width:768px) {
          .tx-summary { grid-template-columns:1fr 1fr; gap:8px; }
          .tx-summary .tx-sum-3 { grid-column: span 2; }
          .tx-filters { gap:6px; }
          .tx-filters select { flex:1; }
          .tx-table-header { display:none; }
          .tx-row { grid-template-columns:1fr auto; gap:0; }
          .tx-row .tx-date { display:none; }
          .tx-row .tx-source { display:none; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:'20px', right:'20px', zIndex:999,
          padding:'12px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:'500',
          background: toast.ok ? '#0f2d1a' : '#2d0f0f',
          border:`1px solid ${toast.ok ? '#166534' : '#7f1d1d'}`,
          color: toast.ok ? '#4ade80' : '#f87171',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom:'20px' }}>
        <h1 style={{ fontSize:'20px', fontWeight:'600', margin:'0 0 4px' }}>Transaksi</h1>
        <p style={{ color:'#6b7280', fontSize:'13px', margin:0 }}>Riwayat 3 bulan terakhir</p>
      </div>

      {/* Summary */}
      <div className="tx-summary">
        <div style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'10px', padding:'12px 14px' }}>
          <div style={{ fontSize:'11px', color:'#6b7280', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.05em' }}>Pemasukan</div>
          <div style={{ fontSize:'15px', fontWeight:'700', color:'#4ade80' }}>{fmt(summary.income)}</div>
        </div>
        <div style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'10px', padding:'12px 14px' }}>
          <div style={{ fontSize:'11px', color:'#6b7280', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.05em' }}>Pengeluaran</div>
          <div style={{ fontSize:'15px', fontWeight:'700', color:'#f87171' }}>{fmt(summary.expense)}</div>
        </div>
        <div className="tx-sum-3" style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'10px', padding:'12px 14px' }}>
          <div style={{ fontSize:'11px', color:'#6b7280', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.05em' }}>Transaksi</div>
          <div style={{ fontSize:'15px', fontWeight:'700', color:'#9ca3af' }}>{summary.count} item</div>
        </div>
      </div>

      {/* Filters */}
      <div className="tx-filters">
        <input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:'140px', padding:'9px 12px', background:'#111118',
            border:'1px solid #1f1f2e', borderRadius:'8px', color:'#f0f0f5',
            fontSize:'16px', outline:'none' }}
          onFocus={e => e.target.style.borderColor='#2563eb'}
          onBlur={e  => e.target.style.borderColor='#1f1f2e'}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          style={{ padding:'9px 10px', background:'#111118', border:'1px solid #1f1f2e',
            borderRadius:'8px', color:'#f0f0f5', fontSize:'16px', outline:'none' }}>
          <option value="all">Semua</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ padding:'9px 10px', background:'#111118', border:'1px solid #1f1f2e',
            borderRadius:'8px', color:'#f0f0f5', fontSize:'16px', outline:'none' }}>
          <option value="all">Semua bulan</option>
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(m+'-01').toLocaleDateString('id-ID', { month:'long', year:'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'12px', overflow:'hidden' }}>
        {/* Header — desktop only via CSS */}
        <div className="tx-table-header" style={{
          padding:'10px 14px', borderBottom:'1px solid #1f1f2e',
          fontSize:'11px', color:'#6b7280', fontWeight:'500', textTransform:'uppercase',
        }}>
          <span>Catatan / Kategori</span>
          <span>Nominal</span>
          <span>Tanggal</span>
          <span style={{ textAlign:'right' }}>Aksi</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:'32px', textAlign:'center', color:'#6b7280', fontSize:'14px' }}>
            {data.length === 0 ? 'Belum ada transaksi.' : 'Tidak ada yang sesuai filter.'}
          </div>
        ) : filtered.map((t, i) => (
          <div key={t.id}>
            {editingId !== t.id ? (
              // ── Normal row ──────────────────────────────────────────────
              <div className="tx-row" style={{
                padding:'12px 14px', alignItems:'center',
                borderBottom: i < filtered.length-1 ? '1px solid #1a1a24' : 'none',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='#16161f'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}
              >
                {/* Col 1: Note + category */}
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'500',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {t.note || '-'}
                  </div>
                  <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span>{t.categories?.icon ?? ''} {t.categories?.name ?? 'Tidak dikategori'}</span>
                    {/* Tanggal di mobile tampil di sini */}
                    <span style={{ color:'#374151' }}>· {fmtDateShort(t.date)}</span>
                  </div>
                </div>

                {/* Col 2: Amount — desktop */}
                <div className="tx-amount-desktop" style={{
                  fontSize:'13px', fontWeight:'600',
                  color: t.type==='income' ? '#4ade80' : '#f87171',
                }}>
                  {t.type==='income' ? '+' : '-'}{fmt(t.amount)}
                </div>

                {/* Col 3: Date — desktop only */}
                <div className="tx-date" style={{ fontSize:'12px', color:'#9ca3af' }}>
                  {fmtDate(t.date)}
                </div>

                {/* Col 4: Actions — mobile: amount + actions stacked */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                  {/* Amount di mobile */}
                  <div style={{ fontSize:'13px', fontWeight:'700',
                    color: t.type==='income' ? '#4ade80' : '#f87171' }}>
                    {t.type==='income' ? '+' : '-'}{fmt(t.amount)}
                  </div>
                  <div style={{ display:'flex', gap:'4px' }}>
                    <button onClick={() => startEdit(t)} style={{
                      padding:'3px 8px', background:'transparent',
                      border:'1px solid #1f1f2e', borderRadius:'5px',
                      color:'#9ca3af', fontSize:'11px', cursor:'pointer',
                    }}>Edit</button>
                    <button onClick={() => { if(confirm('Hapus?')) deleteTransaction(t.id); }}
                      disabled={deletingId===t.id} style={{
                      padding:'3px 7px', background:'transparent',
                      border:'1px solid #1f1f2e', borderRadius:'5px',
                      color:'#6b7280', fontSize:'11px', cursor:'pointer',
                    }}>{deletingId===t.id ? '...' : '✕'}</button>
                  </div>
                </div>
              </div>
            ) : (
              // ── Edit row ─────────────────────────────────────────────────
              <div style={{ padding:'14px', borderBottom: i<filtered.length-1?'1px solid #1a1a24':'none', background:'#16161f' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'#6b7280', fontWeight:'500', marginBottom:'4px' }}>Catatan</label>
                    <input value={editForm.note??''} onChange={e => setEditForm(p=>({...p,note:e.target.value}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'#6b7280', fontWeight:'500', marginBottom:'4px' }}>Nominal</label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', color:'#6b7280' }}>Rp</span>
                      <input type="text" inputMode="numeric" value={amountDisplay}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g,'');
                          const num = parseInt(raw,10)||0;
                          setAmountDisplay(num===0?'':num.toLocaleString('id-ID'));
                          setEditForm(p=>({...p,amount:num}));
                        }}
                        onFocus={e => { e.target.style.borderColor='#2563eb'; setAmountDisplay((editForm.amount??0).toString()); }}
                        onBlur={e => { e.target.style.borderColor='#2a2a3a'; setAmountDisplay((editForm.amount??0)===0?'':(editForm.amount??0).toLocaleString('id-ID')); }}
                        style={{...inp, paddingLeft:'28px'}}/>
                    </div>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'#6b7280', fontWeight:'500', marginBottom:'4px' }}>Tipe</label>
                    <select value={editForm.type} onChange={e=>setEditForm(p=>({...p,type:e.target.value as any}))} style={{...inp,cursor:'pointer'}}>
                      <option value="expense">Pengeluaran</option>
                      <option value="income">Pemasukan</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'#6b7280', fontWeight:'500', marginBottom:'4px' }}>Tanggal</label>
                    <input type="date" value={editForm.date??''} onChange={e=>setEditForm(p=>({...p,date:e.target.value}))} style={inp}/>
                  </div>
                </div>
                <div style={{ marginBottom:'10px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'#6b7280', fontWeight:'500', marginBottom:'4px' }}>Kategori</label>
                  <select value={(editForm.categories as any)?.id??''}
                    onChange={e => { const cat=categories.find(c=>c.id===e.target.value); setEditForm(p=>({...p,categories:cat??null})); }}
                    style={{...inp,cursor:'pointer'}}>
                    <option value="">— Tidak dikategori —</option>
                    {categories.filter(c => !editForm.type || c.type===editForm.type).map(c=>(
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={saveEdit} disabled={saving} style={{
                    padding:'9px 18px', background:saving?'#1f1f2e':'#2563eb', border:'none',
                    borderRadius:'8px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer',
                  }}>{saving?'Menyimpan...':'Simpan'}</button>
                  <button onClick={()=>setEditingId(null)} style={{
                    padding:'9px 14px', background:'transparent', border:'1px solid #2a2a3a',
                    borderRadius:'8px', color:'#9ca3af', fontSize:'14px', cursor:'pointer',
                  }}>Batal</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ textAlign:'center', color:'#374151', fontSize:'12px', marginTop:'12px' }}>
          {filtered.length} dari {data.length} transaksi
        </div>
      )}
    </div>
  );
}
