import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '../components/DashboardComponents';

const FormulaCard = ({ title, formula, explanation, example }: { title: string, formula: string, explanation: string, example: string }) => (
  <Card style={{ marginBottom: '0' }}>
    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px' }}>{title}</h3>
    <div style={{ background: 'var(--bg-secondary)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px', color: '#10b981' }}>
      {formula}
    </div>
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px' }}>
      {explanation}
    </p>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.8 }}>
      <strong>Contoh:</strong> {example}
    </div>
  </Card>
);

const MetricBox = ({ label, value, sub }: { label: string, value: string, sub?: string }) => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 'bold' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px' }}>{value}</div>
    {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

export default async function IntelligencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) return null;

  // ── Fetch Data for Live Evaluation ──────────────────────────────────────────
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString();

  const [txsRes, assetsRes] = await Promise.all([
    supabase.from('transactions').select('amount, type').eq('user_id', profile.id).eq('is_deleted', false).gte('date', yearAgo),
    supabase.from('assets').select('value, is_liability').eq('user_id', profile.id).eq('is_deleted', false)
  ]);

  const txs = txsRes.data ?? [];
  const assets = assetsRes.data ?? [];

  // Calculations
  const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgMonthlyExpense = totalExpenses / 12 || 1; // Default 1 to avoid div by 0
  
  const totalWealth = assets.reduce((s, a) => s + (a.is_liability ? -a.value : a.value), 0);
  const fiNumber = avgMonthlyExpense * 12 * 25;
  const runwayMonths = Math.floor(totalWealth / avgMonthlyExpense);
  const fiPercentage = Math.min(Math.round((totalWealth / fiNumber) * 100), 100) || 0;

  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  return (
    <div style={{ color: 'var(--text-main)', padding: '20px', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Laporan Evaluasi & Intelegensi
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Analisis mendalam kesehatan finansial Anda berdasarkan data real-time.</p>
      </header>

      {/* SECTION 1: LIVE EVALUATION REPORT */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Laporan Evaluasi Berjalan</h2>
        </div>
        
        <Card style={{ padding: '24px', background: 'var(--card-bg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <MetricBox label="Kekayaan Bersih" value={fmt(totalWealth)} sub="Total Aset - Liabilitas" />
            <MetricBox label="Target Kebebasan (FI)" value={fmt(fiNumber)} sub={`Target 25x Pengeluaran Tahunan`} />
            <MetricBox label="Runway Finansial" value={`${runwayMonths} Bulan`} sub="Kemampuan Bertahan Tanpa Income" />
            <MetricBox label="Progres Kebebasan" value={`${fiPercentage}%`} sub={`${fmt(fiNumber - totalWealth)} Lagi`} />
          </div>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Skor Kesiapan Pensiun</span>
              <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '700' }}>{fiPercentage}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${fiPercentage}%`, background: 'var(--accent-primary)', borderRadius: '99px', transition: 'width 1s ease' }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.5' }}>
              Berdasarkan pola pengeluaran Anda selama 12 bulan terakhir ({fmt(avgMonthlyExpense)}/bln), 
              Anda memerlukan aset minimal {fmt(fiNumber)} untuk mencapai kebebasan finansial mutlak. 
              Saat ini Anda menguasai **{runwayMonths} bulan** waktu hidup dari aset Anda.
            </p>
          </div>
        </Card>
      </section>

      {/* SECTION 2: TRANSPARENCY FORMULAS */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>🧠</span>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Transparansi Logika (FI Center)</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
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
          title="Custom Budget Targets (Personalized)"
          formula="Saving > S%, Wants < W%, Needs < N%"
          explanation="Target ini tidak lagi statis. Anda bisa mengaturnya di halaman Budget. Sistem akan menyesuaikan skor kesehatan dan rekomendasi berdasarkan target personal yang Anda tetapkan sendiri."
          example="Jika Anda set target Saving 40%, maka skor kesehatan akan maksimal hanya jika tabungan Anda mencapai 40%."
        />

        <FormulaCard 
          title="Opportunity Cost (Kopi Premium)"
          formula="Future Value of Annuity (Daily Savings × Days × Rate)"
          explanation="Menunjukkan kekuatan uang kecil jika diinvestasikan dalam jangka panjang. Kami menggunakan asumsi imbal hasil moderat untuk memotivasi Anda mengurangi pengeluaran impulsif."
          example="Rp 50rb/hari selama 20 tahun bisa menjadi ratusan juta rupiah."
        />
      </div>
    </section>

      <footer style={{ marginTop: '40px', padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px', borderTop: '1px solid #1f1f2e' }}>
        <p>Logika ini disusun berdasarkan standar perencanaan keuangan profesional (Certified Financial Planner - CFP).</p>
      </footer>
    </div>
  );
}
