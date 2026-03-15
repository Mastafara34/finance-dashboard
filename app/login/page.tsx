// app/dashboard/page.tsx
// Placeholder — akan diisi dengan widget lengkap di sprint berikutnya
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Ambil data user
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, telegram_chat_id')
    .eq('email', user.email!)
    .maybeSingle();

  const firstName = profile?.display_name?.split(' ')[0] ?? 'Kamu';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          color: '#f0f0f5', fontSize: '24px', fontWeight: '600',
          margin: '0 0 6px', letterSpacing: '-0.5px',
        }}>
          Selamat datang, {firstName} 👋
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* Coming soon cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {[
          { icon: '◈', label: 'Net Worth',         desc: 'Total aset & liabilitas' },
          { icon: '↕', label: 'Cashflow Bulan Ini', desc: 'Pemasukan vs pengeluaran' },
          { icon: '◎', label: 'Goals Progress',     desc: 'Status semua tujuan finansial' },
          { icon: '▦', label: 'Grafik Analitik',    desc: 'Tren 30 hari terakhir' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#111118',
            border: '1px solid #1f1f2e',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '20px', marginBottom: '12px', color: '#2563eb',
            }}>{card.icon}</div>
            <div style={{
              color: '#f0f0f5', fontSize: '15px', fontWeight: '500', marginBottom: '4px',
            }}>{card.label}</div>
            <div style={{ color: '#374151', fontSize: '13px' }}>{card.desc}</div>
            <div style={{
              marginTop: '16px', fontSize: '11px', color: '#1f1f2e',
              fontWeight: '500', letterSpacing: '.05em',
            }}>COMING SOON</div>
          </div>
        ))}
      </div>

      {/* Telegram connection prompt */}
      {!profile?.telegram_chat_id && (
        <div style={{
          marginTop: '32px',
          padding: '20px 24px',
          background: '#0f1a0a',
          border: '1px solid #1a3a0f',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '24px' }}>📱</div>
          <div>
            <div style={{
              color: '#4ade80', fontSize: '14px', fontWeight: '500', marginBottom: '4px',
            }}>
              Hubungkan Telegram Bot
            </div>
            <div style={{ color: '#374151', fontSize: '13px' }}>
              Cari <strong style={{ color: '#6b7280' }}>@{process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'bot kamu'}</strong> di Telegram dan kirim /start untuk mulai input transaksi otomatis.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
