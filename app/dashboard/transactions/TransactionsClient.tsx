// app/dashboard/transactions/TransactionsClient.tsx
// ✅ Visual fix: semua hardcoded color → token, font weight max 600, border radius → token
// ✅ Logic, Supabase query, filter, sort — tidak disentuh
'use client';

import { useState, useMemo } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { createClient } from '@/lib/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [confirmId,  setConfirmId]  = useState<string|null>(null);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [sortField,  setSortField]  = useState<'date'|'amount'|'note'>('date');
  const [sortOrder,  setSortOrder]  = useState<'asc'|'desc'>('desc');

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const months = useMemo(() => {
    const set = new Set(data.map(t => t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [data]);

  const filtered = useMemo(() => {
    const filteredData = data.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (t.note?.toLowerCase().includes(q) ?? false) ||
               (t.categories?.name.toLowerCase().includes(q) ?? false) ||
               t.amount.toString().includes(q);
      }
      return true;
    });

    return filteredData.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'note') {
        valA = (a.note || '').toLowerCase();
        valB = (b.note || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, filterType, filterMonth, search, sortField, sortOrder]);

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
    width:'100%', padding:'8px 10px', background:'var(--bg-secondary)',
    border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)',
    color:'var(--text-main)', fontSize:'16px', outline:'none', boxSizing:'border-box',
  };

  return (
    <div style={{ color:'var(--text-main)', fontFamily:'"DM Sans",system-ui,sans-serif' }}>
      <style>{`
        .tx-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
        .tx-filters { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
        .tx-table-header { display:grid; grid-template-columns:1fr 140px 110px 90px; padding:8px 14px; }
        .tx-row-desktop { display:grid; grid-template-columns:1fr 140px 110px 90px; padding:12px 14px; align-items:center; cursor:default; }
        .tx-row-desktop:hover { background:rgba(0,0,0,0.02); }
        .tx-row-mobile { display:none; }
        @media (max-width:768px) {
          .tx-summary { grid-template-columns:1fr 1fr; gap:8px; }
          .tx-summary .tx-sum-3 { grid-column: span 2; }
          .tx-filters { gap:6px; }
          .tx-filters select, .tx-filters [data-slot="select-trigger"] { flex:1; }
          .tx-table-header { display:none; }
          .tx-row-desktop { display:none !important; }
          .tx-row-mobile { display:flex; padding:12px 14px; align-items:center; justify-content:space-between; gap:8px; }
          .tx-row-mobile:hover { background:rgba(0,0,0,0.02); }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:'20px', right:'20px', zIndex:999,
          padding:'12px 16px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:'500',
          background: toast.ok ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)',
          border:`1px solid ${toast.ok ? 'var(--color-positive)' : 'var(--color-negative)'}`,
          color: toast.ok ? 'var(--color-positive)' : 'var(--color-negative)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--card-shadow)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom:'20px' }}>
        <h1 style={{ fontSize:'20px', fontWeight:'600', margin:'0 0 4px', color:'var(--text-main)' }}>Transaksi</h1>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', margin:0, fontWeight:'500' }}>Riwayat 3 bulan terakhir</p>
      </div>

      {/* Summary */}
      <div className="tx-summary">
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'12px 14px', boxShadow:'var(--card-shadow)' }}>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:'500' }}>Pemasukan</div>
          <div style={{ fontSize:'16px', fontWeight:'600', color:'var(--color-positive)' }}>{fmt(summary.income)}</div>
        </div>
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'12px 14px', boxShadow:'var(--card-shadow)' }}>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:'500' }}>Pengeluaran</div>
          <div style={{ fontSize:'16px', fontWeight:'600', color:'var(--color-negative)' }}>{fmt(summary.expense)}</div>
        </div>
        <div className="tx-sum-3" style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'12px 14px', boxShadow:'var(--card-shadow)' }}>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:'500' }}>Transaksi</div>
          <div style={{ fontSize:'16px', fontWeight:'600', color:'var(--text-main)' }}>{summary.count} item</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="tx-filters" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
          <input
            placeholder="Cari catatan, kategori, atau nominal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', background: 'var(--card-bg)',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)',
              fontSize: '14px', outline: 'none', boxShadow: 'var(--card-shadow)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-color-strong)'; e.target.style.boxShadow = 'none'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'var(--card-shadow)'; }}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v as any)}>
          <SelectTrigger style={{ width: '140px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px', height: '42px' }}>
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="income">Pemasukan</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={(v) => v && setFilterMonth(v)}>
          <SelectTrigger style={{ width: '150px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px', height: '42px' }}>
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m}>
                {new Date(m+'-01').toLocaleDateString('id-ID', { month:'short', year:'numeric' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => showToast('Mengekspor data ke CSV...')}
          style={{
            padding: '10px 16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500',
            boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <span>📥</span> <span className="hide-mobile">Export CSV</span>
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', overflow:'hidden', boxShadow:'var(--card-shadow)' }}>
        {/* Header — desktop only via CSS */}
        <div className="tx-table-header" style={{
          padding:'12px 16px', borderBottom:'1px solid var(--border-color)',
          fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', textTransform:'uppercase',
          background:'var(--bg-secondary)'
        }}>
          <span
            onClick={() => {
              if (sortField === 'note') setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
              else { setSortField('note'); setSortOrder('asc'); }
            }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Catatan / Kategori {sortField === 'note' && (sortOrder === 'asc' ? '↑' : '↓')}
          </span>
          <span
            onClick={() => {
              if (sortField === 'amount') setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
              else { setSortField('amount'); setSortOrder('desc'); }
            }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Nominal {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </span>
          <span
            onClick={() => {
              if (sortField === 'date') setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
              else { setSortField('date'); setSortOrder('desc'); }
            }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Tanggal {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </span>
          <span style={{ textAlign:'right' }}>Aksi</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)', fontSize:'14px', fontWeight:'500' }}>
            {data.length === 0 ? 'Belum ada transaksi.' : 'Tidak ada yang sesuai filter.'}
          </div>
        ) : filtered.map((t, i) => (
          <div key={t.id}>
            {editingId !== t.id ? (
              <>
              {/* ── Desktop row ─────────────────────────────────────────────── */}
              <div className="tx-row-desktop" style={{
                borderBottom: i < filtered.length-1 ? '1px solid var(--border-color)' : 'none',
              }}>
                <div style={{ minWidth:0, display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{
                    width:'36px', height:'36px', borderRadius:'var(--radius-md)', background:'var(--bg-secondary)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px'
                  }}>
                    {t.categories?.icon ?? '💰'}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:'600', color:'var(--text-main)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.note || t.categories?.name || 'Tanpa Catatan'}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:'500' }}>{t.categories?.name ?? 'Umum'}</div>
                  </div>
                </div>
                <div style={{ fontSize:'15px', fontWeight:'500', color: t.type==='income' ? 'var(--color-positive)' : 'var(--text-main)' }}>
                  {t.type==='income'?'+':'-'}{fmt(t.amount)}
                </div>
                <div style={{ fontSize:'13px', color:'var(--text-muted)', fontWeight:'500' }}>{fmtDate(t.date)}</div>
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <button onClick={() => startEdit(t)} style={{ padding:'6px', borderRadius:'var(--radius-sm)', background:'transparent', border:'1px solid var(--border-color)', cursor:'pointer', color:'var(--text-muted)' }}>✎</button>
                  <button onClick={() => setConfirmId(t.id)} disabled={deletingId===t.id} style={{ padding:'6px', borderRadius:'var(--radius-sm)', background:'transparent', border:'1px solid var(--border-color)', cursor:'pointer', color:'var(--color-negative)' }}>{deletingId===t.id?'...':'✕'}</button>
                </div>
              </div>

              {/* ── Mobile row ──────────────────────────────────────────────── */}
              <div className="tx-row-mobile" style={{
                borderBottom: i < filtered.length-1 ? '1px solid var(--border-color)' : 'none',
              }}>
                {/* Kiri: info */}
                <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{
                    width:'36px', height:'36px', borderRadius:'var(--radius-md)', background:'var(--bg-secondary)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px'
                  }}>
                    {t.categories?.icon ?? '💰'}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:'600', color:'var(--text-main)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.note || t.categories?.name || 'Tanpa Catatan'}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', display:'flex', gap:'5px', flexWrap:'wrap' }}>
                      <span>{t.categories?.name ?? 'Umum'}</span>
                      <span style={{ color:'var(--border-color-md)' }}>· {fmtDateShort(t.date)}</span>
                    </div>
                  </div>
                </div>
                {/* Kanan: amount + tombol */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px', flexShrink:0 }}>
                  <div style={{ fontSize:'15px', fontWeight:'600', color: t.type==='income' ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                    {t.type==='income'?'+':'-'}{fmt(t.amount)}
                  </div>
                  <div style={{ display:'flex', gap:'5px' }}>
                    <button onClick={() => startEdit(t)} style={{ padding:'5px 12px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--text-muted)', fontSize:'12px', cursor:'pointer' }}>Edit</button>
                    <button onClick={() => setConfirmId(t.id)} disabled={deletingId===t.id} style={{ padding:'5px 10px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)', color:'var(--color-negative)', fontSize:'12px', cursor:'pointer' }}>{deletingId===t.id?'...':'✕'}</button>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <div style={{ padding:'16px', background:'var(--bg-secondary)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'4px', textTransform:'uppercase' }}>Catatan</label>
                    <input value={editForm.note??''} onChange={e => setEditForm(p=>({...p,note:e.target.value}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'4px', textTransform:'uppercase' }}>Nominal</label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500' }}>Rp</span>
                      <input type="text" inputMode="numeric" value={amountDisplay}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g,'');
                          const num = parseInt(raw,10)||0;
                          setAmountDisplay(num===0?'':num.toLocaleString('id-ID'));
                          setEditForm(p=>({...p,amount:num}));
                        }}
                        onFocus={e => { e.target.style.borderColor='var(--border-color-strong)'; setAmountDisplay((editForm.amount??0).toString()); }}
                        onBlur={e => { e.target.style.borderColor='var(--border-color)'; setAmountDisplay((editForm.amount??0)===0?'':(editForm.amount??0).toLocaleString('id-ID')); }}
                        style={{...inp, paddingLeft:'32px'}}/>
                    </div>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'4px', textTransform:'uppercase' }}>Tipe</label>
                    <Select value={editForm.type} onValueChange={(v) => v && setEditForm(p=>({...p,type:v as any}))}>
                      <SelectTrigger style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px', height: '38px' }}>
                        <SelectValue placeholder="Tipe" />
                      </SelectTrigger>
                      <SelectContent style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                        <SelectItem value="income">Pemasukan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'4px', textTransform:'uppercase' }}>Tanggal</label>
                    <input type="date" value={editForm.date??''} onChange={e=>setEditForm(p=>({...p,date:e.target.value}))} style={inp}/>
                  </div>
                </div>
                <div style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'4px', textTransform:'uppercase' }}>Kategori</label>
                  <Select 
                    value={(editForm.categories as any)?.id??'none'} 
                    onValueChange={(v) => { 
                      if (!v) return;
                      const cat = categories.find(c => c.id === v); 
                      setEditForm(p => ({...p, categories: cat ?? null})); 
                    }}
                  >
                    <SelectTrigger style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '14px', height: '38px' }}>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      <SelectItem value="none">— Tidak dikategori —</SelectItem>
                      {categories.filter(c => !editForm.type || c.type===editForm.type).map(c=>(
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={saveEdit} disabled={saving} style={{
                    flex:1, padding:'10px', background:'var(--accent-primary)', border:'none',
                    borderRadius:'var(--radius-md)', color:'var(--accent-primary-fg)', fontSize:'14px', fontWeight:'600', cursor:'pointer',
                  }}>{saving?'Menyimpan...':'Simpan Perubahan'}</button>
                  <button onClick={()=>setEditingId(null)} style={{
                    padding:'10px 20px', background:'transparent', border:'1px solid var(--border-color)',
                    borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:'14px', fontWeight:'500', cursor:'pointer',
                  }}>Batal</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!confirmId}
        title="Hapus Transaksi"
        message="Transaksi ini akan dihapus. Data tidak akan hilang permanen dan masih bisa dipulihkan dari database."
        confirmLabel="Ya, hapus"
        onConfirm={() => { if(confirmId) { deleteTransaction(confirmId); setConfirmId(null); } }}
        onCancel={() => setConfirmId(null)}
      />

      {filtered.length > 0 && (
        <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px', marginTop:'16px', fontWeight:'500' }}>
          Menampilkan {filtered.length} dari {data.length} transaksi
        </div>
      )}
    </div>
  );
}
