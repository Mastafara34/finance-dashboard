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
LAPORAN KECERDASAN FINANSIAL
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
    <div style={{ color: 'var(--text-main)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Laporan & Evaluasi</h1>
          <p style={{ color: 'var(--text-muted)' }}>Pusat pertanggungjawaban finansial dan history performa.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={isSaving}
            onClick={() => handleGenerateReport('weekly')}
            style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Mingguan
          </button>
          <button 
            disabled={isSaving}
            onClick={() => handleGenerateReport('monthly')}
            style={{ padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Bulanan
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 1fr' : '1fr', gap: '20px' }}>
        {/* List History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>Riwayat Laporan</h2>
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
                  background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', 
                  cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: selectedReport?.id === r.id ? 'var(--accent-primary)' : 'var(--border-color)',
                  boxShadow: selectedReport?.id === r.id ? '0 0 15px rgba(37,99,235,0.12)' : 'var(--card-shadow)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ 
                      fontSize: '10px', background: r.type === 'weekly' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-secondary)', 
                      color: r.type === 'weekly' ? '#4338ca' : 'var(--text-muted)', 
                      padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '700', marginRight: '8px' 
                    }}>
                      {r.type === 'weekly' ? 'Mingguan' : 'Bulanan'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(r.period_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(r.period_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: r.status === 'achieved' ? '#4ade80' : '#f87171' }}>
                    {r.status === 'achieved' ? '✅ Tercapai' : '⚠️ Butuh Evaluasi'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Income</div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(r.data.income)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expense</div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(r.data.expense)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saving Rate</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: r.data.saving_rate >= 20 ? '#4ade80' : '#f59e0b' }}>{r.data.saving_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Evaluation Panel */}
        {selectedReport && (
          <div style={{ position: 'sticky', top: '20px' }}>
            <Card style={{ border: '1px solid #2563eb', background: 'rgba(37,99,235,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Detail & Evaluasi Manual</h2>
                <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>✕</button>
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
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Rencana Perbaikan Periode Berikutnya</div>
                <textarea 
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  placeholder="Contoh: Mengurangi makan di luar di minggu depan untuk menyeimbangkan budget..."
                  style={{ 
                    width: '100%', minHeight: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                    borderRadius: '8px', padding: '12px', color: 'var(--text-main)', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              <button 
                disabled={isSaving}
                onClick={handleSaveEvaluation}
                style={{ 
                  width: '100%', padding: '12px', background: '#2563eb', color: '#fff', 
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  opacity: isSaving ? 0.5 : 1, marginBottom: '10px'
                }}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Evaluasi'}
              </button>

              <button 
                onClick={() => downloadReport(selectedReport)}
                style={{ 
                  width: '100%', padding: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                📥 Unduh Laporan (.txt)
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
