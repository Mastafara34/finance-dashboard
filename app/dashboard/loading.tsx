// app/dashboard/loading.tsx
import DashboardSkeleton from './components/DashboardSkeleton';

/**
 * Next.js secara otomatis menggunakan file loading.tsx sebagai boundary Suspense
 * untuk seluruh route /dashboard. Saat halaman sedang di-render di server,
 * skeleton ini akan langsung tampil di browser pengguna, menghilangkan delay "blank page".
 */
export default function Loading() {
  return <DashboardSkeleton />;
}
