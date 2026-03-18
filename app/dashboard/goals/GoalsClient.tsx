// app/dashboard/goals/GoalsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Goal {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  target_amount: number;
  current_amount: number;
  monthly_allocation: number | null;
  deadline: string | null;
  priority: number;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  achieved_at: string | null;
  created_at: string;
}

type GoalStatus = 'active' | 'achieved' | 'paused' | 'cancelled';

interface Props {
  initialGoals: Goal[];
  userId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

function monthsToGoal(current: number, target: number, monthly: number | null): string {
  if (!monthly || monthly <= 0) return '–';
  const sisa = target - current;
  if (sisa <= 0) return 'Tercapai';
  const months = Math.ceil(sisa / monthly);
  if (months > 120) return '> 10 tahun';
  if (months >= 12) return `${Math.floor(months / 12)} thn ${months % 12} bln`;
  return `${months} bulan`;
}

function estimatedDate(current: number, target: number, monthly: number | null): string {
  if (!monthly || monthly <= 0) return '–';
  const sisa = target - current;
  if (sisa <= 0) return 'Sudah tercapai';
  const months = Math.ceil(sisa / monthly);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  active:    'Aktif',
  achieved:  'Tercapai',
  paused:    'Dijeda',
  cancelled: 'Dibatalkan',
};

const STATUS_COLOR: Record<GoalStatus, { bg: string; text: string; border: string }> = {
  active:    { bg: 'rgba(37, 99, 235, 0.1)', text: 'var(--accent-primary)', border: 'rgba(37, 99, 235, 0.2)' },
  achieved:  { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  paused:    { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
};

const ICONS = ['🎯','🏠','🚗','🕌','✈️','📈','🏦','🛡️','💍','🎓','💻','🏋️','🌏','👶','🎁'];

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
      <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
        Belum ada goals
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>
        Tambahkan tujuan finansialmu — haji, pensiun,<br/>rumah, atau apapun yang ingin kamu capai.
      </p>
      <button onClick={onAdd} style={{
        padding: '10px 24px', background: 'var(--accent-primary)', border: 'none',
        borderRadius: '9px', color: '#fff', fontSize: '14px',
        fontWeight: '600', cursor: 'pointer',
      }}>
        + Tambah Goal Pertama
      </button>
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal, onEdit, onDelete, onUpdateProgress, onStatusChange,
}: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (g: Goal) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
}) {
  const pct     = Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100);
  const sisa    = Math.max(goal.target_amount - goal.current_amount, 0);
  const sc      = STATUS_COLOR[goal.status];
  const isAchieved = goal.status === 'achieved';

  const barColor = isAchieved ? '#10b981'
    : pct >= 75 ? 'var(--accent-primary)'
    : pct >= 40 ? '#6366f1'
    : '#8b5cf6';

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border-color)',
      borderRadius: '14px', padding: '22px',
      opacity: goal.status === 'cancelled' ? 0.5 : 1,
      transition: 'all .15s',
      boxShadow: 'var(--card-shadow)'
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-primary)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '22px', flexShrink: 0,
          }}>{goal.icon}</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '3px' }}>
              {goal.name}
            </div>
            {goal.description && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{goal.description}</div>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span style={{
          fontSize: '11px', padding: '3px 10px', borderRadius: '99px',
          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
          fontWeight: '700', flexShrink: 0,
        }}>
          {STATUS_LABEL[goal.status]}
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Progress</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: isAchieved ? '#10b981' : 'var(--text-main)' }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px', width: `${pct}%`,
            background: barColor, transition: 'width .6s ease',
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            {fmt(goal.current_amount)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            {fmt(goal.target_amount)}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
        marginBottom: '16px',
      }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase' }}>Sisa target</div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            {sisa > 0 ? fmt(sisa) : '–'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase' }}>Cicilan/bulan</div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            {goal.monthly_allocation ? fmt(goal.monthly_allocation) : '–'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase' }}>Estimasi selesai</div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
            {isAchieved
              ? goal.achieved_at
                ? new Date(goal.achieved_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
                : 'Tercapai'
              : estimatedDate(goal.current_amount, goal.target_amount, goal.monthly_allocation)}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: '700', textTransform: 'uppercase' }}>Waktu tersisa</div>
          <div style={{ fontSize: '13px', fontWeight: '800',
            color: isAchieved ? '#10b981' : 'var(--text-main)' }}>
            {isAchieved ? '🏆 Done!' : monthsToGoal(goal.current_amount, goal.target_amount, goal.monthly_allocation)}
          </div>
        </div>
      </div>

      {/* Deadline */}
      {goal.deadline && (
        <div style={{
          fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px',
          padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)',
          fontWeight: '600'
        }}>
          <span>📅</span>
          <span>Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {goal.status === 'active' && (
          <button onClick={() => onUpdateProgress(goal)} style={{
            flex: 1, padding: '10px 14px', background: 'var(--accent-primary)', border: 'none',
            borderRadius: '8px', color: '#fff', fontSize: '13px',
            fontWeight: '700', cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget).style.background = '#1d4ed8'}
            onMouseLeave={e => (e.currentTarget).style.background = 'var(--accent-primary)'}
          >
            + Update Progress
          </button>
        )}
        <button onClick={() => onEdit(goal)} style={{
          padding: '8px 14px', background: 'transparent',
          border: '1px solid var(--border-color)', borderRadius: '8px',
          color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontWeight: '600'
        }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--accent-primary)'; (e.currentTarget).style.color = 'var(--accent-primary)'; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
        >Edit</button>

        {/* Status change */}
        {goal.status === 'active' && (
          <button onClick={() => onStatusChange(goal.id, 'paused')} style={{
            padding: '8px 14px', background: 'transparent',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontWeight: '600'
          }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = '#fbbf24'; (e.currentTarget).style.color = '#fbbf24'; }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
          >Jeda</button>
        )}
        {goal.status === 'paused' && (
          <button onClick={() => onStatusChange(goal.id, 'active')} style={{
            padding: '8px 14px', background: 'transparent',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontWeight: '600'
          }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = '#10b981'; (e.currentTarget).style.color = '#10b981'; }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; }}
          >Aktifkan</button>
        )}
        <button onClick={() => { if (confirm(`Hapus goal "${goal.name}"?`)) onDelete(goal.id); }} style={{
          padding: '8px 10px', background: 'transparent',
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

// ─── Goal Form Modal ──────────────────────────────────────────────────────────
function GoalFormModal({
  goal, onSave, onClose,
}: {
  goal: Partial<Goal> | null;
  onSave: (data: Partial<Goal>) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!goal?.id;
  const [form, setForm] = useState<Partial<Goal>>(goal ?? {
    name: '', description: '', icon: '🎯',
    target_amount: 0, current_amount: 0,
    monthly_allocation: null, deadline: null,
    priority: 3, status: 'active',
  });
  const [saving, setSaving] = useState(false);

  // Display states untuk format Rp
  const [displayTarget,  setDisplayTarget]  = useState(goal?.target_amount  ? goal.target_amount.toLocaleString('id-ID')  : '');
  const [displayCurrent, setDisplayCurrent] = useState(goal?.current_amount ? goal.current_amount.toLocaleString('id-ID') : '');
  const [displayMonthly, setDisplayMonthly] = useState(goal?.monthly_allocation ? goal.monthly_allocation.toLocaleString('id-ID') : '');

  function parseAmt(raw: string): number { return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0; }
  function toDisp(n: number): string { return n === 0 ? '' : n.toLocaleString('id-ID'); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.target_amount) return;
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {isEdit ? 'Edit Goal' : 'Tambah Goal Baru'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: '20px', cursor: 'pointer', padding: '0 4px',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Icon picker */}
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button"
                  onClick={() => setForm(p => ({ ...p, icon: ic }))}
                  style={{
                    width: '38px', height: '38px', fontSize: '20px',
                    borderRadius: '8px', border: '2px solid',
                    borderColor: form.icon === ic ? 'var(--accent-primary)' : 'var(--border-color)',
                    background: form.icon === ic ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                  }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Nama Goal <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="cth: Dana Haji, Pensiun, DP Rumah" required
              style={inp}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Deskripsi (opsional)</label>
            <input value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Catatan singkat tentang goal ini"
              style={inp}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Target + Current */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={lbl}>Target Amount <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'9px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', color:'var(--text-muted)', pointerEvents:'none' }}>Rp</span>
                <input type="text" inputMode="numeric" value={displayTarget} required placeholder="0"
                  onChange={e => { const n=parseAmt(e.target.value); setDisplayTarget(toDisp(n)); setForm(p=>({...p,target_amount:n})); }}
                  onFocus={e => { e.target.style.borderColor='var(--accent-primary)'; setDisplayTarget((form.target_amount??0)===0?'':(form.target_amount??0).toString()); }}
                  onBlur={e  => { e.target.style.borderColor='var(--border-color)'; setDisplayTarget(toDisp(form.target_amount??0)); }}
                  style={{...inp, paddingLeft:'28px', fontSize:'16px'}}
                />
              </div>
              {(form.target_amount??0)>0 && <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px'}}>Rp {(form.target_amount??0).toLocaleString('id-ID')}</div>}
            </div>
            <div>
              <label style={lbl}>Sudah terkumpul</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'9px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', color:'var(--text-muted)', pointerEvents:'none' }}>Rp</span>
                <input type="text" inputMode="numeric" value={displayCurrent} placeholder="0"
                  onChange={e => { const n=parseAmt(e.target.value); setDisplayCurrent(toDisp(n)); setForm(p=>({...p,current_amount:n})); }}
                  onFocus={e => { e.target.style.borderColor='var(--accent-primary)'; setDisplayCurrent((form.current_amount??0)===0?'':(form.current_amount??0).toString()); }}
                  onBlur={e  => { e.target.style.borderColor='var(--border-color)'; setDisplayCurrent(toDisp(form.current_amount??0)); }}
                  style={{...inp, paddingLeft:'28px', fontSize:'16px'}}
                />
              </div>
              {(form.current_amount??0)>0 && <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px'}}>Rp {(form.current_amount??0).toLocaleString('id-ID')}</div>}
            </div>
          </div>

          {/* Monthly + Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={lbl}>Cicilan per bulan</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'9px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', color:'var(--text-muted)', pointerEvents:'none' }}>Rp</span>
                <input type="text" inputMode="numeric" value={displayMonthly} placeholder="0"
                  onChange={e => { const n=parseAmt(e.target.value); setDisplayMonthly(toDisp(n)); setForm(p=>({...p,monthly_allocation:n||null})); }}
                  onFocus={e => { e.target.style.borderColor='var(--accent-primary)'; const v=form.monthly_allocation??0; setDisplayMonthly(v===0?'':v.toString()); }}
                  onBlur={e  => { e.target.style.borderColor='var(--border-color)'; setDisplayMonthly(toDisp(form.monthly_allocation??0)); }}
                  style={{...inp, paddingLeft:'28px', fontSize:'16px'}}
                />
              </div>
              {(form.monthly_allocation??0)>0 && <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px'}}>Rp {(form.monthly_allocation??0).toLocaleString('id-ID')}</div>}
            </div>
            <div>
              <label style={lbl}>Deadline (opsional)</label>
              <input type="date" value={form.deadline ?? ''}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value || null }))}
                style={inp}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Prioritas: <strong style={{ color: 'var(--text-main)' }}>{form.priority}</strong> / 5</label>
            <input type="range" min={1} max={5} value={form.priority ?? 3}
              onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Prioritas tinggi (1)</span><span>Prioritas rendah (5)</span>
            </div>
          </div>

          {/* Preview proyeksi */}
          {(form.target_amount ?? 0) > 0 && (
            <div style={{
              padding: '12px 14px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)', borderRadius: '9px', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '500' }}>
                PROYEKSI
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Sisa: <strong style={{ color: 'var(--text-main)' }}>
                  {fmt(Math.max((form.target_amount ?? 0) - (form.current_amount ?? 0), 0))}
                </strong>
                {form.monthly_allocation && form.monthly_allocation > 0 && (
                  <> · Selesai sekitar <strong style={{ color: '#10b981' }}>
                    {estimatedDate(form.current_amount ?? 0, form.target_amount ?? 0, form.monthly_allocation)}
                  </strong>
                  · <strong style={{ color: 'var(--accent-primary)' }}>
                    {monthsToGoal(form.current_amount ?? 0, form.target_amount ?? 0, form.monthly_allocation)}
                  </strong>
                  </>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '11px', background: saving ? 'var(--border-color)' : 'var(--accent-primary)',
              border: 'none', borderRadius: '9px', color: '#fff',
              fontSize: '14px', fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Goal'}
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

// ─── Update Progress Modal ─────────────────────────────────────────────────────
function UpdateProgressModal({
  goal, onSave, onClose,
}: {
  goal: Goal;
  onSave: (id: string, amount: number) => Promise<void>;
  onClose: () => void;
}) {
  const [amount,   setAmount]   = useState(0);
  const [display,  setDisplay]  = useState('');
  const [saving,   setSaving]   = useState(false);

  function parseAmt(raw: string): number { return parseInt(raw.replace(/[^0-9]/g,''),10)||0; }
  function toDisp(n: number): string { return n===0?'':n.toLocaleString('id-ID'); }

  const parsed  = amount;
  const newTotal = goal.current_amount + parsed;
  const newPct   = Math.min(Math.round((newTotal / goal.target_amount) * 100), 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    setSaving(true);
    await onSave(goal.id, amount);
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#111118', border: '1px solid #2a2a3a',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#f0f0f5', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {goal.icon} Update Progress
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Current state */}
        <div style={{ marginBottom: '20px', padding: '14px', background: '#0a0a0f', borderRadius: '10px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{goal.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Terkumpul sekarang</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(goal.current_amount)}</span>
          </div>
          <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px', background: '#2563eb',
              width: `${Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100)}%`,
            }}/>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={lbl}>Jumlah yang ditambahkan</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'13px', color:'#6b7280', pointerEvents:'none' }}>Rp</span>
              <input
                type="text" inputMode="numeric"
                value={display}
                placeholder="0"
                required autoFocus
                onChange={e => { const n=parseAmt(e.target.value); setDisplay(toDisp(n)); setAmount(n); }}
                onFocus={e => { e.target.style.borderColor='#2563eb'; setDisplay(amount===0?'':amount.toString()); }}
                onBlur={e => { e.target.style.borderColor='#2a2a3a'; setDisplay(toDisp(amount)); }}
                style={{
                  width:'100%', padding:'11px 12px 11px 36px',
                  background:'#0a0a0f', border:'1px solid #2a2a3a',
                  borderRadius:'9px', color:'#f0f0f5', fontSize:'16px',
                  outline:'none', boxSizing:'border-box',
                }}
              />
            </div>
            {amount > 0 && <div style={{fontSize:'11px',color:'#6b7280',marginTop:'3px'}}>Rp {amount.toLocaleString('id-ID')}</div>}

          {/* Preview */}
          {parsed > 0 && (
            <div style={{
              padding: '12px 14px', background: '#0c1f3a',
              border: '1px solid #1e3a5f', borderRadius: '9px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#60a5fa' }}>Setelah update</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f5' }}>{fmt(newTotal)}</span>
              </div>
              <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  background: newPct >= 100 ? '#4ade80' : '#2563eb',
                  width: `${newPct}%`, transition: 'width .3s',
                }}/>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#60a5fa', marginTop: '4px' }}>
                {newPct}% {newPct >= 100 && '🎉 Goal tercapai!'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving || parsed <= 0} style={{
              flex: 1, padding: '11px', background: saving || parsed <= 0 ? '#1f1f2e' : '#2563eb',
              border: 'none', borderRadius: '9px', color: saving || parsed <= 0 ? '#6b7280' : '#fff',
              fontSize: '14px', fontWeight: '600',
              cursor: saving || parsed <= 0 ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', background: 'transparent',
              border: '1px solid #2a2a3a', borderRadius: '9px',
              color: '#9ca3af', fontSize: '14px', cursor: 'pointer',
            }}>Batal</button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GoalsClient({ initialGoals, userId }: Props) {
  const supabase = createClient();

  const [goals,          setGoals]          = useState<Goal[]>(initialGoals);
  const [showForm,       setShowForm]       = useState(false);
  const [editGoal,       setEditGoal]       = useState<Goal | null>(null);
  const [progressGoal,   setProgressGoal]   = useState<Goal | null>(null);
  const [filterStatus,   setFilterStatus]   = useState<'all' | GoalStatus>('all');
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    filterStatus === 'all' ? goals : goals.filter(g => g.status === filterStatus),
    [goals, filterStatus]
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  const active   = goals.filter(g => g.status === 'active');
  const achieved = goals.filter(g => g.status === 'achieved');
  const totalTarget  = active.reduce((s, g) => s + g.target_amount, 0);
  const totalCurrent = active.reduce((s, g) => s + g.current_amount, 0);

  // ── Create / Update goal ──────────────────────────────────────────────────
  async function handleSaveGoal(data: Partial<Goal>) {
    if (editGoal?.id) {
      // Update
      const { error } = await supabase.from('goals').update({
        name:               data.name,
        description:        data.description,
        icon:               data.icon,
        target_amount:      data.target_amount,
        current_amount:     data.current_amount,
        monthly_allocation: data.monthly_allocation,
        deadline:           data.deadline,
        priority:           data.priority,
        updated_at:         new Date().toISOString(),
      }).eq('id', editGoal.id);

      if (error) { showToast('Gagal menyimpan: ' + error.message, false); return; }

      setGoals(prev => prev.map(g => g.id === editGoal.id ? { ...g, ...data } as Goal : g));
      showToast('Goal diperbarui');
    } else {
      // Create
      const { data: newGoal, error } = await supabase.from('goals').insert([{
        user_id:            userId,
        name:               data.name,
        description:        data.description,
        icon:               data.icon ?? '🎯',
        target_amount:      data.target_amount,
        current_amount:     data.current_amount ?? 0,
        monthly_allocation: data.monthly_allocation,
        deadline:           data.deadline,
        priority:           data.priority ?? 3,
        status:             'active',
      }]).select().single();

      if (error) { showToast('Gagal membuat goal: ' + error.message, false); return; }
      setGoals(prev => [...prev, newGoal as unknown as Goal]);
      showToast('Goal berhasil ditambahkan 🎯');
    }

    setShowForm(false);
    setEditGoal(null);
  }

  // ── Update progress ───────────────────────────────────────────────────────
  async function handleUpdateProgress(goalId: string, amount: number) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount   = goal.current_amount + amount;
    const isAchieved  = newAmount >= goal.target_amount;

    const { error } = await supabase.from('goals').update({
      current_amount: newAmount,
      ...(isAchieved ? { status: 'achieved', achieved_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', goalId);

    if (error) { showToast('Gagal update: ' + error.message, false); return; }

    setGoals(prev => prev.map(g => g.id === goalId ? {
      ...g, current_amount: newAmount,
      ...(isAchieved ? { status: 'achieved' as GoalStatus, achieved_at: new Date().toISOString() } : {}),
    } : g));

    setProgressGoal(null);
    showToast(isAchieved ? '🏆 Selamat! Goal tercapai!' : 'Progress diperbarui');
  }

  // ── Status change ─────────────────────────────────────────────────────────
  async function handleStatusChange(goalId: string, status: GoalStatus) {
    const { error } = await supabase.from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', goalId);

    if (error) { showToast('Gagal mengubah status', false); return; }
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status } : g));
    showToast(`Goal ${STATUS_LABEL[status].toLowerCase()}`);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(goalId: string) {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (error) { showToast('Gagal menghapus', false); return; }
    setGoals(prev => prev.filter(g => g.id !== goalId));
    showToast('Goal dihapus');
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

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

      {/* Modals */}
      {(showForm || editGoal) && (
        <GoalFormModal
          goal={editGoal}
          onSave={handleSaveGoal}
          onClose={() => { setShowForm(false); setEditGoal(null); }}
        />
      )}
      {progressGoal && (
        <UpdateProgressModal
          goal={progressGoal}
          onSave={handleUpdateProgress}
          onClose={() => setProgressGoal(null)}
        />
      )}

      <style>{`
        .goals-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
        .goals-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px; }
        @media (max-width:768px) {
          .goals-summary { grid-template-columns:repeat(2,1fr); gap:8px; }
          .goals-grid { grid-template-columns:1fr; gap:10px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Goals</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Pantau semua tujuan finansialmu</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          padding: '9px 16px', background: '#2563eb', border: 'none',
          borderRadius: '9px', color: '#fff', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', flexShrink: 0,
        }}
          onMouseEnter={e => (e.currentTarget).style.background = '#1d4ed8'}
          onMouseLeave={e => (e.currentTarget).style.background = '#2563eb'}
        >+ Tambah</button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="goals-summary">
          {[
            { label: 'Goals Aktif', value: active.length.toString(), color: '#60a5fa' },
            { label: 'Tercapai', value: achieved.length.toString(), color: '#4ade80' },
            { label: 'Total Terkumpul', value: fmt(totalCurrent), color: '#f0f0f5' },
            { label: 'Total Target Aktif', value: fmt(totalTarget), color: '#9ca3af' },
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
      )}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
          {(['all', 'active', 'achieved', 'paused', 'cancelled'] as const).map(s => {
            const count = s === 'all' ? goals.length : goals.filter(g => g.status === s).length;
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '6px 12px', borderRadius: '99px', border: '1px solid',
                fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                whiteSpace: 'nowrap',
                borderColor: active ? '#2563eb' : '#2a2a3a',
                background: active ? '#0c1f3a' : 'transparent',
                color: active ? '#60a5fa' : '#6b7280',
              }}>
                {s === 'all' ? 'Semua' : STATUS_LABEL[s]}
                <span style={{ marginLeft: '5px', opacity: .7, fontSize: '11px' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Goals grid */}
      {filtered.length === 0 ? (
        goals.length === 0
          ? <EmptyState onAdd={() => setShowForm(true)} />
          : <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>
              Tidak ada goal dengan status ini.
            </div>
      ) : (
        <div className="goals-grid">
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g}
              onEdit={g => setEditGoal(g)}
              onDelete={handleDelete}
              onUpdateProgress={g => setProgressGoal(g)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#6b7280',
  fontWeight: '500', marginBottom: '6px',
};
