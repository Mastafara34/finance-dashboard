// app/dashboard/academy/page.tsx
import React from 'react';
import { Card } from '../components/DashboardComponents';

const GuideCard = ({ title, icon, content, tip }: { title: string, icon: string, content: string, tip: string }) => (
  <Card style={{ marginBottom: '16px', background: 'var(--card-bg)' }}>
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '28px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '12px' }}>
          {content}
        </p>
        <div style={{ 
          background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', 
          borderLeft: '4px solid var(--accent-primary)', fontSize: '12px', color: 'var(--text-main)', fontWeight: '500' 
        }}>
          💡 <strong>Tips Dashboard:</strong> {tip}
        </div>
      </div>
    </div>
  </Card>
);

export default function AcademyPage() {
  return (
    <div style={{ color: 'var(--text-main)', padding: '20px', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          📚 Akademi Finansial & Tips
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Kuasai strategi finansial terbaik untuk memaksimalkan dashboard Anda.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        <GuideCard 
          icon="🏺"
          title="Strategi Sinking Fund (Cicilan Mandiri)"
          content="Sinking Fund adalah teknik menabung secara rutin untuk pengeluaran besar yang sudah pasti terjadi di masa depan (misal: Pajak Tahunan, Service Mobil, atau Liburan). Alih-alih kaget saat tagihan datang, Anda menyicilnya ke diri sendiri."
          tip="Buat 'Goal' baru dengan nama 'Pajak [Tahun]' di menu Goals. Dashboard akan menghitung berapa yang harus Anda sisihkan setiap bulan otomatis."
        />

        <GuideCard 
          icon="📊"
          title="Aturan 50/30/20"
          content="Sistem alokasi budget paling populer di dunia. 50% untuk Kebutuhan Pokok, 30% untuk Keinginan (Life Style), dan 20% untuk Tabungan/Investasi. Ini adalah pondasi keuangan yang sehat."
          tip="Atur target ini di menu 'Budget' > '⚙️ Target'. Skor Health di Overview akan berubah sesuai dengan seberapa taat Anda pada aturan ini."
        />

        <GuideCard 
          icon="☕"
          title="Opportunity Cost (Biaya Peluang)"
          content="Setiap uang kecil yang Anda belanjakan secara impulsif (seperti kopi premium atau jajan berlebih) memiliki 'biaya peluang'. Jika uang tersebut diinvestasikan, ia bisa tumbuh menjadi angka yang sangat besar di masa depan."
          tip="Cek widget 'Biaya Peluang' di halaman Overview. Lihat berapa ratus juta yang bisa Anda dapatkan dalam 20 tahun hanya dengan menghemat Rp 50rb/hari."
        />

        <GuideCard 
          icon="🛡️"
          title="Dana Darurat (Safety Net)"
          content="Uang yang disimpan khusus untuk keadaan darurat (sakit, PHK, musibah). Minimal adalah 6x pengeluaran bulanan. Ini adalah 'rem' agar Anda tidak perlu berhutang saat terjadi masalah."
          tip="Pastikan Anda mencatat aset likuid (Tabungan/Kas) di menu 'Net Worth'. Gauge 'Dana Darurat' di Overview akan menunjukkan sejauh mana perlindungan Anda."
        />

        <GuideCard 
          icon="🪜"
          title="Debt Snowball (Prioritas Hutang)"
          content="Metode melunasi hutang dengan fokus pada saldo terkecil terlebih dahulu untuk membangun momentum psikologis, atau bunga terbesar untuk efisiensi finansial."
          tip="Catat semua hutang Anda sebagai aset dengan tipe 'Liability' di menu Net Worth. Gunakan widget 'Prioritas Hutang' di Overview untuk memantau saldo total yang harus dilunasi."
        />

        <GuideCard 
          icon="🤖"
          title="Input Otomatis via Telegram"
          content="Kekuatan utama dashboard ini adalah kemudahan input. Semakin disiplin Anda mencatat, semakin akurat laporan evaluasi AI memprediksi masa depan Anda."
          tip="Gunakan Bot Telegram setiap kali Anda bertransaksi di kasir. Cukup ketik 'Beli Bakso 25rb' dan dashboard akan langsung terupdate."
        />

      </div>

      <footer style={{ marginTop: '60px', padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', borderTop: '1px solid var(--border-color)' }}>
        <p>Strategi ini disusun berdasarkan prinsip perencanaan keuangan modern untuk membantu Anda mencapai Kebebasan Finansial (FI) lebih cepat.</p>
      </footer>
    </div>
  );
}
