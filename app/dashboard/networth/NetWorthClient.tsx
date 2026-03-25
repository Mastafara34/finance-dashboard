// app/dashboard/networth/NetWorthClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Asset {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'vehicle' | 'receivable' | 'other';
  is_liability: boolean;
  value: number;
  institution: string | null;
  notes: string | null;
  last_updated: string;
}

type AssetType = Asset['type'];

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META: Record<AssetType, { label: string; icon: string; color: string }> = {
  cash:       { label: 'Kas & Tabungan',  icon: '🏦', color: '#2563eb' },
  investment: { label: 'Investasi',       icon: '📈', color: '#16a34a' },
  property:   { label: 'Properti',        icon: '🏠', color: '#d97706' },
  vehicle:    { label: 'Kendaraan',       icon: '🚗', color: '#7c3aed' },
  receivable: { label: 'Piutang',         icon: '🤝', color: '#0891b2' },
  other:      { label: 'Lainnya',         icon: '📦', color: '#6b7280' },
};

const ASSET_TYPES = Object.keys(TYPE_META) as AssetType[];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return n.toString();
};

// ─── Asset Form Modal ─────────────────────────────────────────────────────────
function AssetFormModal({
  asset, isLiability, onSave, onClose,
}: {
  asset: Asset | null;
  isLiability: boolean;
  onSave: (data: Partial<Asset>) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!asset?.id;
  const [form, setForm] = useState<Partial<Asset>>(asset ?? {
    name: '', type: 'cash', is_liability: isLiability,
    value: 0, institution: '', notes: '',
    last_updated: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [displayVal, setDisplayVal] = useState(
    asset?.value ? asset.value.toLocaleString('id-ID') : ''
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.value) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  };

  const accentColor = isLiability ? '#ef4444' : 'var(--accent-primary)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--card-bg)', border: `1px solid ${isLiability ? '#ef4444' : 'var(--accent-primary)'}`,
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '17px', fontWeight: '600', margin: 0 }}>
            {isEdit ? 'Edit' : 'Tambah'} {isLiability ? 'Liabilitas' : 'Aset'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Jenis</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {ASSET_TYPES.map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(p => ({ ...p, type: t }))}
                  style={{
                    padding: '8px 6px', borderRadius: '8px', border: '1px solid',
                    borderColor: form.type === t ? accentColor : 'var(--border-color)',
                    background: form.type === t ? (isLiability ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)') : 'var(--bg-secondary)',
                    color: form.type === t ? (isLiability ? '#ef4444' : 'var(--accent-primary)') : 'var(--text-muted)',
                    fontSize: '12px', cursor: 'pointer', textAlign: 'center',
                  }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{TYPE_META[t].icon}</div>
                  <div>{TYPE_META[t].label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Nama <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder={isLiability ? 'cth: KPR BCA, Hutang Motor' : 'cth: Tabungan BCA, Reksa Dana Bibit'}
              required style={inp}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Value */}
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Nilai (Rp) <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none',
              }}>Rp</span>
              <input
                type="text" inputMode="numeric" value={displayVal}
                placeholder="0" required
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const num = parseInt(raw, 10) || 0;
                  setDisplayVal(num === 0 ? '' : num.toLocaleString('id-ID'));
                  setForm(p => ({ ...p, value: num }));
                }}
                onFocus={e => {
                  e.target.style.borderColor = accentColor;
                  setDisplayVal((form.value ?? 0).toString() === '0' ? '' : (form.value ?? 0).toString());
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-color)';
                  setDisplayVal((form.value ?? 0) === 0 ? '' : (form.value ?? 0).toLocaleString('id-ID'));
                }}
                style={{ ...inp, paddingLeft: '32px' }}
              />
            </div>
            {(form.value ?? 0) > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {fmt(form.value ?? 0)}
              </div>
            )}
          </div>

          {/* Institution + Last updated */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Bank / Platform</label>
              <input value={form.institution ?? ''} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))}
                placeholder="cth: BCA, Bibit, OVO"
                style={inp}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
            <div>
              <label style={lbl}>Terakhir diupdate</label>
              <input type="date" value={form.last_updated ?? ''} onChange={e => setForm(p => ({ ...p, last_updated: e.target.value }))}
                style={inp}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Catatan (opsional)</label>
            <input value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Keterangan tambahan"
              style={inp}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '11px', border: 'none', borderRadius: '9px',
              color: '#fff', fontSize: '14px', fontWeight: '600',
              background: saving ? 'var(--border-color)' : accentColor,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
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

// ─── Asset row ────────────────────────────────────────────────────────────────
function AssetRow({ asset, onEdit, onDelete }: {
  asset: Asset;
  onEdit: (a: Asset) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[asset.type];
  const daysAgo = Math.floor((Date.now() - new Date(asset.last_updated).getTime()) / 86400000);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
      transition: 'background .1s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-primary)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      {/* Icon */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '9px', background: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', flexShrink: 0,
        border: '1px solid var(--border-color)',
      }}>{meta.icon}</div>

      {/* Name + institution */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {asset.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
          {meta.label}{asset.institution ? ` · ${asset.institution}` : ''}
        </div>
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: '600',
          color: asset.is_liability ? '#ef4444' : 'var(--text-main)',
        }}>
          {asset.is_liability ? '-' : ''}{fmt(asset.value)}
        </div>
        <div style={{ fontSize: '10px', color: daysAgo > 30 ? '#f59e0b' : 'var(--text-muted)', marginTop: '1px' }}>
          {daysAgo === 0 ? 'Hari ini' : daysAgo === 1 ? 'Kemarin' : `${daysAgo} hari lalu`}
          {daysAgo > 30 && ' ⚠️'}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button onClick={() => onEdit(asset)} style={{
          padding: '4px 10px', background: 'transparent',
          border: '1px solid var(--border-color)', borderRadius: '6px',
          color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
        }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--accent-primary)'; (e.currentTarget).style.color = 'var(--accent-primary)'; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
        >Edit</button>
        <button onClick={() => { if (confirm(`Hapus "${asset.name}"?`)) onDelete(asset.id); }} style={{
          padding: '4px 8px', background: 'transparent',
          border: '1px solid var(--border-color)', borderRadius: '6px',
          color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
        }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = '#ef4444'; (e.currentTarget).style.color = '#ef4444'; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
        >✕</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NetWorthClient({ initialAssets, userId }: {
  initialAssets: Asset[];
  userId: string;
}) {
  const supabase = createClient();

  const [assets,    setAssets]    = useState<Asset[]>(initialAssets);
  const [showForm,  setShowForm]  = useState(false);
  const [formLiab,  setFormLiab]  = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Kalkulasi ─────────────────────────────────────────────────────────────
  const asetList  = assets.filter(a => !a.is_liability);
  const liabList  = assets.filter(a => a.is_liability);
  const totalAset = asetList.reduce((s, a) => s + a.value, 0);
  const totalLiab = liabList.reduce((s, a) => s + a.value, 0);
  const netWorth  = totalAset - totalLiab;

  // Breakdown by type (aset saja)
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    asetList.forEach(a => {
      map[a.type] = (map[a.type] ?? 0) + a.value;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({
        type: type as AssetType,
        value,
        pct: totalAset > 0 ? Math.round((value / totalAset) * 100) : 0,
        meta: TYPE_META[type as AssetType],
      }));
  }, [asetList, totalAset]);

  // Stale assets (belum diupdate > 30 hari)
  const staleCount = assets.filter(a => {
    const days = Math.floor((Date.now() - new Date(a.last_updated).getTime()) / 86400000);
    return days > 30;
  }).length;

  // ── Save asset ────────────────────────────────────────────────────────────
  async function handleSave(data: Partial<Asset>) {
    if (editAsset?.id) {
      const { error } = await supabase.from('assets').update({
        name:         data.name,
        type:         data.type,
        value:        data.value,
        institution:  data.institution,
        notes:        data.notes,
        last_updated: data.last_updated,
      }).eq('id', editAsset.id);

      if (error) { showToast('Gagal menyimpan: ' + error.message, false); return; }
      setAssets(prev => prev.map(a => a.id === editAsset.id ? { ...a, ...data } as Asset : a));
      showToast('Aset diperbarui');
    } else {
      const { data: newAsset, error } = await supabase.from('assets').insert([{
        user_id:      userId,
        name:         data.name,
        type:         data.type ?? 'cash',
        is_liability: data.is_liability ?? formLiab,
        value:        data.value,
        institution:  data.institution || null,
        notes:        data.notes || null,
        last_updated: data.last_updated ?? new Date().toISOString().split('T')[0],
      }]).select().single();

      if (error) { showToast('Gagal menambah: ' + error.message, false); return; }
      setAssets(prev => [...prev, newAsset as unknown as Asset]);
      showToast(`${formLiab ? 'Liabilitas' : 'Aset'} ditambahkan`);
    }

    setShowForm(false);
    setEditAsset(null);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deletingAsset) return;
    const { error } = await supabase.from('assets').delete().eq('id', deletingAsset.id);
    if (error) { showToast('Gagal menghapus', false); setDeletingAsset(null); return; }
    setAssets(prev => prev.filter(a => a.id !== deletingAsset.id));
    setDeletingAsset(null);
    showToast('Dihapus');
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: 'var(--text-main)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 200,
          padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          background: toast.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${toast.ok ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: toast.ok ? '#10b981' : '#ef4444',
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--card-shadow)',
        }}>{toast.msg}</div>
      )}

      {/* Form modal */}
      {(showForm || editAsset) && (
        <AssetFormModal
          asset={editAsset}
          isLiability={editAsset ? editAsset.is_liability : formLiab}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditAsset(null); }}
        />
      )}

      <ConfirmModal 
        open={!!deletingAsset}
        title={`Hapus ${deletingAsset?.is_liability ? 'Liabilitas' : 'Aset'}?`}
        message={`Apakah kamu yakin ingin menghapus "${deletingAsset?.name}"?`}
        confirmLabel="Ya, Hapus"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAsset(null)}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Net Worth
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Kekayaan bersih = Total aset − Total liabilitas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setFormLiab(false); setShowForm(true); }} style={{
            padding: '9px 16px', background: 'var(--accent-primary)', border: 'none',
            borderRadius: '9px', color: '#fff', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget).style.background = '#1d4ed8'}
            onMouseLeave={e => (e.currentTarget).style.background = 'var(--accent-primary)'}
          >+ Aset</button>
          <button onClick={() => { setFormLiab(true); setShowForm(true); }} style={{
            padding: '9px 16px', background: 'transparent',
            border: '1px solid #ef4444', borderRadius: '9px',
            color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}
            onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(239, 68, 68, 0.05)'; }}
            onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
          >+ Liabilitas</button>
        </div>
      </div>

      {/* Stale warning */}
      {staleCount > 0 && (
        <div style={{
          padding: '12px 16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '10px', marginBottom: '16px', fontSize: '13px',
          color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          ⚠️ {staleCount} item belum diupdate lebih dari 30 hari — nilai mungkin sudah berubah.
        </div>
      )}

      {/* ── Net Worth hero ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card-bg)', border: `1px solid ${netWorth >= 0 ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.2)'}`,
        borderRadius: '14px', padding: '28px', marginBottom: '16px', textAlign: 'center',
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px',
          textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: '700' }}>
          Total Net Worth
        </div>
        <div style={{
          fontSize: '40px', fontWeight: '700', letterSpacing: '-1px',
          color: netWorth >= 0 ? '#10b981' : '#ef4444', marginBottom: '16px',
        }}>
          {netWorth < 0 ? '-' : ''}{fmt(Math.abs(netWorth))}
        </div>

        {/* Aset vs Liabilitas bar */}
        {(totalAset > 0 || totalLiab > 0) && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ height: '8px', borderRadius: '99px', overflow: 'hidden',
              background: '#ef4444', marginBottom: '12px' }}>
              <div style={{
                height: '100%', background: '#10b981',
                width: `${totalAset + totalLiab > 0 ? (totalAset / (totalAset + totalLiab)) * 100 : 0}%`,
                borderRadius: '99px', transition: 'width .6s ease',
              }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
                <span style={{ color: 'var(--text-muted)' }}>Aset</span>
                <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{fmtK(totalAset)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} />
                <span style={{ color: 'var(--text-muted)' }}>Liabilitas</span>
                <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{fmtK(totalLiab)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Asset breakdown + lists ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px' }}>

        {/* Breakdown by type */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '18px', boxShadow: 'var(--card-shadow)',
          height: 'fit-content',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px',
            textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Komposisi Aset
          </div>
          {byType.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              Belum ada aset
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {byType.map(({ type, value, pct, meta }) => (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '500' }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg-secondary)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px', width: `${pct}%`,
                      background: meta.color, transition: 'width .5s ease',
                    }}/>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {fmt(value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Asset + Liability lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Aset */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', 
            overflow: 'hidden', boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(16, 185, 129, 0.03)',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Aset ({asetList.length})
              </span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                {fmt(totalAset)}
              </span>
            </div>
            {asetList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada aset. Klik "+ Aset" untuk menambah.
              </div>
            ) : (
              asetList.map(a => (
                <AssetRow key={a.id} asset={a}
                  onEdit={a => setEditAsset(a)}
                  onDelete={() => setDeletingAsset(a)}
                />
              ))
            )}
          </div>

          {/* Liabilitas */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', 
            overflow: 'hidden', boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(239, 68, 68, 0.03)',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Liabilitas ({liabList.length})
              </span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
                {totalLiab > 0 ? `-${fmt(totalLiab)}` : fmt(0)}
              </span>
            </div>
            {liabList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Tidak ada liabilitas — bagus! 👍
              </div>
            ) : (
              liabList.map(a => (
                <AssetRow key={a.id} asset={a}
                  onEdit={a => setEditAsset(a)}
                  onDelete={() => setDeletingAsset(a)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: 'var(--text-muted)',
  fontWeight: '500', marginBottom: '6px',
};
