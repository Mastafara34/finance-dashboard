// components/QuickAdd.tsx
// Tombol + floating di pojok kanan bawah untuk quick add transaksi dari halaman manapun
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Category { id: string; name: string; icon: string; type: string }

interface Props {
  userId: string;
  categories: Category[];
}

export default function QuickAdd({ userId, categories }: Props) {
  const supabase = createClient();
  const router    = useRouter();

  const [open,    setOpen]    = useState(false);
  const [type,    setType]    = useState<'expense'|'income'>('expense');
  const [amount,  setAmount]  = useState(0);
  const [display, setDisplay] = useState('');
  const [note,    setNote]    = useState('');
  const [catId,   setCatId]   = useState('');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<string|null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function resetForm() {
    setAmount(0); setDisplay(''); setNote(''); setCatId('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('expense');
  }

  async function handleSave() {
    if (!amount || amount <= 0) return;
    setSaving(true);

    // Cari atau buat kategori
    let finalCatId = catId || null;
    if (!finalCatId && note) {
      // Kalau tidak pilih kategori, pakai "Lain-lain"
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', 'Lain-lain')
        .eq('type', type)
        .maybeSingle();
      finalCatId = cat?.id ?? null;
    }

    const { error } = await supabase.from('transactions').insert([{
      user_id:     userId,
      category_id: finalCatId,
      type,
      amount,
      note:        note || null,
      source:      'web',
      date,
      created_at:  new Date().toISOString(),
    }]);

    setSaving(false);
    if (error) { showToast('Gagal menyimpan'); return; }

    showToast('✅ Transaksi tersimpan');
    resetForm();
    setOpen(false);

    // Refresh Server Component data tanpa full page reload
    router.refresh();
  }

  const filteredCats = categories.filter(c => c.type === type);

  return (
    <>
      <style>{`
        .qa-fab {
          position: fixed;
          bottom: calc(72px + env(safe-area-inset-bottom));
          right: 20px;
          width: 52px; height: 52px;
          background: #2563eb;
          border-radius: 99px; border: none;
          color: #fff; font-size: 24px;
          cursor: pointer; z-index: 80;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(37,99,235,.4);
          transition: transform .15s, background .15s;
        }
        .qa-fab:hover { transform: scale(1.08); background: #1d4ed8; }
        @media (min-width: 769px) {
          .qa-fab {
            bottom: 24px;
            right: 24px;
          }
        }
        .qa-overlay {
          position: fixed; inset: 0; z-index: 150;
          background: rgba(0,0,0,.7);
          display: flex; align-items: flex-end;
          justify-content: center;
        }
        @media (min-width: 769px) {
          .qa-overlay { align-items: center; }
        }
        .qa-sheet {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px 20px 0 0;
          padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
          width: 100%; max-width: 480px;
          animation: slideUp .2s ease;
          box-shadow: 0 -10px 25px -5px rgb(0 0 0 / 0.1);
        }
        @media (min-width: 769px) {
          .qa-sheet { border-radius: 16px; padding: 24px; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)',
          zIndex:999, padding:'10px 18px', borderRadius:'99px',
          background:'rgba(16, 185, 129, 0.1)', border:'1px solid rgba(16, 185, 129, 0.2)',
          color:'#10b981', fontSize:'13px', fontWeight:'500',
          whiteSpace:'nowrap', backdropFilter: 'blur(8px)',
          boxShadow: 'var(--card-shadow)',
        }}>{toast}</div>
      )}

      {/* FAB button */}
      <button className="qa-fab" onClick={() => setOpen(true)} title="Tambah transaksi">
        +
      </button>

      {/* Modal sheet */}
      {open && (
        <div className="qa-overlay" onClick={e => { if(e.target===e.currentTarget) setOpen(false); }}>
          <div className="qa-sheet">
            {/* Handle bar */}
            <div style={{ width:'36px', height:'4px', background:'var(--border-color)', borderRadius:'99px', margin:'0 auto 16px' }}/>

            {/* Title */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
              <h3 style={{ color:'var(--text-main)', fontSize:'16px', fontWeight:'600', margin:0 }}>
                Tambah Transaksi
              </h3>
              <button onClick={() => setOpen(false)} style={{
                background:'none', border:'none', color:'var(--text-muted)',
                fontSize:'20px', cursor:'pointer', padding:'0 4px',
              }}>×</button>
            </div>

            {/* Type toggle */}
            <div style={{ display:'flex', gap:'4px', background:'var(--bg-secondary)', borderRadius:'10px', padding:'4px', marginBottom:'16px' }}>
              {(['expense','income'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setCatId(''); }} style={{
                  flex:1, padding:'8px', borderRadius:'7px', border:'none',
                  fontSize:'14px', fontWeight:'500', cursor:'pointer', transition:'all .15s',
                  background: type===t ? (t==='expense'?'rgba(239, 68, 68, 0.1)':'rgba(16, 185, 129, 0.1)') : 'transparent',
                  color: type===t ? (t==='expense'?'#ef4444':'#10b981') : 'var(--text-muted)',
                }}>
                  {t==='expense' ? '🔴 Pengeluaran' : '💚 Pemasukan'}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'6px' }}>
                Nominal <span style={{ color:'#ef4444' }}>*</span>
              </label>
              <div style={{ position:'relative' }}>
                <span style={{
                  position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)',
                  fontSize:'14px', color:'var(--text-muted)', pointerEvents:'none',
                }}>Rp</span>
                <input
                  type="text" inputMode="numeric" value={display}
                  placeholder="0" autoFocus
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g,'');
                    const num = parseInt(raw,10)||0;
                    setDisplay(num===0?'':num.toLocaleString('id-ID'));
                    setAmount(num);
                  }}
                  onFocus={e => { e.target.style.borderColor='var(--accent-primary)'; setDisplay(amount===0?'':amount.toString()); }}
                  onBlur={e  => { e.target.style.borderColor='var(--border-color)'; setDisplay(amount===0?'':amount.toLocaleString('id-ID')); }}
                  style={{
                    width:'100%', padding:'12px 12px 12px 40px',
                    background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                    borderRadius:'10px', color:'var(--text-main)',
                    fontSize:'20px', fontWeight:'600',
                    outline:'none', boxSizing:'border-box',
                  }}
                />
              </div>
              {amount > 0 && (
                <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>
                  Rp {amount.toLocaleString('id-ID')}
                </div>
              )}
            </div>

            {/* Category */}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'6px' }}>
                Kategori
              </label>
              <select value={catId} onChange={e => setCatId(e.target.value)} style={{
                width:'100%', padding:'10px 12px',
                background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                borderRadius:'10px', color: catId?'var(--text-main)':'var(--text-muted)',
                fontSize:'16px', outline:'none', cursor:'pointer',
              }}>
                <option value="">— Pilih kategori —</option>
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'6px' }}>
                Catatan
              </label>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="cth: Makan siang, Bensin, Gaji..."
                style={{
                  width:'100%', padding:'10px 12px',
                  background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                  borderRadius:'10px', color:'var(--text-main)', fontSize:'16px',
                  outline:'none', boxSizing:'border-box',
                }}
                onFocus={e => e.target.style.borderColor='var(--accent-primary)'}
                onBlur={e  => e.target.style.borderColor='var(--border-color)'}
              />
            </div>

            {/* Date */}
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'6px' }}>
                Tanggal
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                width:'100%', padding:'10px 12px',
                background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                borderRadius:'10px', color:'var(--text-main)', fontSize:'16px',
                outline:'none', boxSizing:'border-box', cursor:'pointer',
              }}
                onFocus={e => e.target.style.borderColor='var(--accent-primary)'}
                onBlur={e  => e.target.style.borderColor='var(--border-color)'}
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || amount <= 0}
              style={{
                width:'100%', padding:'14px',
                background: saving||amount<=0 ? 'var(--border-color)' : 'var(--accent-primary)',
                border:'none', borderRadius:'10px',
                color: saving||amount<=0 ? 'var(--text-muted)' : '#fff',
                fontSize:'15px', fontWeight:'600',
                cursor: saving||amount<=0 ? 'not-allowed' : 'pointer',
                transition:'background .15s',
              }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
