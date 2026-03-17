// app/dashboard/intelligence/page.tsx
import React from 'react';
import { Card } from '../components/DashboardComponents';

const FormulaCard = ({ title, formula, explanation, example }: { title: string, formula: string, explanation: string, example: string }) => (
  <Card style={{ marginBottom: '16px' }}>
    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#60a5fa', marginBottom: '8px' }}>{title}</h3>
    <div style={{ background: '#1f1f2e', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px', marginBottom: '12px', color: '#4ade80' }}>
      {formula}
    </div>
    <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6', marginBottom: '12px' }}>
      {explanation}
    </p>
    <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
      <strong>Contoh:</strong> {example}
    </div>
  </Card>
);

export default function IntelligencePage() {
  return (
    <div style={{ color: '#f0f0f5', padding: '20px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Pusat Transparansi Logika</h1>
        <p style={{ color: '#6b7280' }}>Penjelasan mendalam bagaimana angka-angka di dashboard Anda dihitung.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        <FormulaCard 
          title="Financial Independence (FI) Number"
          formula="Annual Expenses × 25"
          explanation="Berdasarkan 'Rule of 25' dan '4% Safe Withdrawal Rate'. Jika Anda memiliki aset 25 kali pengeluaran tahunan, Anda secara teoritis bisa hidup selamanya hanya dengan mengambil 4% dari aset tersebut setiap tahun tanpa menghabiskan modal utama."
          example="Jika biaya hidup Rp 10jt/bln (Rp 120jt/thn), maka FI Number Anda adalah Rp 3 Miliar."
        />

        <FormulaCard 
          title="FI Countdown (Waktu Pensiun)"
          formula="Compound Interest N-Period Formula"
          explanation="Kami tidak hanya membagi sisa target dengan surplus Anda. Kami menggunakan rumus logaritma untuk memperhitungkan imbal hasil investasi (asumsi 7% per tahun) dari aset yang sudah Anda miliki saat ini. Semakin besar aset Anda, semakin cepat waktu pensiun Anda karena efek bunga berbunga."
          example="Uang Rp 100jt yang diinvestasikan akan membantu Anda mencapai target lebih cepat daripada hanya menabung surplus bulanan."
        />

        <FormulaCard 
          title="Survival Time (Liquid Only)"
          formula="Liquid Assets ÷ Monthly Burn Rate"
          explanation="Mengukur berapa bulan Anda bisa bertahan hidup menggunakan KAS/TABUNGAN saja jika hari ini pendapatan Anda berhenti total."
          example="Kas Rp 60jt ÷ Pengeluaran Rp 10jt = 6 Bulan Survival Time."
        />

        <FormulaCard 
          title="Total Runway (All Assets)"
          formula="Total Assets ÷ Monthly Burn Rate"
          explanation="Sama dengan Survival Time, namun mengasumsikan Anda menjual SELURUH aset Anda (emas, saham, properti) untuk bertahan hidup."
          example="Total Aset Rp 500jt ÷ Pengeluaran Rp 10jt = 50 Bulan Runway."
        />

        <FormulaCard 
          title="Wealth Velocity (Kecepatan Kekayaan)"
          formula="(ΔNetWorth Current) - (ΔNetWorth Previous)"
          explanation="Bukan hanya melihat kekayaan naik, tapi apakah KENAIKANNYA lebih cepat dari sebelumnya. 'Accelerating' berarti Anda sedang membangun momentum kekayaan."
          example="Bulan lalu naik 5jt, bulan ini naik 7jt. Velocity = +2jt (Accelerating)."
        />

        <FormulaCard 
          title="Opportunity Cost (Kopi Premium)"
          formula="Future Value of Annuity (Daily Savings × Days × Rate)"
          explanation="Menunjukkan kekuatan uang kecil jika diinvestasikan dalam jangka panjang. Kami menggunakan asumsi imbal hasil moderat untuk memotivasi Anda mengurangi pengeluaran impulsif."
          example="Rp 50rb/hari selama 20 tahun bisa menjadi ratusan juta rupiah."
        />
      </div>

      <footer style={{ marginTop: '40px', padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px', borderTop: '1px solid #1f1f2e' }}>
        <p>Logika ini disusun berdasarkan standar perencanaan keuangan profesional (Certified Financial Planner - CFP).</p>
      </footer>
    </div>
  );
}
