// app/dashboard/budgets/BudgetsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface Budget {
  id: string;
  limit_amount: number;
  month: string;
  categories: Category;
}

interface Props {
  initialBudgets: Budget[];
  prevMonthBudgets: { category_id: string, limit_amount: number }[];
  categories: Category[];
  spendMap: Record<string, number>;
  userId: string;
  month: string;
  userRole: string;
  initialTargets: {
    saving: number;
    wants: number;
    needs: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`;
  return n.toString();
};

function statusConfig(pct: number) {
  if (pct >= 100) return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', label: 'Melebihi limit' };
  if (pct >= 80)  return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', label: 'Hampir habis' };
  if (pct >= 50)  return { color: 'var(--accent-primary)', bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.2)', label: 'Setengah jalan' };
  return           { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', label: 'Aman' };
}

// ─── Envelope Card ────────────────────────────────────────────────────────────
function EnvelopeCard({
  budget, spent, onEdit, onDelete,
}: {
  budget: Budget;
  spent: number;
  onEdit: (b: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const pct   = budget.limit_amount > 0 ? Math.round((spent / budget.limit_amount) * 100) : 0;
  const sisa  = Math.max(budget.limit_amount - spent, 0);
  const sc    = statusConfig(pct);

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: `1px solid ${pct >= 80 ? sc.border : 'var(--border-color)'}`,
      borderRadius: '14px', padding: '20px',
      transition: 'all .2s',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: sc.bg, border: `1px solid ${sc.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          }}>
            {budget.categories?.icon ?? '📦'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
              {budget.categories?.name ?? 'Kategori'}
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: sc.color, fontWeight: '500' }}>
              {sc.label}
            </div>
          </div>
        </div>

        {/* Pct badge */}
        <div style={{
          padding: '4px 10px', borderRadius: '99px',
          background: sc.bg, border: `1px solid ${sc.border}`,
          fontSize: '13px', fontWeight: '700', color: sc.color,
        }}>
          {pct}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            width: `${Math.min(pct, 100)}%`,
            background: sc.color,
            transition: 'width .5s ease',
          }}/>
        </div>
      </div>

      {/* Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'Terpakai',  value: fmt(spent),               color: '#ef4444' },
          { label: 'Sisa',      value: fmt(sisa),                 color: sisa > 0 ? '#10b981' : '#ef4444' },
          { label: 'Limit',     value: fmt(budget.limit_amount),  color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px',
              textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: '700' }}>{s.label}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: s.color }}>
              {fmtK(parseFloat(s.value.replace(/[^0-9]/g, '')))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onEdit(budget)} style={{
          flex: 1, padding: '7px', background: 'transparent',
          border: '1px solid var(--border-color)', borderRadius: '8px',
          color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontWeight: '600'
        }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--accent-primary)'; (e.currentTarget).style.color = 'var(--accent-primary)'; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
        >Edit Limit</button>
        <button onClick={() => { if (confirm(`Hapus budget ${budget.categories?.name}?`)) onDelete(budget.id); }} style={{
          padding: '7px 12px', background: 'transparent',
          border: '1px solid var(--border-color)', borderRadius: '8px',
          color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
        }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = '#ef4444'; (e.currentTarget).style.color = '#ef4444'; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
        >✕</button>
      </div>
    </div>
  );
}

// ─── Budget Form Modal ────────────────────────────────────────────────────────
function BudgetFormModal({
  budget, categories, existingCatIds, month, onSave, onClose,
}: {
  budget: Budget | null;
  categories: Category[];
  existingCatIds: string[];
  month: string;
  onSave: (catId: string, limit: number) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!budget?.id;
  const [catId,      setCatId]      = useState(budget?.categories?.id ?? '');
  const [limit,      setLimit]      = useState(budget?.limit_amount ?? 0);
  const [displayVal, setDisplayVal] = useState(
    budget?.limit_amount ? budget.limit_amount.toLocaleString('id-ID') : ''
  );
  const [saving, setSaving] = useState(false);

  // Filter out already-budgeted categories (kecuali yang sedang diedit)
  const available = categories.filter(c =>
    !existingCatIds.includes(c.id) || c.id === budget?.categories?.id
  );

  const monthLabel = new Date(month + '-01').toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catId || limit <= 0) return;
    setSaving(true);
    await onSave(catId, limit);
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px',
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', fontSize: '17px', fontWeight: '600', margin: '0 0 2px' }}>
              {isEdit ? 'Edit Budget' : 'Set Budget Baru'}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{monthLabel}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category */}
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Kategori <span style={{ color: '#ef4444' }}>*</span></label>
            {isEdit ? (
              <div style={{
                ...inp, display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'not-allowed', opacity: 0.6,
              }}>
                <span>{budget?.categories?.icon}</span>
                <span>{budget?.categories?.name}</span>
              </div>
            ) : (
              <select value={catId} onChange={e => setCatId(e.target.value)} required
                style={{ ...inp, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
              >
                <option value="">— Pilih kategori —</option>
                {available.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Limit */}
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Limit per bulan <span style={{ color: '#ef4444' }}>*</span></label>
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
                  setLimit(num);
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--accent-primary)';
                  setDisplayVal(limit === 0 ? '' : limit.toString());
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-color)';
                  setDisplayVal(limit === 0 ? '' : limit.toLocaleString('id-ID'));
                }}
                style={{ ...inp, paddingLeft: '32px' }}
              />
            </div>
            {limit > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {fmt(limit)} per bulan
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving || !catId || limit <= 0} style={{
              flex: 1, padding: '11px', border: 'none', borderRadius: '9px',
              color: '#fff', fontSize: '14px', fontWeight: '600',
              background: saving || !catId || limit <= 0 ? 'var(--border-color)' : 'var(--accent-primary)',
              cursor: saving || !catId || limit <= 0 ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Set Budget'}
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
export default function BudgetsClient({
  initialBudgets, prevMonthBudgets, categories, spendMap, userId, month, userRole, initialTargets
}: Props) {
  const supabase = createClient();

  const [budgets,    setBudgets]    = useState<Budget[]>(initialBudgets);
  const [showForm,   setShowForm]   = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [isCopying,  setIsCopying]  = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  // Targets state
  const [targets, setTargets] = useState(initialTargets);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [targetSaving, setTargetSaving] = useState(initialTargets.saving);
  const [targetWants, setTargetWants] = useState(initialTargets.wants);
  const [targetNeeds, setTargetNeeds] = useState(initialTargets.needs);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  const canEditTargets = userRole === 'owner' || userRole === 'admin';

  async function handleCopyLastMonth() {
    if (prevMonthBudgets.length === 0) {
      showToast('Tidak ada data budget bulan lalu', false);
      return;
    }
    
    setIsCopying(true);
    const existingIds = budgets.map(b => b.categories?.id);
    const toCopy = prevMonthBudgets.filter(pb => !existingIds.includes(pb.category_id));

    if (toCopy.length === 0) {
      showToast('Semua budget sudah ada', false);
      setIsCopying(false);
      return;
    }

    const newEntries = toCopy.map(pb => ({
      user_id: userId,
      category_id: pb.category_id,
      month,
      limit_amount: pb.limit_amount
    }));

    const { data: inserted, error } = await supabase
      .from('monthly_budgets')
      .insert(newEntries)
      .select('id, limit_amount, month, categories(id, name, icon, type)');

    if (error) {
      showToast('Gagal menyalin budget', false);
    } else {
      setBudgets(prev => [...prev, ...(inserted as unknown as Budget[])]);
      showToast(`Berhasil menyalin ${inserted.length} budget`);
    }
    setIsCopying(false);
  }

  async function handleSaveTargets() {
    if (!canEditTargets) return;
    setIsSavingTargets(true);
    const { error } = await supabase
      .from('users')
      .update({
        saving_target: targetSaving,
        wants_target: targetWants,
        needs_target: targetNeeds,
      })
      .eq('id', userId);

    if (error) {
      showToast('Gagal update target', false);
    } else {
      setTargets({ saving: targetSaving, wants: targetWants, needs: targetNeeds });
      setIsEditingTargets(false);
      showToast('Target finansial diperbarui');
    }
    setIsSavingTargets(false);
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Kalkulasi summary ─────────────────────────────────────────────────────
  const totalLimit = budgets.reduce((s, b) => s + b.limit_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spendMap[b.categories?.id] ?? 0), 0);
  const overBudget = budgets.filter(b => {
    const spent = spendMap[b.categories?.id] ?? 0;
    return spent >= b.limit_amount;
  });
  const nearLimit  = budgets.filter(b => {
    const spent = spendMap[b.categories?.id] ?? 0;
    const pct   = b.limit_amount > 0 ? spent / b.limit_amount : 0;
    return pct >= 0.8 && pct < 1;
  });

  const existingCatIds = budgets.map(b => b.categories?.id).filter(Boolean);

  const monthLabel = new Date(month + '-01').toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });

  // ── Sort: over budget dulu, lalu near limit, lalu sisanya ─────────────────
  const sorted = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const pctA = a.limit_amount > 0 ? (spendMap[a.categories?.id] ?? 0) / a.limit_amount : 0;
      const pctB = b.limit_amount > 0 ? (spendMap[b.categories?.id] ?? 0) / b.limit_amount : 0;
      return pctB - pctA;
    });
  }, [budgets, spendMap]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(catId: string, limit: number) {
    if (editBudget?.id) {
      const { error } = await supabase.from('monthly_budgets')
        .update({ limit_amount: limit })
        .eq('id', editBudget.id);

      if (error) { showToast('Gagal menyimpan', false); return; }
      setBudgets(prev => prev.map(b =>
        b.id === editBudget.id ? { ...b, limit_amount: limit } : b
      ));
      showToast('Budget diperbarui');
    } else {
      const { data: newBudget, error } = await supabase.from('monthly_budgets').insert([{
        user_id:      userId,
        category_id:  catId,
        month,
        limit_amount: limit,
      }]).select('id, limit_amount, month, categories(id, name, icon, type)').single();

      if (error) { showToast('Gagal membuat budget', false); return; }
      setBudgets(prev => [...prev, newBudget as unknown as Budget]);
      showToast('Budget berhasil ditambahkan');
    }

    setShowForm(false);
    setEditBudget(null);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deletingBudget) return;
    const { error } = await supabase.from('monthly_budgets').delete().eq('id', deletingBudget.id);
    if (error) { showToast('Gagal menghapus', false); setDeletingBudget(null); return; }
    setBudgets(prev => prev.filter(b => b.id !== deletingBudget.id));
    setDeletingBudget(null);
    showToast('Budget dihapus');
  }

  // ─────────────────────────────────────────────────────────────────────────
  const lbl = { display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' };
  const inp = { width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none' };

  return (
    <div style={{ color: 'var(--text-main)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 200,
          padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          background: toast.ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${toast.ok ? 'rgba(22, 163, 74, 0.6)' : 'rgba(185, 28, 28, 0.6)'}`,
          color: toast.ok ? '#15803d' : '#b91c1c',
          boxShadow: '0 4px 20px rgba(15,23,42,.18)',
        }}>{toast.msg}</div>
      )}

      {/* Modal */}
      {(showForm || editBudget) && (
        <BudgetFormModal
          budget={editBudget}
          categories={categories}
          existingCatIds={existingCatIds as string[]}
          month={month}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditBudget(null); }}
        />
      )}

      <ConfirmModal 
        open={!!deletingBudget}
        title="Hapus Budget?"
        message={`Apakah kamu yakin ingin menghapus budget untuk kategori "${deletingBudget?.categories?.name}"?`}
        confirmLabel="Ya, Hapus"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeletingBudget(null)}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Budget
          </h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            Amplop digital — {monthLabel}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {budgets.length === 0 && prevMonthBudgets.length > 0 && (
            <button 
              onClick={handleCopyLastMonth} 
              disabled={isCopying}
              style={{
                padding: '9px 18px', background: '#1f1f2e', border: '1px solid #2a2a3a',
                borderRadius: '9px', color: '#4ade80', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {isCopying ? 'Menyalin...' : '📋 Salin Bulan Lalu'}
            </button>
          )}
          {canEditTargets && (
            <button onClick={() => setIsEditingTargets(true)} style={{
              padding: '9px 18px', background: 'transparent', border: '1px solid #2a2a3a',
              borderRadius: '9px', color: '#9ca3af', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
            }}>⚙️ Target</button>
          )}
          <button onClick={() => setShowForm(true)}
            disabled={categories.length === existingCatIds.length}
            style={{
              padding: '9px 18px', border: 'none', borderRadius: '9px',
              color: '#fff', fontSize: '13px', fontWeight: '600',
              background: categories.length === existingCatIds.length ? '#1f1f2e' : '#2563eb',
              cursor: categories.length === existingCatIds.length ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (categories.length !== existingCatIds.length) (e.currentTarget).style.background = '#1d4ed8'; }}
            onMouseLeave={e => { if (categories.length !== existingCatIds.length) (e.currentTarget).style.background = '#2563eb'; }}
          >+ Set Budget</button>
        </div>
      </div>

      {/* Target Settings Modal */}
      {isEditingTargets && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '20px',
        }}>
          <div style={{
            background: '#111118', border: '1px solid #1f1f2e', borderRadius: '16px',
            width: '100%', maxWidth: '400px', padding: '24px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Target Finansial</h2>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>Atur persentase ideal untuk alokasi budget Anda.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={lbl}>Target Saving Rate (%)</label>
                <input type="number" value={targetSaving} onChange={e => setTargetSaving(Number(e.target.value))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Batas Keinginan / Wants (%)</label>
                <input type="number" value={targetWants} onChange={e => setTargetWants(Number(e.target.value))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Batas Kebutuhan / Needs (%)</label>
                <input type="number" value={targetNeeds} onChange={e => setTargetNeeds(Number(e.target.value))} style={inp} />
              </div>
              <div style={{ padding: '10px', background: (targetSaving + targetWants + targetNeeds > 100) ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', borderRadius: '8px', fontSize: '11px', color: (targetSaving + targetWants + targetNeeds > 100) ? '#f87171' : '#4ade80' }}>
                Total Alokasi: {targetSaving + targetWants + targetNeeds}% {targetSaving + targetWants + targetNeeds > 100 && '(Melebihi 100%!)'}
              </div>

              {/* Benchmark Standar Global */}
              <div style={{ 
                marginTop: '16px', padding: '12px', background: '#0a0a0f', 
                border: '1px dashed #1f1f2e', borderRadius: '10px' 
              }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>📊</span> STANDAR GLOBAL (50/30/20)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'Kebutuhan', val: '50%', color: '#60a5fa' },
                    { label: 'Keinginan', val: '30%', color: '#fbbf24' },
                    { label: 'Tabungan', val: '20%', color: '#4ade80' },
                  ].map(b => (
                    <div key={b.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>{b.label}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: b.color }}>{b.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '10px', fontSize: '10px', color: '#6b7280', fontStyle: 'italic', lineHeight: '1.4' }}>
                  Aturan 50/30/20 adalah panduan umum: 50% untuk kebutuhan pokok, 30% untuk keinginan pribadi, dan 20% untuk tabungan/investasi.
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setTargetNeeds(50);
                    setTargetWants(30);
                    setTargetSaving(20);
                  }}
                  style={{
                    width: '100%', marginTop: '10px', padding: '6px',
                    background: '#1f1f2e', border: 'none', borderRadius: '6px',
                    color: '#f0f0f5', fontSize: '11px', fontWeight: '600', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2a2a3a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1f1f2e'}
                >
                  Terapkan Standar 50/30/20
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveTargets} disabled={isSavingTargets} style={{
                flex: 1, padding: '11px', border: 'none', borderRadius: '9px',
                color: '#fff', fontSize: '14px', fontWeight: '600',
                background: '#2563eb', cursor: 'pointer',
              }}>{isSavingTargets ? 'Menyimpan...' : 'Simpan'}</button>
              <button onClick={() => setIsEditingTargets(false)} style={{
                padding: '11px 18px', background: 'transparent', border: '1px solid #2a2a3a',
                borderRadius: '9px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer',
              }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {overBudget.length > 0 && (
        <div style={{
          padding: '12px 16px', background: '#2d0f0f', border: '1px solid #7f1d1d',
          borderRadius: '10px', marginBottom: '12px', fontSize: '13px', color: '#f87171',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          🚨 {overBudget.length} kategori melebihi budget:{' '}
          <strong>{overBudget.map(b => b.categories?.name).join(', ')}</strong>
        </div>
      )}
      {nearLimit.length > 0 && (
        <div style={{
          padding: '12px 16px', background: '#1a1000', border: '1px solid #3d2a00',
          borderRadius: '10px', marginBottom: '12px', fontSize: '13px', color: '#fbbf24',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          ⚠️ {nearLimit.length} kategori hampir habis:{' '}
          <strong>{nearLimit.map(b => b.categories?.name).join(', ')}</strong>
        </div>
      )}

      {/* Summary bar */}
      {budgets.length > 0 && (
        <div style={{
          background: '#111118', border: '1px solid #1f1f2e',
          borderRadius: '12px', padding: '18px 20px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>
              Total Budget {monthLabel}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f5' }}>
              {fmt(totalSpent)} <span style={{ color: '#374151', fontWeight: '400' }}>/ {fmt(totalLimit)}</span>
            </span>
          </div>
          <div style={{ height: '8px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              width: `${totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0}%`,
              background: totalSpent / totalLimit >= 1 ? '#ef4444'
                : totalSpent / totalLimit >= 0.8 ? '#f59e0b' : '#2563eb',
              transition: 'width .5s ease',
            }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '14px' }}>
            {[
              { label: 'Total Budget', value: fmt(totalLimit), color: '#9ca3af' },
              { label: 'Total Terpakai', value: fmt(totalSpent), color: '#f87171' },
              { label: 'Sisa', value: fmt(Math.max(totalLimit - totalSpent, 0)), color: '#4ade80' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px',
                  textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: s.color }}>
                  {fmtK(parseFloat(s.value.replace(/[^0-9]/g, '')))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Envelope grid */}
      {budgets.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#111118', border: '1px solid #1f1f2e', borderRadius: '14px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h3 style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
            Belum ada budget bulan ini
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>
            Set limit pengeluaran per kategori supaya kamu tahu<br/>kapan harus mulai rem pengeluaran.
          </p>
          <button onClick={() => setShowForm(true)} style={{
            padding: '10px 24px', background: '#2563eb', border: 'none',
            borderRadius: '9px', color: '#fff', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer',
          }}>
            + Set Budget Pertama
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '14px',
        }}>
          {sorted.map(b => (
            <EnvelopeCard
              key={b.id}
              budget={b}
              spent={spendMap[b.categories?.id] ?? 0}
              onEdit={b => setEditBudget(b)}
              onDelete={() => setDeletingBudget(b)}
            />
          ))}
        </div>
      )}

      {/* Tips */}
      {budgets.length > 0 && (
        <div style={{
          marginTop: '20px', padding: '14px 16px',
          background: '#0a0a0f', border: '1px solid #1f1f2e',
          borderRadius: '10px', fontSize: '12px', color: '#6b7280', lineHeight: '1.6',
        }}>
          💡 <strong style={{ color: '#9ca3af' }}>Tips:</strong> Budget ini reset otomatis setiap bulan.
          Bulan depan kamu perlu set ulang — atau salin dari bulan ini via tombol "+ Set Budget".
          Pengeluaran dihitung dari transaksi yang masuk via bot maupun web.
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#6b7280',
  fontWeight: '500', marginBottom: '6px',
};
