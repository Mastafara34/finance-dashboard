// components/QuickAdd.tsx
// Tombol + floating di pojok kanan bawah untuk quick add transaksi dari halaman manapun
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Category { id: string; name: string; icon: string; type: string }

interface Props {
  userId: string;
  categories: Category[];
}

export default function QuickAdd({ userId, categories }: Props) {
  const supabase = createClient();
  const router    = useRouter();
  const searchParams = useSearchParams();
  const uParam = searchParams.get('u');
  const targetUserId = (uParam && uParam !== 'all') ? uParam : userId;

  const [open,    setOpen]    = useState(false);
  const [type,    setType]    = useState<'expense'|'income'>('expense');
  const [amount,  setAmount]  = useState(0);
  const [display, setDisplay] = useState('');
  const [note,    setNote]    = useState('');
  const [catId,   setCatId]   = useState('');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
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
      user_id:     targetUserId,
      category_id: finalCatId,
      type,
      amount,
      note:        note || null,
      source:      'web',
      date,
      created_at:  new Date().toISOString(),
    }]);

    setSaving(false);
    if (error) { showToast('Gagal menyimpan', false); return; }

    showToast('Transaksi tersimpan', true);
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
          width: 56px; height: 56px;
          background: var(--accent-primary);
          border-radius: 99px; border: none;
          color: var(--accent-primary-fg); font-size: 28px;
          cursor: pointer; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          transition: transform .2s cubic-bezier(0.16, 1, 0.3, 1), background .15s;
        }
        .qa-fab:hover { transform: scale(1.05); opacity: 0.9; }
        .qa-fab:active { transform: scale(0.95); }
        @media (min-width: 769px) {
          .qa-fab {
            bottom: 32px;
            right: 32px;
          }
        }
        .qa-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,.85);
          backdrop-filter: blur(4px);
          display: flex; align-items: flex-end;
          justify-content: center;
        }
        @media (min-width: 769px) {
          .qa-overlay { align-items: center; }
        }
        .qa-sheet {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 24px 24px 0 0;
          padding: 20px 24px calc(24px + env(safe-area-inset-bottom));
          width: 100%; max-width: 440px;
          animation: slideUp .3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 -20px 40px rgba(0,0,0,0.4);
        }
        @media (min-width: 769px) {
          .qa-sheet { border-radius: var(--radius-lg); padding: 32px; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '500',
          background: 'var(--bg-elevated)',
          border: `1px solid ${toast.ok ? 'var(--color-positive)' : 'var(--color-negative)'}`,
          color: toast.ok ? 'var(--color-positive)' : 'var(--color-negative)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap'
        }}>{toast.msg}</div>
      )}

      {/* FAB button */}
      <button className="qa-fab" onClick={() => setOpen(true)} title="Tambah Transaksi">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

      {/* Modal sheet */}
      {open && (
        <div className="qa-overlay" onClick={e => { if(e.target===e.currentTarget) setOpen(false); }}>
          <div className="qa-sheet">
            {/* Handle bar mobile */}
            <div style={{ width:'36px', height:'4px', background:'var(--border-color)', borderRadius:'99px', margin:'0 auto 20px' }} className="hidden md:hidden"/>

            {/* Title */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h3 style={{ color:'var(--text-main)', fontSize:'18px', fontWeight:'500', margin:0 }}>
                Tambah Transaksi
              </h3>
              <button onClick={() => setOpen(false)} style={{
                background:'none', border:'none', color:'var(--text-muted)',
                fontSize:'24px', cursor:'pointer', padding:'4px', opacity: 0.6
              }}>×</button>
            </div>

            {/* Type toggle */}
            <div style={{ display:'flex', gap:'4px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', padding:'4px', marginBottom:'24px' }}>
              {(['expense','income'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setCatId(''); }} style={{
                  flex:1, padding:'10px', borderRadius:'var(--radius-sm)', border:'none',
                  fontSize:'13px', fontWeight:'500', cursor:'pointer', transition:'all .2s',
                  background: type===t ? 'var(--card-bg)' : 'transparent',
                  color: type===t ? (t==='expense'?'var(--color-negative)':'var(--color-positive)') : 'var(--text-muted)',
                  boxShadow: type===t ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}>
                  {t==='expense' ? 'Pengeluaran' : 'Pemasukan'}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'8px' }}>
                Nominal <span style={{ color:'var(--color-negative)' }}>*</span>
              </label>
              <div style={{ position:'relative' }}>
                <span style={{
                  position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)',
                  fontSize:'16px', color:'var(--text-muted)', pointerEvents:'none', fontWeight: '500'
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
                    width:'100%', padding:'16px 16px 16px 48px',
                    background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                    borderRadius:'var(--radius-md)', color:'var(--text-main)',
                    fontSize:'24px', fontWeight:'600',
                    outline:'none', boxSizing:'border-box',
                    transition: 'border-color 0.15s'
                  }}
                />
              </div>
            </div>

            {/* Category & Note Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'8px' }}>
                  Kategori
                </label>
                  <SearchableSelect
                    value={catId}
                    onValueChange={(v) => v && setCatId(v)}
                    options={[
                      { value: 'none', label: '— pilih —' },
                      ...filteredCats.map(c => ({ value: c.id, label: c.name, icon: c.icon }))
                    ]}
                    placeholder="— pilih —"
                    searchPlaceholder="Cari kategori..."
                    style={{ height: '42px' }}
                  />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'8px' }}>
                  Tanggal
                </label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                  width:'100%', padding:'12px',
                  background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                  borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'14px',
                  outline:'none', boxSizing:'border-box', cursor:'pointer',
                }}
                  onFocus={e => e.target.style.borderColor='var(--accent-primary)'}
                  onBlur={e  => e.target.style.borderColor='var(--border-color)'}
                />
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom:'28px' }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'8px' }}>
                Catatan
              </label>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="cth: makan siang, bensin..."
                style={{
                  width:'100%', padding:'12px',
                  background:'var(--bg-secondary)', border:'1px solid var(--border-color)',
                  borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'14px',
                  outline:'none', boxSizing:'border-box', transition: 'border-color 0.15s'
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
                width:'100%', padding:'16px',
                background: saving||amount<=0 ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                border:'none', borderRadius:'var(--radius-md)',
                color: saving||amount<=0 ? 'var(--text-muted)' : 'var(--accent-primary-fg)',
                fontSize:'15px', fontWeight:'600',
                cursor: saving||amount<=0 ? 'not-allowed' : 'pointer',
                transition:'all .15s',
              }}
              onMouseEnter={e => { if(!saving && amount > 0) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { if(!saving && amount > 0) e.currentTarget.style.opacity = '1'; }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
