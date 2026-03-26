// app/dashboard/academy/AcademyClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '../components/DashboardComponents';

interface Tip {
  id: string;
  icon: string;
  title: string;
  content: string;
  tip: string;
  isCustom?: boolean;
}

const INITIAL_TIPS: Tip[] = [
  { id: '1', icon: '🏺', title: 'Strategi Sinking Fund', content: 'Cicil mandiri untuk pajak, asuransi, atau liburan guna menghindari guncangan saldo saat jatuh tempo.', tip: 'Gunakan fitur Goal "Tabungan Pajak" dengan target deadline.' },
  { id: '2', icon: '📊', title: 'Aturan 50/30/20', content: 'Alokasikan 50% Kebutuhan, 30% Keinginan, dan 20% Masa Depan Anda sebagai standar kebahagiaan finansial.', tip: 'Cek "Target Budget" di menu Budget untuk mengubah rasio ini.' },
  { id: '3', icon: '☕', title: 'Biaya Peluang (Kopi)', content: 'Setiap Rp 50rb yang Anda hemat per hari hari ini, bisa tumbuh menjadi ratusan juta di masa depan berkat bunga berbunga.', tip: 'Lihat widget "Biaya Peluang" di Overview dashboard.' },
  { id: '4', icon: '🛡️', title: 'Dana Darurat (Safety Net)', content: 'Simpan minimal 6x pengeluaran bulanan Anda untuk perlindungan total dari risiko kesehatan atau kehilangan pekerjaan.', tip: 'Catat aset Kas/Tabungan di menu Net Worth untuk memantau gauge Safety Net.' },
  { id: '5', icon: '🪜', title: 'Metode Pelunasan Hutang', content: 'Fokus lunas satu per satu mulai dari bunga terkecil atau bunga tertinggi untuk efisiensi finansial maksimal.', tip: 'Cek prioritas hutang Anda di widget "The Laboratorium" di Overview.' },
  { id: '6', icon: '🤖', title: 'Kecepatan Input Bot', content: 'Disiplin mencatat saat itu juga di kasir adalah kunci laporan data yang 100% akurat.', tip: 'Ketik "Makan Bakso 25rb" sesaat setelah membayar di kasir.' },
  { id: '7', icon: '🔢', title: 'Rule of 72 (Doubling Time)', content: 'Bagi 72 dengan estimasi ROI investasi Anda untuk tahu kapan uang Anda akan berlipat ganda secara otomatis.', tip: 'Investasi ROI 7%? Uang Anda akan berlipat dua setiap ~10 tahun tanpa tambahan dana.' },
  { id: '8', icon: '💸', title: 'Inflasi (Musuh Tersembunyi)', content: 'Uang tunai yang diam akan berkurang daya belinya setiap tahun. Pastikan aset Anda bertumbuh di atas angka inflasi.', tip: 'Pantau pertumbuhan kekayaan Anda di grafik Laporan & Analitik.' },
  { id: '9', icon: '✂️', title: 'Audit Langganan (Subscriptions)', content: 'Layanan streaming atau aplikasi yang jarang dipakai adalah "kebocoran halus" yang bisa menghambat target FI Anda.', tip: 'Widget "Langganan Aktif" di Overview akan mendeteksi pengeluaran berulang Anda.' },
  { id: '10', icon: '🏦', title: 'Pay Yourself First', content: 'Pindahkan jatah tabungan di awal gajian, bukan dari sisa belanja di akhir bulan. Ini adalah kunci kekayaan.', tip: 'Set transaksi pemasukan dan langsung buat pengeluaran bertipe "Investasi/Tabungan".' },
  { id: '11', icon: '🗓️', title: 'Aturan 30 Hari', content: 'Tunggu 30 hari sebelum membeli barang mahal/keinginan. Biasanya, setelah 30 hari rasa ingin tersebut akan hilang.', tip: 'Gunakan dashboard untuk melihat efek belanja besar terhadap kemunduran tanggal pensiun Anda.' },
  { id: '12', icon: '🚀', title: 'Akselerasi Kekayaan', content: 'Kekayaan bukan hanya soal angka naik, tapi soal seberapa cepat KENAIKANNYA bertambah dari bulan ke bulan.', tip: 'Indikator "Wealth Velocity" di Analitik memantau momentum percepatan Anda.' },
  { id: '13', icon: '🏆', title: 'Rayakan Setiap Milestone', content: 'Keuangan tidak harus selalu soal hemat. Rayakan setiap kali target Goal tercapai untuk menjaga motivasi.', tip: 'Gunakan 5% dari surplus Anda sebagai budget "Self Reward" resmi.' },
  { id: '14', icon: '📈', title: 'Aset Alokasi Terbaik', content: 'Jangan taruh semua telur dalam satu keranjang. Bagi kekayaan Anda ke Kas, Emas, dan Saham/Investasi.', tip: 'Lihat "Alokasi Aset" di Overview untuk memastikan diversifikasi Anda sehat.' },
  { id: '15', icon: '🏚️', title: 'Aset vs Liabilitas', content: 'Aset memasukkan uang ke kantong Anda, Liabilitas mengeluarkannya. Pastikan porsi aset Anda selalu lebih besar.', tip: 'Update Net Worth setiap awal bulan untuk audit aset vs hutang Anda.' },
  { id: '16', icon: '🧠', title: 'Audit Mingguan 15 Menit', content: 'Cukup 15 menit setiap hari Minggu untuk mereview seluruh transaksi dan budget minggu depan.', tip: 'Tab "Harian" di Analitik mempermudah review mingguan Anda dengan cepat.' },
];

export default function AcademyClient() {
  const [tips, setTips] = useState<Tip[]>(INITIAL_TIPS);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ icon: '🏷️', title: '', content: '', tip: '' });

  useEffect(() => {
    const saved = localStorage.getItem('custom_academy_tips');
    if (saved) {
      const parsed = JSON.parse(saved);
      setTips([...INITIAL_TIPS, ...parsed]);
    }
  }, []);

  const saveToLocal = (newTips: Tip[]) => {
    const customOnly = newTips.filter(t => t.id.startsWith('custom-'));
    localStorage.setItem('custom_academy_tips', JSON.stringify(customOnly));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updated = tips.map(t => t.id === editingId ? { ...t, ...formData } : t);
      setTips(updated);
      saveToLocal(updated);
    } else {
      const newTip: Tip = { ...formData, id: `custom-${Date.now()}`, isCustom: true };
      const updated = [...tips, newTip];
      setTips(updated);
      saveToLocal(updated);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updated = tips.filter(t => t.id !== id);
    setTips(updated);
    saveToLocal(updated);
  };

  const startEdit = (tip: Tip) => {
    setFormData({ icon: tip.icon, title: tip.title, content: tip.content, tip: tip.tip });
    setEditingId(tip.id);
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({ icon: '🏷️', title: '', content: '', tip: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div style={{ color: 'var(--text-main)' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>📚 Akademi & Strategi Finansial</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Kumpulan trik cerdas untuk mengoptimalkan kekayaan Anda.</p>
        </div>
        <button onClick={() => setIsAdding(true)} style={{ padding: '10px 18px', background: 'var(--accent-primary)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}>
          + Tambah Tip Sendiri
        </button>
      </header>

      {isAdding && (
        <Card style={{ padding: '24px', marginBottom: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>{editingId ? 'Edit Tip' : 'Tambah Tip Baru'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '60px' }}>
                <label style={lbl}>Icon</label>
                <input style={inp} value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Judul Strategi</label>
                <input style={inp} value={formData.title} required onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Misal: Aturan Jajan" />
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Penjelasan Strategi</label>
              <textarea style={{ ...inp, height: '80px', paddingTop: '10px', resize: 'none' }} value={formData.content} required onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="Jelaskan alasan di balik trik ini..." />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Tips Ke Dashboard (Langkah Nyata)</label>
              <input style={inp} value={formData.tip} required onChange={e => setFormData({ ...formData, tip: e.target.value })} placeholder="Langkah apa yang dilakukan di dashboard?" />
            </div>
            <div style={{ display: 'flex', gap: '10px', gridColumn: 'span 2' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                Simpan Tip
              </button>
              <button type="button" onClick={resetForm} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </form>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {tips.map(t => (
          <Card key={t.id} style={{ padding: '20px', background: t.isCustom ? 'rgba(37,99,235,0.03)' : 'var(--card-bg)' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>{t.title}</h3>
                  {t.isCustom && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEdit(t)} style={{ border: 'none', background: 'transparent', fontSize: '14px', cursor: 'pointer', color: 'var(--text-muted)' }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} style={{ border: 'none', background: 'transparent', fontSize: '14px', cursor: 'pointer', color: 'var(--text-muted)' }}>🗑️</button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '12px' }}>{t.content}</p>
                <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', borderLeft: '4px solid var(--accent-primary)', fontSize: '12px', fontWeight: '600' }}>
                  💡 {t.tip}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' };
const inp: React.CSSProperties = { width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px' };
