// app/dashboard/reports/ReportsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { Card, fmt, pct } from '../components/DashboardComponents';
import { createClient } from '@/lib/supabase/client';

interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  data: any;
  status: 'achieved' | 'missed';
  manual_evaluation: string | null;
  improvement_plan: string | null;
  created_at: string;
}

export default function ReportsClient({ initialReports, userId }: { initialReports: Report[], userId: string }) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [isSaving, setIsLazy] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [evalText, setEvalText] = useState('');
  const [planText, setPlanText] = useState('');

  const supabase = createClient();

  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    setIsLazy(true);
    // Call API to generate report
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    
    if (res.ok) {
      const newReport = await res.json();
      setReports(prev => [newReport, ...prev]);
    }
    setIsLazy(false);
  };

  const handleSaveEvaluation = async () => {
    if (!selectedReport) return;
    setIsLazy(true);
    const { error } = await supabase
      .from('financial_reports')
      .update({
        manual_evaluation: evalText,
        improvement_plan: planText,
        status: (evalText && planText) ? 'achieved' : 'missed'
      })
      .eq('id', selectedReport.id);

    if (!error) {
      setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, manual_evaluation: evalText, improvement_plan: planText } : r));
      setSelectedReport(null);
    }
    setIsLazy(false);
  };

  const downloadReport = (report: Report) => {
    const content = `
LAPORAN FINANSIAL TERPERINCI
---------------------------
Periode: ${new Date(report.period_start).toLocaleDateString('id-ID')} s/d ${new Date(report.period_end).toLocaleDateString('id-ID')}
Tipe: ${report.type === 'weekly' ? 'Mingguan' : 'Bulanan'}
Status: ${report.status === 'achieved' ? 'TERCAPAI' : 'BUTUH EVALUASI'}

RINGKASAN ANGKA:
- Pemasukan: ${fmt(report.data.income)}
- Pengeluaran: ${fmt(report.data.expense)}
- Saving Rate: ${report.data.saving_rate.toFixed(1)}%
- Surplus: ${fmt(report.data.income - report.data.expense)}

EVALUASI MANUAL:
${report.manual_evaluation || 'Belum ada catatan evaluasi.'}

RENCANA PERBAIKAN:
${report.improvement_plan || 'Belum ada rencana perbaikan.'}

Dicetak pada: ${new Date().toLocaleString('id-ID')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Finansial_${report.period_start}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ color: 'var(--text-main)' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>riwayat laporan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>analisis mendalam arus kas mingguan dan bulanan anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            disabled={isSaving}
            onClick={() => handleGenerateReport('weekly')}
            style={{ padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            + mingguan
          </button>
          <button 
            disabled={isSaving}
            onClick={() => handleGenerateReport('monthly')}
            style={{ padding: '10px 20px', background: 'var(--accent-primary)', color: 'var(--accent-primary-fg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + bulanan
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* List History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>riwayat laporan</h2>
          {reports.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Belum ada history laporan. Laporan akan terbuat otomatis setiap minggu/bulan.
            </Card>
          ) : (
            reports.map(r => (
              <div 
                key={r.id} 
                onClick={() => {
                  setSelectedReport(r);
                  setEvalText(r.manual_evaluation || '');
                  setPlanText(r.improvement_plan || '');
                }}
                style={{ 
                  background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', 
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderColor: selectedReport?.id === r.id ? 'var(--accent-primary)' : 'var(--border-color)',
                  boxShadow: selectedReport?.id === r.id ? '0 8px 32px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '11px', background: r.type === 'weekly' ? 'var(--bg-secondary)' : 'var(--bg-secondary)', 
                      color: 'var(--text-main)', 
                      padding: '2px 10px', borderRadius: 'var(--radius-sm)', fontWeight: '600', border: '1px solid var(--border-color)'
                    }}>
                      {r.type === 'weekly' ? 'mingguan' : 'bulanan'}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '500' }}>{new Date(r.period_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(r.period_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: r.status === 'achieved' ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                    {r.status === 'achieved' ? '✓ tercapai' : '✕ butuh evaluasi'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>pemasukan</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{fmt(r.data.income)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>pengeluaran</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{fmt(r.data.expense)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>saving rate</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: r.data.saving_rate >= 20 ? 'var(--color-positive)' : 'var(--color-neutral)' }}>{r.data.saving_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Evaluation Panel */}
        {selectedReport && (
          <div style={{ position: 'sticky', top: '24px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '500' }}>detail & evaluasi</h2>
                <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Kenapa target tidak tercapai? (Atau apa yang dipelajari?)</div>
                <textarea 
                  value={evalText}
                  onChange={(e) => setEvalText(e.target.value)}
                  placeholder="Contoh: Bulan ini ada servis mobil tak terduga Rp 2jt, jadi saving rate turun..."
                  style={{ 
                    width: '100%', minHeight: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                    borderRadius: '8px', padding: '12px', color: 'var(--text-main)', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>rencana perbaikan periode berikutnya</div>
                <textarea 
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  placeholder="Contoh: Mengurangi makan di luar di minggu depan untuk menyeimbangkan budget..."
                  style={{ 
                    width: '100%', minHeight: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', padding: '14px', color: 'var(--text-main)', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <button 
                disabled={isSaving}
                onClick={handleSaveEvaluation}
                style={{ 
                  width: '100%', padding: '14px', background: 'var(--accent-primary)', color: 'var(--accent-primary-fg)', 
                  border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer',
                  opacity: isSaving ? 0.7 : 1, marginBottom: '12px', fontSize: '14px'
                }}
              >
                {isSaving ? 'menyimpan...' : 'simpan evaluasi'}
              </button>

              <button 
                onClick={() => downloadReport(selectedReport)}
                style={{ 
                  width: '100%', padding: '14px', background: 'transparent', color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                }}
              >
                unduh laporan (.txt)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
