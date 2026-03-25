// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      animation: 'pulse 1.5s infinite ease-in-out',
      background: 'var(--bg-main, #050507)',
      minHeight: '100vh'
    }}>
      {/* Skeleton Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: '200px', height: '32px', background: 'var(--bg-secondary, #0a0a0f)', borderRadius: '8px' }}></div>
        <div style={{ width: '150px', height: '40px', background: 'var(--bg-secondary, #0a0a0f)', borderRadius: '8px' }}></div>
      </div>

      {/* Skeleton Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: '16px' 
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '120px', background: 'var(--bg-secondary, #0a0a0f)', borderRadius: '16px' }}></div>
        ))}
      </div>

      {/* Skeleton Main Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '24px' 
      }}>
        <div style={{ height: '400px', background: 'var(--bg-secondary, #0a0a0f)', borderRadius: '24px' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ height: '180px', background: 'var(--bg-secondary, #0a0a0f)', borderRadius: '24px' }}></div>
          <div style={{ height: '180px', background: 'var(--bg-secondary, #0a0a0f)', borderRadius: '24px' }}></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.8; }
          100% { opacity: 0.6; }
        }
      `}} />
    </div>
  );
}
