import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase (Gunakan Anon Key untuk frontend/public read)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Memaksa halaman untuk selalu mengambil data terbaru (tidak di-cache)
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  // Ambil data transaksi beserta nama kategorinya (Ini setara dengan JOIN query di SQL)
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id, amount, note, date,
      categories ( name, type )
    `)
    .order('date', { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Gagal memuat data: {error.message}</div>;
  }

  // Kalkulasi Saldo
  let totalIncome = 0;
  let totalExpense = 0;

  transactions?.forEach((tx: any) => {
    if (tx.categories?.type === 'income') totalIncome += Number(tx.amount);
    if (tx.categories?.type === 'expense') totalExpense += Number(tx.amount);
  });

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-800 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Dashboard Finansial</h1>

        {/* Kartu Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Total Pemasukan</p>
            <p className="text-2xl font-bold text-green-600">Rp {totalIncome.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-red-600">Rp {totalExpense.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Sisa Saldo</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              Rp {balance.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Tabel Riwayat */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Riwayat Transaksi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 text-sm bg-white">
                  <th className="p-4 font-medium">Tanggal</th>
                  <th className="p-4 font-medium">Kategori</th>
                  <th className="p-4 font-medium">Catatan</th>
                  <th className="p-4 font-medium text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions?.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors bg-white">
                    <td className="p-4 text-sm whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        tx.categories?.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.categories?.name}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{tx.note || '-'}</td>
                    <td className={`p-4 text-sm text-right font-semibold whitespace-nowrap ${
                      tx.categories?.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.categories?.type === 'income' ? '+' : '-'} Rp {Number(tx.amount).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
                {transactions?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 bg-white">Belum ada transaksi dicatat. Cobalah kirim pesan ke Bot Telegram-mu!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}