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

  const handleSaveEvaluation = async () => {
    if (!selectedReport) return;
    setIsLazy(true);
    const { error } = await supabase
      .from('financial_reports')
      .update({
        manual_evaluation: evalText,
        improvement_plan: planText,
        status: (evalText && planText) ? 'achieved' : 'missed' // Or keep logic as needed
      })
      .eq('id', selectedReport.id);

    if (!error) {
      setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, manual_evaluation: evalText, improvement_plan: planText } : r));
      setSelectedReport(null);
    }
    setIsLazy(false);
  };

  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Laporan & Evaluasi</h1>
        <p style={{ color: '#6b7280' }}>Pusat pertanggungjawaban finansial dan history performa.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 1fr' : '1fr', gap: '20px' }}>
        {/* List History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#9ca3af' }}>Riwayat Laporan</h2>
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
                  background: '#111118', border: '1px solid #1f1f2e', borderRadius: '12px', padding: '16px', 
                  cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: selectedReport?.id === r.id ? '#2563eb' : '#1f1f2e',
                  boxShadow: selectedReport?.id === r.id ? '0 0 15px rgba(37,99,235,0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ 
                      fontSize: '10px', background: r.type === 'weekly' ? '#1e1b4b' : '#1e293b', 
                      color: r.type === 'weekly' ? '#818cf8' : '#94a3b8', 
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
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Income</div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(r.data.income)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Expense</div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(r.data.expense)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Saving Rate</div>
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
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Kenapa target tidak tercapai? (Atau apa yang dipelajari?)</div>
                <textarea 
                  value={evalText}
                  onChange={(e) => setEvalText(e.target.value)}
                  placeholder="Contoh: Bulan ini ada servis mobil tak terduga Rp 2jt, jadi saving rate turun..."
                  style={{ 
                    width: '100%', minHeight: '100px', background: '#0a0a0f', border: '1px solid #1f1f2e', 
                    borderRadius: '8px', padding: '12px', color: '#f0f0f5', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Rencana Perbaikan Periode Berikutnya</div>
                <textarea 
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  placeholder="Contoh: Mengurangi makan di luar di minggu depan untuk menyeimbangkan budget..."
                  style={{ 
                    width: '100%', minHeight: '100px', background: '#0a0a0f', border: '1px solid #1f1f2e', 
                    borderRadius: '8px', padding: '12px', color: '#f0f0f5', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              <button 
                disabled={isSaving}
                onClick={handleSaveEvaluation}
                style={{ 
                  width: '100%', padding: '12px', background: '#2563eb', color: '#fff', 
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  opacity: isSaving ? 0.5 : 1
                }}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Evaluasi'}
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
