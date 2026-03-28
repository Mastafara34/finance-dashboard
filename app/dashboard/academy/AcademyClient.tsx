// app/dashboard/academy/AcademyClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '../components/DashboardComponents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tip { id: string; icon: string; title: string; content: string; tip: string; category: string; isCustom?: boolean; }

const CATEGORIES = ['Semua','Tabungan','Investasi','Hutang','Anggaran','Psikologi Uang','Produktivitas','Proteksi'];
const CAT_COLORS: Record<string,string> = { 'Tabungan':'var(--color-positive)','Investasi':'var(--accent-primary)','Hutang':'var(--color-negative)','Anggaran':'var(--color-neutral)','Psikologi Uang':'var(--text-muted)','Produktivitas':'var(--text-main)','Proteksi':'var(--text-muted)' };

const INITIAL_TIPS: Tip[] = [
  { id:'1',  category:'Anggaran',       icon:'📊', title:'Aturan 50/30/20',              content:'Alokasikan 50% kebutuhan pokok, 30% keinginan, dan 20% tabungan/investasi. Standar kebahagiaan finansial yang diakui global.', tip:'Cek "Target Budget" di menu Budget untuk menyesuaikan rasio ini.' },
  { id:'2',  category:'Anggaran',       icon:'🏺', title:'Sinking Fund',                 content:'Tabung sedikit setiap bulan untuk keperluan tahunan: pajak kendaraan, premi asuransi, liburan. Cegah "kejutan finansial" di akhir tahun.', tip:'Buat Goal bertema "Pajak Tahunan" dengan deadline di bulan jatuh tempo.' },
  { id:'3',  category:'Anggaran',       icon:'🗓️', title:'Aturan 30 Hari',               content:'Sebelum membeli barang tidak terencana (>Rp 500rb), tunggu 30 hari. Ini memfilter 80% pembelian impulsif.', tip:'Catat keinginan membeli sebagai catatan transaksi "wishlist" untuk dipertimbangkan ulang.' },
  { id:'4',  category:'Anggaran',       icon:'✂️', title:'Audit Langganan Rutin',         content:'Cek semua layanan berlangganan setiap 3 bulan. Streaming dan gym jarang dipakai — kebocoran halus senilai ratusan ribu per bulan.', tip:'Widget "Langganan Aktif" di Overview mendeteksi pengeluaran berulang Anda.' },
  { id:'5',  category:'Anggaran',       icon:'🧾', title:'Zero-Based Budgeting',          content:'Alokasikan setiap rupiah ke pos tertentu: Pemasukan − Alokasi = Rp 0. Tidak ada uang yang "mengambang" tanpa tujuan.', tip:'Gunakan halaman Budget untuk mengalokasikan semua kategori tiap bulan.' },
  { id:'6',  category:'Anggaran',       icon:'🧮', title:'Hitung Biaya Per Jam Kerja',    content:'Sebelum beli sesuatu, hitung berapa jam kerja yang dibutuhkan. Baju Rp 600rb = 3 jam kerja. Perspektif ini membuat Anda berpikir dua kali.', tip:'Bagi harga barang dengan (Gaji ÷ 160 jam kerja) untuk perspektif nyata.' },
  { id:'7',  category:'Tabungan',       icon:'🏦', title:'Pay Yourself First',            content:'Transfer jatah tabungan di hari gajian, SEBELUM membayar apapun lainnya. Ini perbedaan terbesar antara yang selalu kaya dan yang selalu kekurangan.', tip:'Buat transaksi pemasukan lalu langsung catat pengeluaran "Tabungan" di hari yang sama.' },
  { id:'8',  category:'Tabungan',       icon:'🛡️', title:'Dana Darurat (Safety Net)',     content:'Prioritas PERTAMA sebelum investasi apapun. Kumpulkan 3x pengeluaran (single) atau 6x (berkeluarga) di rekening terpisah yang mudah dicairkan.', tip:'Pantau progress Dana Darurat di widget Safety Net halaman Overview.' },
  { id:'9',  category:'Tabungan',       icon:'📱', title:'Bahaya BNPL',                   content:'Buy Now Pay Later terasa gratis, tapi mendorong pembelian barang yang tidak mampu dibeli. Kemudahan kredit adalah musuh terbesar disiplin anggaran.', tip:'Jika pakai BNPL, catat nominal penuh di hari pembelian, bukan per cicilan.' },
  { id:'10', category:'Tabungan',       icon:'📈', title:'Naikkan Tabungan Seiring Gaji', content:'Setiap gaji naik 10%, naikkan tabungan minimal 5%. Gaya hidup hanya boleh naik setengah dari kenaikan penghasilan.', tip:'Update "Monthly Income" di Pengaturan setiap kali gaji berubah agar dashboard akurat.' },
  { id:'11', category:'Investasi',      icon:'🔢', title:'Rule of 72',                    content:'Bagi 72 dengan ROI investasi Anda untuk tahu kapan uang berlipat dua. ROI 8%? Uang berlipat dalam 9 tahun (72 ÷ 8 = 9).', tip:'Pantau pertumbuhan aset investasi di menu Net Worth.' },
  { id:'12', category:'Investasi',      icon:'💸', title:'Kalahkan Inflasi',               content:'Inflasi Indonesia 3-5% per tahun. Uang di tabungan biasa (bunga 1-2%) rugi secara riil. Pastikan aset Anda tumbuh di atas angka inflasi.', tip:'Masukkan aset non-kas (reksa dana, emas, saham) ke Net Worth dan pantau trendnya.' },
  { id:'13', category:'Investasi',      icon:'📉', title:'Dollar-Cost Averaging (DCA)',   content:'Investasikan jumlah tetap secara rutin tanpa peduli kondisi pasar. Cara ini merata-ratakan harga beli dan menghilangkan risiko salah timing.', tip:'Catat investasi rutin bulanan sebagai pengeluaran kategori "Investasi".' },
  { id:'14', category:'Investasi',      icon:'🏆', title:'Diversifikasi Aset',            content:'Bagi ke minimal 3 wadah: Kas/Deposito (likuid), Emas (stabil), dan Saham/Reksa Dana (growth). Mengurangi risiko total portofolio.', tip:'Lihat "Alokasi Aset" di Overview untuk memastikan diversifikasi kekayaan sehat.' },
  { id:'15', category:'Investasi',      icon:'⏰', title:'Mulai Lebih Awal',              content:'Rp 1 juta diinvestasikan usia 25 lebih bernilai dari Rp 10 juta diinvestasikan usia 45. Waktu adalah aset terbesar dalam investasi.', tip:'Ada surplus setiap bulan? Investasikan serentak — jangan tunda.' },
  { id:'16', category:'Hutang',         icon:'🪜', title:'Avalanche vs Snowball',         content:'Avalanche: lunas bunga tertinggi dulu (hemat total bunga). Snowball: lunas nilai terkecil dulu (motivasi psikologis). Pilih sesuai karakter Anda.', tip:'Cek prioritas hutang di widget "The Laboratorium" halaman Overview.' },
  { id:'17', category:'Hutang',         icon:'🚫', title:'Hindari Hutang Konsumtif',      content:'Hutang untuk aset produktif (KPR, usaha) bisa wajar. Hutang untuk konsumsi (gadget, liburan via cicilan) mempersempit kebebasan finansial.', tip:'Buat kategori "Hutang Konsumtif" tersendiri agar terlihat total biayanya.' },
  { id:'18', category:'Hutang',         icon:'📊', title:'Rasio Hutang Aman',             content:'Total cicilan sebaiknya tidak melebihi 30% penghasilan bersih. Jika >30%, Anda di zona risiko dan perlu restrukturisasi segera.', tip:'Hitung total cicilan ÷ gaji. Jika >30%, prioritaskan pelunasan sebelum investasi baru.' },
  { id:'19', category:'Psikologi Uang', icon:'🧠', title:'Hedonic Treadmill',             content:'Kesenangan dari barang baru memudar cepat, lalu Anda ingin yang lebih baru lagi. Siklus ini tidak berakhir. Fokus pada pengalaman, bukan barang.', tip:'Sebelum membeli, tanya: apakah ini tetap membahagiakan dalam 3 bulan?' },
  { id:'20', category:'Psikologi Uang', icon:'👥', title:'Lifestyle Inflation',           content:'"Naik gaji = upgrade gaya hidup" membuat orang berpenghasilan tinggi tetap pas-pasan. Pertahankan biaya hidup lama setelah naik gaji.', tip:'Bandingkan rata-rata pengeluaran sebelum dan sesudah kenaikan gaji di Analitik.' },
  { id:'21', category:'Psikologi Uang', icon:'🎯', title:'Kekuatan Tujuan Spesifik',     content:'Orang dengan goal spesifik ("DP rumah Rp 150jt dalam 3 tahun") 10x lebih konsisten menabung daripada yang hanya ingin "menabung lebih banyak".', tip:'Buat Goal dengan nominal dan deadline yang spesifik di halaman Goals.' },
  { id:'22', category:'Psikologi Uang', icon:'🏅', title:'Rayakan Setiap Milestone',      content:'Keuangan tidak harus selalu ketat. Rayakan target yang tercapai dengan reward kecil yang sudah dianggarkan. Ini menjaga motivasi jangka panjang.', tip:'Buat kategori "Self Reward" di Budget sebesar 2-5% dari penghasilan.' },
  { id:'23', category:'Proteksi',       icon:'🏥', title:'Asuransi Kesehatan Pertama',    content:'Sebelum investasi apapun, pastikan ada proteksi kesehatan yang memadai. Satu rawat inap tanpa asuransi bisa menghancurkan tabungan bertahun-tahun.', tip:'Catat premi asuransi sebagai pengeluaran kategori "Proteksi" agar mudah dievaluasi.' },
  { id:'24', category:'Proteksi',       icon:'📋', title:'Perencanaan Warisan',           content:'Perencanaan finansial lengkap mencakup apa yang terjadi pada aset Anda jika hal terburuk terjadi. Dokumen wasiat melindungi keluarga.', tip:'Inventarisasi semua aset secara menyeluruh di Net Worth sebagai catatan acuan.' },
  { id:'25', category:'Produktivitas',  icon:'☕', title:'Latte Factor',                  content:'Rp 30rb dihemat per hari = Rp 10.8 juta per tahun. Jika diinvestasikan dengan ROI 8%, dalam 10 tahun menjadi >Rp 150 juta.', tip:'Lihat widget "Biaya Peluang" di Overview untuk melihat potensi penghematan kecil.' },
  { id:'26', category:'Produktivitas',  icon:'🤖', title:'Input Real-Time',               content:'Catat transaksi SAAT ITU JUGA selepas membayar. Data terlambat sering tidak akurat dan merusak kualitas laporan keuangan Anda.', tip:'Gunakan Bot Telegram: ketik "Makan siang 35rb" — selesai dalam 5 detik.' },
  { id:'27', category:'Produktivitas',  icon:'📖', title:'Review 15 Menit per Minggu',    content:'Sisihkan 15 menit setiap akhir pekan untuk review transaksi dan rencanakan alokasi minggu depan. Konsistensi kecil ini membangun kesadaran finansial luar biasa.', tip:'Gunakan tab "Harian" di Analitik untuk melihat pola pengeluaran harian dengan cepat.' },
  { id:'28', category:'Produktivitas',  icon:'🚀', title:'Akselerasi Kekayaan',           content:'Kaya bukan soal jumlah naik, tapi seberapa CEPAT kenaikannya bertambah setiap bulan. Fokus pada momentum, bukan hanya total.', tip:'Indikator "Wealth Velocity" di Analitik membantu memantau momentum percepatan kekayaan.' },
  { id:'29', category:'Investasi',      icon:'🏠', title:'Properti: Aset atau Beban?',    content:'Rumah yang Anda tinggali adalah liabilitas (cicilan, perawatan, PBB). Properti disewakan adalah aset. Pahami ini sebelum mengambil keputusan KPR.', tip:'Pantau nilai properti di Net Worth dan bandingkan dengan total biaya kepemilikannya.' },
  { id:'30', category:'Tabungan',       icon:'💧', title:'Tabung dari Uang Receh',        content:'Sisihkan semua kembalian atau sisa belanja harian ke rekening terpisah. Kebiasaan kecil ini bisa mengumpulkan jutaan rupiah dalam setahun tanpa terasa.', tip:'Catat sebagai pemasukan "Dana Darurat" setiap kali mengisi celengan.' },
  { id:'31', category:'Anggaran',       icon:'🌱', title:'Aset vs Liabilitas',             content:'Aset memasukkan uang ke kantong Anda (properti sewa, saham). Liabilitas mengeluarkannya (cicilan, kartu kredit). Perbanyak aset, kurangi liabilitas.', tip:'Update Net Worth tiap awal bulan untuk audit rasio Aset vs Liabilitas secara visual.' },
  { id:'32', category:'Psikologi Uang', icon:'💼', title:'Tingkatkan Penghasilan',        content:'Memotong pengeluaran ada batasnya. Meningkatkan penghasilan tidak ada batasnya. Investasikan waktu untuk skill, side project, atau negosiasi gaji.', tip:'Pantau tren penghasilan bulanan di Analitik — apakah naik atau stagnan?' },
];

// ─── Checklist Data ───────────────────────────────────────────────────────────
interface CheckItem { id: string; text: string; category: string; }
const CHECKLIST: CheckItem[] = [
  { id:'c1',  category:'Catat & Audit',   text:'Review semua transaksi minggu ini di halaman Transaksi' },
  { id:'c2',  category:'Catat & Audit',   text:'Cek apakah ada transaksi yang lupa dicatat atau salah kategori' },
  { id:'c3',  category:'Catat & Audit',   text:'Input semua pemasukan bulan ini (gaji, bonus, side income)' },
  { id:'c4',  category:'Budget',          text:'Cek persentase budget yang sudah terpakai di halaman Budget' },
  { id:'c5',  category:'Budget',          text:'Identifikasi 1 kategori pengeluaran terbesar dan evaluasi apakah bisa dikurangi' },
  { id:'c6',  category:'Budget',          text:'Pastikan total cicilan < 30% dari penghasilan' },
  { id:'c7',  category:'Tabungan',        text:'Transfer jatah tabungan/investasi bulan ini (Pay Yourself First)' },
  { id:'c8',  category:'Tabungan',        text:'Cek progress Dana Darurat di widget Safety Net halaman Overview' },
  { id:'c9',  category:'Goals',           text:'Update progress semua Goal finansial aktif di halaman Goals' },
  { id:'c10', category:'Goals',           text:'Evaluasi apakah timeline Goal masih realistis, sesuaikan jika perlu' },
  { id:'c11', category:'Net Worth',       text:'Update nilai semua aset (kas, investasi, properti) di halaman Net Worth' },
  { id:'c12', category:'Net Worth',       text:'Update saldo hutang aktif (KPR, cicilan, pinjaman) di Net Worth' },
  { id:'c13', category:'Investasi',       text:'Lakukan setoran investasi rutin bulan ini (reksa dana/saham/emas)' },
  { id:'c14', category:'Investasi',       text:'Review performa portofolio investasi — apakah masih sesuai target?' },
  { id:'c15', category:'Proteksi',        text:'Cek tanggal jatuh tempo premi asuransi — pastikan tidak lupa bayar' },
  { id:'c16', category:'Proteksi',        text:'Audit langganan aktif — ada yang tidak terpakai dan bisa dihapus?' },
  { id:'c17', category:'Refleksi',        text:'Hitung net cash flow bulan ini (Pemasukan - Pengeluaran) — positif atau negatif?' },
  { id:'c18', category:'Refleksi',        text:'Tentukan 1 target finansial spesifik untuk bulan depan' },
  { id:'c19', category:'Refleksi',        text:'Baca atau dengar 1 konten edukasi finansial minggu ini (buku, podcast, artikel)' },
  { id:'c20', category:'Refleksi',        text:'Rayakan 1 pencapaian finansial bulan ini — sekecil apapun!' },
];

// ─── Quiz Data ────────────────────────────────────────────────────────────────
interface QuizQ { q: string; opts: string[]; ans: number; explain: string; }
const QUIZ_QUESTIONS: QuizQ[] = [
  { q:'Berapa "Dana Darurat" minimum yang idealnya disiapkan?', opts:['1x pengeluaran bulanan','3x pengeluaran bulanan','6x pengeluaran bulanan','12x pengeluaran bulanan'], ans:1, explain:'Minimum 3x untuk single, 6x untuk berkeluarga. Ini cukup untuk menutup kebutuhan selama masa transisi pekerjaan atau kondisi darurat.' },
  { q:'Apa itu "Rule of 72" dalam investasi?', opts:['Investasikan 72% dari gaji','72 ÷ ROI = estimasi tahun uang berlipat dua','Tabung Rp 72rb per hari','Diversifikasi ke 72 instrumen berbeda'], ans:1, explain:'Bagi 72 dengan return tahunan investasi Anda untuk memperkirakan kapan uang berlipat dua. ROI 8% → uang berlipat dalam 9 tahun.' },
  { q:'Dalam aturan 50/30/20, angka "20" mengacu pada?', opts:['20% untuk hiburan','20% untuk kebutuhan darurat','20% untuk tabungan dan investasi','20% untuk membayar cicilan'], ans:2, explain:'20% dialokasikan untuk tabungan, investasi, dan pelunasan hutang tambahan. Ini adalah "porsi masa depan" Anda.' },
  { q:'Strategi pelunasan hutang "Avalanche" memprioritaskan...', opts:['Hutang dengan jumlah terkecil','Hutang dengan bunga tertinggi','Hutang yang paling lama','Hutang kepada keluarga'], ans:1, explain:'Avalanche melunasi hutang dengan bunga tertinggi terlebih dahulu, yang secara matematis menghemat total pembayaran bunga terbanyak.' },
  { q:'Apa yang dimaksud "Pay Yourself First"?', opts:['Belanja kebutuhan sendiri sebelum keluarga','Transfer tabungan di awal gajian sebelum membayar lainnya','Bayar semua tagihan sendiri tanpa bantuan','Investasi untuk pensiun pribadi dulu'], ans:1, explain:'Menyisihkan tabungan/investasi di awal gajian memastikan Anda selalu menabung, tidak bergantung pada "sisa" uang belanja.' },
  { q:'Inflasi Indonesia rata-rata berapa persen per tahun?', opts:['1-2%','3-5%','7-9%','10-12%'], ans:1, explain:'Indonesia secara historis memiliki inflasi 3-5% per tahun. Ini berarti aset Anda harus tumbuh di atas angka ini agar tidak rugi secara riil.' },
  { q:'Rasio cicilan bulanan yang aman adalah maksimal berapa persen dari penghasilan?', opts:['10%','20%','30%','50%'], ans:2, explain:'Total cicilan bulanan sebaiknya ≤30% dari penghasilan bersih. Di atas itu Anda masuk zona risiko finansial tinggi.' },
  { q:'Strategi DCA (Dollar-Cost Averaging) adalah...', opts:['Investasi besar sekaligus saat harga turun','Investasi jumlah tetap secara rutin tanpa peduli kondisi pasar','Diversifikasi ke banyak mata uang asing','Menunggu harga terendah sebelum investasi'], ans:1, explain:'DCA menginvestasikan jumlah tetap secara rutin (misal Rp 500rb/bulan). Cara ini merata-ratakan harga beli dan mengurangi risiko timing yang salah.' },
  { q:'"Latte Factor" dalam perencanaan keuangan mengajarkan bahwa...', opts:['Kopi adalah pengeluaran yang tidak perlu','Penghematan kecil harian dapat bernilai besar jangka panjang','Orang kaya tidak minum kopi mahal','Biaya hiburan harus diprioritaskan'], ans:1, explain:'Rp 30rb dihemat per hari = Rp 10.8 juta per tahun. Jika diinvestasikan, bisa menjadi ratusan juta dalam 10-15 tahun berkat bunga berbunga.' },
  { q:'Apa perbedaan "aset" dan "liabilitas" menurut Robert Kiyosaki?', opts:['Aset adalah barang fisik, liabilitas adalah hutang','Aset memasukkan uang ke kantong, liabilitas mengeluarkannya','Aset adalah properti, liabilitas adalah kendaraan','Aset adalah tabungan, liabilitas adalah pengeluaran'], ans:1, explain:'Definisi Kiyosaki: Aset menghasilkan arus kas masuk (properti sewa, saham dividen). Liabilitas menghasilkan arus kas keluar (cicilan rumah yang ditinggali, kredit konsumtif).' },
];

// ─── Tab Nav ──────────────────────────────────────────────────────────────────
const TABS = [
  { id:'tips',      label:'📚 Strategi & Tips' },
  { id:'checklist', label:'✓ Checklist Bulanan' },
  { id:'calc',      label:'🧮 Kalkulator' },
  { id:'quiz',      label:'📝 Quiz Finansial' },
];

// ─── Calculator Component ──────────────────────────────────────────────────────
function KalkulatorTab() {
  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  // Kalkulator Dana Darurat
  const [expense, setExpense] = useState('');
  const [status, setStatus]   = useState<'single'|'family'>('single');
  const emergencyTarget = (parseFloat(expense.replace(/\./g,''))||0) * (status === 'family' ? 6 : 3);

  // Rule of 72
  const [roi72, setRoi72] = useState('');
  const years72 = roi72 ? (72 / parseFloat(roi72)).toFixed(1) : null;

  // DCA Simulator
  const [dcaMonthly, setDcaMonthly] = useState('');
  const [dcaRoi, setDcaRoi]         = useState('');
  const [dcaYears, setDcaYears]     = useState('');
  const dcaResult = (() => {
    const m = parseFloat(dcaMonthly.replace(/\./g,''))||0;
    const r = (parseFloat(dcaRoi)||0) / 100 / 12;
    const n = (parseFloat(dcaYears)||0) * 12;
    if (!m || !n) return null;
    if (r === 0) return m * n;
    return m * ((Math.pow(1+r, n) - 1) / r);
  })();

  // Kalkulator Cicilan
  const [pinjaman, setPinjaman] = useState('');
  const [bungaThn, setBungaThn] = useState('');
  const [tenor, setTenor]       = useState('');
  const cicilan = (() => {
    const p = parseFloat(pinjaman.replace(/\./g,''))||0;
    const r = (parseFloat(bungaThn)||0) / 100 / 12;
    const n = parseFloat(tenor)||0;
    if (!p || !n) return null;
    if (r === 0) return p / n;
    return (p * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
  })();

  const cardStyle: React.CSSProperties = { padding:'28px', background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', marginBottom:'20px' };
  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'14px', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' };
  const lbl: React.CSSProperties = { display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'8px' };
  const res: React.CSSProperties = { marginTop:'20px', padding:'20px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', textAlign:'center' };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'20px' }}>
      {/* Dana Darurat */}
      <div style={cardStyle}>
        <h3 style={{ fontWeight:'500', fontSize:'16px', marginBottom:'6px' }}>Dana Darurat Ideal</h3>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>Hitung berapa yang perlu dikumpulkan sebagai safety net.</p>
        <label style={lbl}>Pengeluaran Bulanan (Rp)</label>
        <input style={inp} type="text" inputMode="numeric" placeholder="Misal: 5.000.000" value={expense} 
          onChange={e => setExpense(e.target.value.replace(/[^0-9.]/g,''))}
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
          {(['single','family'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ flex:1, padding:'10px', borderRadius:'var(--radius-md)', border:'1px solid', cursor:'pointer', fontWeight:'600', fontSize:'12px', transition:'all 0.15s', background: status===s ? 'var(--accent-primary)' : 'transparent', color: status===s ? 'var(--accent-primary-fg)' : 'var(--text-muted)', borderColor: status===s ? 'var(--accent-primary)' : 'var(--border-color)' }}>
              {s === 'single' ? '👤 Single (3×)' : '👪 Keluarga (6×)'}
            </button>
          ))}
        </div>
        {emergencyTarget > 0 && <div style={res}><div style={{ color:'var(--text-muted)', fontSize:'12px' }}>Target Dana Darurat</div><div style={{ fontSize:'24px', fontWeight:'600', color:'var(--accent-primary)', marginTop:'4px' }}>{fmt(emergencyTarget)}</div></div>}
      </div>

      {/* Rule of 72 */}
      <div style={cardStyle}>
        <h3 style={{ fontWeight:'500', fontSize:'16px', marginBottom:'6px' }}>🔢 rule of 72</h3>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>estimasi tahun uang anda berlipat dua berdasarkan roi investasi.</p>
        <label style={lbl}>return investasi per tahun (%)</label>
        <input style={inp} type="number" placeholder="Misal: 8" value={roi72} onChange={e => setRoi72(e.target.value)} 
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        {years72 && <div style={res}><div style={{ color:'var(--text-muted)', fontSize:'12px' }}>uang berlipat dua dalam</div><div style={{ fontSize:'24px', fontWeight:'600', color:'var(--color-positive)', marginTop:'4px' }}>{years72} tahun</div><div style={{ color:'var(--text-muted)', fontSize:'11px', marginTop:'6px' }}>roi {roi72}% per tahun</div></div>}
      </div>

      {/* DCA Simulator */}
      <div style={cardStyle}>
        <h3 style={{ fontWeight:'500', fontSize:'16px', marginBottom:'6px' }}>📈 simulasi dca</h3>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>estimasi nilai investasi rutin bulanan anda di masa depan.</p>
        <label style={lbl}>investasi per bulan (rp)</label>
        <input style={inp} type="text" inputMode="numeric" placeholder="Misal: 500.000" value={dcaMonthly} 
          onChange={e => setDcaMonthly(e.target.value.replace(/[^0-9.]/g,''))}
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'12px' }}>
          <div><label style={lbl}>roi / tahun (%)</label><input style={inp} type="number" placeholder="Misal: 10" value={dcaRoi} onChange={e => setDcaRoi(e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
          <div><label style={lbl}>durasi (tahun)</label><input style={inp} type="number" placeholder="Misal: 10" value={dcaYears} onChange={e => setDcaYears(e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
        </div>
        {dcaResult && <div style={res}><div style={{ color:'var(--text-muted)', fontSize:'12px' }}>estimasi nilai di akhir periode</div><div style={{ fontSize:'24px', fontWeight:'600', color:'var(--color-positive)', marginTop:'4px' }}>{fmt(dcaResult)}</div><div style={{ color:'var(--text-muted)', fontSize:'11px', marginTop:'6px' }}>modal: {fmt((parseFloat(dcaMonthly.replace(/\./g,''))||0)*(parseFloat(dcaYears)||0)*12)}</div></div>}
      </div>

      {/* Kalkulator Cicilan */}
      <div style={cardStyle}>
        <h3 style={{ fontWeight:'500', fontSize:'16px', marginBottom:'6px' }}>🧾 kalkulator cicilan</h3>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', marginBottom:'20px' }}>hitung cicilan bulanan dari pinjaman atau kpr anda.</p>
        <label style={lbl}>jumlah pinjaman (rp)</label>
        <input style={inp} type="text" inputMode="numeric" placeholder="Misal: 200.000.000" value={pinjaman} 
          onChange={e => setPinjaman(e.target.value.replace(/[^0-9.]/g,''))}
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'12px' }}>
          <div><label style={lbl}>bunga / tahun (%)</label><input style={inp} type="number" placeholder="Misal: 9" value={bungaThn} onChange={e => setBungaThn(e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
          <div><label style={lbl}>tenor (bulan)</label><input style={inp} type="number" placeholder="Misal: 60" value={tenor} onChange={e => setTenor(e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
        </div>
        {cicilan && <div style={res}><div style={{ color:'var(--text-muted)', fontSize:'12px' }}>cicilan per bulan</div><div style={{ fontSize:'24px', fontWeight:'600', color:'var(--color-negative)', marginTop:'4px' }}>{fmt(cicilan)}</div><div style={{ color:'var(--text-muted)', fontSize:'11px', marginTop:'6px' }}>total bayar: {fmt(cicilan*(parseFloat(tenor)||0))}</div></div>}
      </div>
    </div>
  );
}

// ─── Quiz Component ────────────────────────────────────────────────────────────
function QuizTab() {
  const [curr, setCurr]       = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [answers, setAnswers] = useState<(number|null)[]>(Array(QUIZ_QUESTIONS.length).fill(null));
  const [done, setDone]       = useState(false);

  const q = QUIZ_QUESTIONS[curr];
  const score = answers.filter((a,i) => a === QUIZ_QUESTIONS[i].ans).length;

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const updated = [...answers]; updated[curr] = idx; setAnswers(updated);
  }

  function next() {
    if (curr < QUIZ_QUESTIONS.length - 1) { setCurr(c => c+1); setSelected(answers[curr+1]); }
    else setDone(true);
  }

  function restart() { setCurr(0); setSelected(null); setAnswers(Array(QUIZ_QUESTIONS.length).fill(null)); setDone(false); }

  const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
  const verdict = pct >= 80 ? { label:'Elite Financier 🏆', color:'#10b981' } : pct >= 60 ? { label:'Finansial Sadar 📈', color:'#2563eb' } : { label:'Perlu Belajar Lagi 📚', color:'#f59e0b' };

  if (done) return (
    <div style={{ maxWidth:'520px', margin:'0 auto', textAlign:'center', padding:'60px 24px' }}>
      <div style={{ fontSize:'72px', marginBottom:'24px' }}>{pct >= 80 ? '🏆' : pct >= 60 ? '📈' : '📚'}</div>
      <h2 style={{ fontWeight:'500', fontSize:'22px', marginBottom:'8px' }}>quiz selesai!</h2>
      <div style={{ fontSize:'56px', fontWeight:'600', color:'var(--accent-primary)', marginBottom:'12px' }}>{pct}%</div>
      <div style={{ fontWeight:'500', color:'var(--text-main)', fontSize:'18px', marginBottom:'6px', letterSpacing:'-0.3px' }}>{verdict.label.toLowerCase()}</div>
      <div style={{ color:'var(--text-muted)', fontSize:'14px', marginBottom:'40px' }}>benar {score} dari {QUIZ_QUESTIONS.length} soal</div>
      
      <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'24px', marginBottom:'32px', textAlign:'left' }}>
        {QUIZ_QUESTIONS.map((q, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'10px 0', borderBottom: i < QUIZ_QUESTIONS.length-1 ? '1px solid var(--border-color)' : 'none' }}>
            <span style={{ fontSize:'18px' }}>{answers[i] === q.ans ? '✓' : '✕'}</span>
            <span style={{ fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.5', flex:1 }}>{q.q.toLowerCase()}</span>
          </div>
        ))}
      </div>
      
      <button onClick={restart} style={{ width:'100%', padding:'16px', background:'var(--accent-primary)', color:'var(--accent-primary-fg)', border:'none', borderRadius:'var(--radius-md)', fontWeight:'600', cursor:'pointer', fontSize:'15px', transition:'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>coba lagi</button>
    </div>
  );

  return (
    <div style={{ maxWidth:'580px', margin:'0 auto' }}>
      {/* Progress */}
      <div style={{ marginBottom:'32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'var(--text-muted)', marginBottom:'12px', fontWeight:'500' }}>
          <span>soal {curr+1} dari {QUIZ_QUESTIONS.length}</span>
          <span>{Math.round(((curr)/QUIZ_QUESTIONS.length)*100)}% selesai</span>
        </div>
        <div style={{ height:'6px', background:'var(--bg-secondary)', borderRadius:'99px', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${((curr)/QUIZ_QUESTIONS.length)*100}%`, background:'var(--accent-primary)', borderRadius:'99px', transition:'width .4s' }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'32px', marginBottom:'20px', boxShadow:'0 10px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize:'12px', fontWeight:'600', color:'var(--accent-primary)', marginBottom:'12px', letterSpacing:'0.05em' }}>pertanyaan {curr+1}</div>
        <h3 style={{ fontSize:'17px', fontWeight:'500', lineHeight:'1.5', marginBottom:'24px', letterSpacing:'-0.2px' }}>{q.q.toLowerCase()}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {q.opts.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect  = i === q.ans;
            const revealed   = selected !== null;
            let bg = 'transparent', border = 'var(--border-color)', color = 'var(--text-main)';
            if (revealed && isCorrect)  { bg = 'var(--color-positive-bg)'; border = 'var(--color-positive)'; color = 'var(--color-positive)'; }
            else if (revealed && isSelected && !isCorrect) { bg = 'var(--color-negative-bg)'; border = 'var(--color-negative)'; color = 'var(--color-negative)'; }
            else if (revealed) { opacity: 0.5; }
            
            return (
              <button key={i} onClick={() => handleAnswer(i)} style={{ padding:'16px 20px', background:bg, border:`1px solid ${border}`, borderRadius:'var(--radius-md)', color, textAlign:'left', cursor: revealed ? 'default' : 'pointer', fontSize:'14px', fontWeight:'500', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'14px' }}>
                <span style={{ width:'24px', height:'24px', borderRadius:'50%', border:`2px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', flexShrink:0 }}>
                  {revealed && isCorrect ? '✓' : revealed && isSelected && !isCorrect ? '✕' : String.fromCharCode(64+i+1)}
                </span>
                {opt.toLowerCase()}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div style={{ marginTop:'24px', padding:'16px 20px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.6' }}>
            💡 <strong>penjelasan:</strong> {q.explain.toLowerCase()}
          </div>
        )}
      </div>
      {selected !== null && (
        <button onClick={next} style={{ width:'100%', padding:'16px', background:'var(--accent-primary)', color:'var(--accent-primary-fg)', border:'none', borderRadius:'var(--radius-md)', fontWeight:'600', cursor:'pointer', fontSize:'15px', transition:'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
          {curr < QUIZ_QUESTIONS.length - 1 ? 'soal berikutnya →' : 'lihat hasil'}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AcademyClient() {
  const [activeTab, setActiveTab]     = useState('tips');
  const [tips, setTips]               = useState<Tip[]>(INITIAL_TIPS);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch]           = useState('');
  const [isAdding, setIsAdding]       = useState(false);
  const [editingId, setEditingId]     = useState<string|null>(null);
  const [formData, setFormData]       = useState({ icon:'🏷️', title:'', content:'', tip:'', category:'Tabungan' });
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [checkMonth, setCheckMonth]   = useState(() => new Date().toISOString().slice(0,7));

  useEffect(() => {
    const saved = localStorage.getItem('custom_academy_tips');
    if (saved) { const parsed: Tip[] = JSON.parse(saved).map((t:Tip) => ({...t,category:t.category||'Produktivitas'})); setTips([...INITIAL_TIPS,...parsed]); }
    const savedCheck = localStorage.getItem(`checklist_${checkMonth}`);
    if (savedCheck) setCheckedItems(new Set(JSON.parse(savedCheck)));
  }, [checkMonth]);

  const saveToLocal = (newTips: Tip[]) => { localStorage.setItem('custom_academy_tips', JSON.stringify(newTips.filter(t => t.id.startsWith('custom-')))); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) { const u = tips.map(t => t.id===editingId ? {...t,...formData} : t); setTips(u); saveToLocal(u); }
    else { const u = [...tips, {...formData, id:`custom-${Date.now()}`, isCustom:true}]; setTips(u); saveToLocal(u); }
    resetForm();
  };

  const handleDelete = (id: string) => { const u = tips.filter(t => t.id!==id); setTips(u); saveToLocal(u); };
  const startEdit   = (t: Tip) => { setFormData({icon:t.icon,title:t.title,content:t.content,tip:t.tip,category:t.category}); setEditingId(t.id); setIsAdding(true); };
  const resetForm   = () => { setFormData({icon:'🏷️',title:'',content:'',tip:'',category:'Tabungan'}); setIsAdding(false); setEditingId(null); };

  const toggleCheck = (id: string) => {
    const next = new Set(checkedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedItems(next);
    localStorage.setItem(`checklist_${checkMonth}`, JSON.stringify([...next]));
  };

  const filtered = tips.filter(t => {
    const matchCat  = activeCategory==='Semua' || t.category===activeCategory;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const checkCategories = [...new Set(CHECKLIST.map(c => c.category))];
  const totalChecked    = checkedItems.size;
  const checkPct        = Math.round((totalChecked / CHECKLIST.length) * 100);

  const lbl: React.CSSProperties = { display:'block', fontSize:'11px', color:'var(--text-muted)', fontWeight:'700', marginBottom:'6px', textTransform:'uppercase' };
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'var(--text-main)', fontSize:'13px', outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ color:'var(--text-main)' }}>
      {/* Header */}
      <header style={{ marginBottom:'40px' }}>
        <h1 style={{ fontSize:'24px', fontWeight:'600', marginBottom:'6px', letterSpacing:'-0.3px' }}>Akademi Finansial</h1>
        <p style={{ color:'var(--text-muted)', fontSize:'14px', margin:0 }}>Strategi, tools, dan evaluasi untuk mempercepat kebebasan finansial Anda.</p>
      </header>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', padding:'4px', marginBottom:'32px', overflowX:'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, minWidth:'120px', padding:'10px 14px', borderRadius:'var(--radius-sm)', border:'none', cursor:'pointer',
            fontSize:'13px', fontWeight:'500', transition:'all .15s', whiteSpace:'nowrap',
            background: activeTab===tab.id ? 'var(--card-bg)' : 'transparent',
            color: activeTab===tab.id ? 'var(--text-main)' : 'var(--text-muted)',
            boxShadow: activeTab===tab.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── TAB: TIPS ── */}
      {activeTab === 'tips' && (
        <>
          <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', flex:1 }}>
              <input placeholder="🔍 Cari strategi..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding:'12px 16px', background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box', transition:'border-color 0.15s' }} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {CATEGORIES.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding:'6px 14px', borderRadius:'99px', border:'1px solid', fontSize:'12px', fontWeight:'500', cursor:'pointer', transition:'all .15s', background:activeCategory===cat ? 'var(--accent-primary)' : 'transparent', borderColor:activeCategory===cat ? 'var(--accent-primary)' : 'var(--border-color)', color:activeCategory===cat ? 'var(--accent-primary-fg)' : 'var(--text-muted)' }}>{cat}</button>)}
              </div>
            </div>
            <button onClick={() => setIsAdding(true)} style={{ padding:'12px 20px', background:'var(--accent-primary)', border:'none', borderRadius:'var(--radius-md)', color:'var(--accent-primary-fg)', fontSize:'13px', fontWeight:'600', cursor:'pointer', flexShrink:0 }}>+ Tambah</button>
          </div>
          <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'20px' }}>Menampilkan <strong style={{ color:'var(--text-main)' }}>{filtered.length}</strong> dari {tips.length} strategi</div>
          {isAdding && (
            <div style={{ padding:'28px', marginBottom:'28px', background:'var(--bg-secondary)', border:'1px solid var(--accent-primary)', borderRadius:'var(--radius-lg)' }}>
              <h3 style={{ fontSize:'16px', fontWeight:'500', marginBottom:'20px' }}>{editingId ? 'Edit Strategi' : 'Tambah Strategi Baru'}</h3>
              <form onSubmit={handleSubmit} style={{ display:'grid', gap:'16px' }}>
                <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                  <div style={{ width:'80px' }}><label style={lbl}>Icon</label><input style={inp} value={formData.icon} onChange={e => setFormData({...formData,icon:e.target.value})} onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
                  <div style={{ flex:1, minWidth:'200px' }}><label style={lbl}>Judul</label><input style={inp} required value={formData.title} onChange={e => setFormData({...formData,title:e.target.value})} placeholder="Nama strategi..." onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
                  <div style={{ width:'160px' }}>
                    <label style={lbl}>Kategori</label>
                    <Select value={formData.category} onValueChange={(v) => v && setFormData({...formData,category:v})}>
                      <SelectTrigger style={{ width: '100%', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px', height: '42px' }}>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                        {CATEGORIES.filter(c=>c!=='Semua').map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><label style={lbl}>Penjelasan</label><textarea style={{...inp,height:'80px',paddingTop:'12px',resize:'none'}} required value={formData.content} onChange={e => setFormData({...formData,content:e.target.value})} placeholder="Jelaskan konsep strategi ini..." onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
                <div><label style={lbl}>Aksi di Dashboard</label><input style={inp} required value={formData.tip} onChange={e => setFormData({...formData,tip:e.target.value})} placeholder="Tindakan konkret..." onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} /></div>
                <div style={{ display:'flex', gap:'12px', marginTop:'8px' }}>
                  <button 
                    type="submit" 
                    disabled={!formData.title || !formData.content}
                    style={{ 
                      flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: (!formData.title || !formData.content) ? 'not-allowed' : 'pointer',
                      background: (!formData.title || !formData.content) ? 'var(--bg-secondary)' : 'var(--accent-primary)', 
                      color: (!formData.title || !formData.content) ? 'var(--text-muted)' : 'var(--accent-primary-fg)', 
                      border: (!formData.title || !formData.content) ? '1px solid var(--border-color)' : 'none'
                    }}
                  >
                    Simpan
                  </button>
                  <button type="button" onClick={resetForm} style={{ padding:'12px 24px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', cursor:'pointer', fontWeight:'500' }}>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'20px' }}>
            {filtered.map(t => (
              <div key={t.id} style={{ 
                padding:'24px', background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)',
                display:'flex', gap:'16px', transition:'all 0.2s',
              }}>
                <div style={{ fontSize:'32px', flexShrink:0 }}>{t.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'8px' }}>
                    <h3 style={{ fontSize:'15px', fontWeight:'500', margin:0, lineHeight:'1.4' }}>{t.title}</h3>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                      <span style={{ padding:'2px 8px', borderRadius:'var(--radius-sm)', fontSize:'10px', fontWeight:'600', background:'var(--bg-secondary)', color:'var(--text-muted)', border:'1px solid var(--border-color)', whiteSpace:'nowrap' }}>{t.category}</span>
                      {t.isCustom && <><button onClick={() => startEdit(t)} style={{ border:'none', background:'transparent', fontSize:'12px', cursor:'pointer', opacity:0.6 }}>✏️</button><button onClick={() => handleDelete(t.id)} style={{ border:'none', background:'transparent', fontSize:'12px', cursor:'pointer', opacity:0.6 }}>🗑️</button></>}
                    </div>
                  </div>
                  <p style={{ fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.6', margin:'0 0 12px' }}>{t.content}</p>
                  <div style={{ padding:'10px 14px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-color)', fontSize:'12px', fontWeight:'500', lineHeight:'1.5', color:'var(--text-main)' }}>💡 {t.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: CHECKLIST ── */}
      {activeTab === 'checklist' && (
        <div>
          {/* Header & Progress */}
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'28px', marginBottom:'24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap', gap:'16px' }}>
              <div>
                <h2 style={{ fontWeight:'500', fontSize:'18px', margin:'0 0 6px' }}>Checklist Keuangan Bulan Ini</h2>
                <p style={{ color:'var(--text-muted)', fontSize:'14px', margin:0 }}>Selesaikan semua tugas ini untuk kesehatan finansial optimal.</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <input type="month" value={checkMonth} onChange={e => { setCheckMonth(e.target.value); setCheckedItems(new Set(JSON.parse(localStorage.getItem(`checklist_${e.target.value}`)||'[]'))); }} style={{ padding:'8px 12px', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-main)', fontSize:'13px', cursor:'pointer', outline:'none' }} />
                <button onClick={() => { setCheckedItems(new Set()); localStorage.removeItem(`checklist_${checkMonth}`); }} style={{ padding:'8px 16px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:'12px', cursor:'pointer', fontWeight:'500' }}>reset</button>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ flex:1, height:'6px', background:'var(--bg-secondary)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${checkPct}%`, background: checkPct===100 ? 'var(--color-positive)' : 'var(--accent-primary)', borderRadius:'99px', transition:'width .6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
              </div>
              <span style={{ fontSize:'14px', fontWeight:'600', color: checkPct===100 ? 'var(--color-positive)' : 'var(--text-main)', minWidth:'48px' }}>{totalChecked}/{CHECKLIST.length}</span>
            </div>
            {checkPct === 100 && <div style={{ marginTop:'20px', padding:'12px', background:'var(--color-positive-bg)', border:'1px solid var(--color-positive)', borderRadius:'var(--radius-md)', fontSize:'13px', color:'var(--color-positive)', textAlign:'center', fontWeight:'500' }}>🏆 Luar biasa! Semua tugas bulan ini selesai. Anda adalah Elite Financier!</div>}
          </div>

          {checkCategories.map(cat => (
            <div key={cat} style={{ marginBottom:'24px' }}>
              <h3 style={{ fontSize:'12px', fontWeight:'500', color:'var(--text-muted)', letterSpacing:'.06em', marginBottom:'12px', paddingLeft:'4px' }}>{cat}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {CHECKLIST.filter(c => c.category===cat).map(item => {
                  const checked = checkedItems.has(item.id);
                  return (
                    <div key={item.id} onClick={() => toggleCheck(item.id)} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px 20px', background:'var(--card-bg)', border:`1px solid ${checked ? 'var(--color-positive)' : 'var(--border-color)'}`, borderRadius:'var(--radius-md)', cursor:'pointer', transition:'all 0.2s', opacity: checked ? 0.7 : 1 }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'var(--radius-sm)', border:`2px solid ${checked ? 'var(--color-positive)' : 'var(--border-color)'}`, background: checked ? 'var(--color-positive)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s', padding: '2px' }}>
                        {checked && <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize:'14px', color:'var(--text-main)', textDecoration: checked ? 'line-through' : 'none', lineHeight:'1.5' }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: KALKULATOR ── */}
      {activeTab === 'calc' && <KalkulatorTab />}

      {/* ── TAB: QUIZ ── */}
      {activeTab === 'quiz' && <QuizTab />}
    </div>
  );
}
