// components/ConfirmModal.tsx
// Gantikan window.confirm() dengan modal yang on-brand
'use client';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title = 'Konfirmasi', message,
  confirmLabel = 'Ya, hapus', cancelLabel = 'Batal',
  danger = true, onConfirm, onCancel,
}: Props) {
  if (!open) return null;

  return (
    <>
      <style>{`
        .confirm-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,.75);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadein .15s ease;
        }
        .confirm-box {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          width: 100%; max-width: 360px;
          animation: popIn .2s ease;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      <div className="confirm-overlay" onClick={onCancel}>
        <div className="confirm-box" onClick={e => e.stopPropagation()}>
          {/* Icon */}
          <div style={{
            width:'44px', height:'44px', borderRadius:'12px',
            background: danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'20px', marginBottom:'14px',
          }}>
            {danger ? '🗑️' : 'ℹ️'}
          </div>

          {/* Title */}
          <div style={{ fontSize:'16px', fontWeight:'600', color:'var(--text-main)', marginBottom:'8px' }}>
            {title}
          </div>

          {/* Message */}
          <div style={{ fontSize:'14px', color:'var(--text-muted)', marginBottom:'22px', lineHeight:'1.6' }}>
            {message}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={onCancel} style={{
              flex:1, padding:'11px',
              background:'transparent', border:'1px solid var(--border-color)',
              borderRadius:'9px', color:'var(--text-muted)',
              fontSize:'14px', fontWeight:'500', cursor:'pointer',
              transition:'border-color .15s',
            }}
              onMouseEnter={e => (e.currentTarget).style.borderColor='var(--accent-primary)'}
              onMouseLeave={e => (e.currentTarget).style.borderColor='var(--border-color)'}
            >
              {cancelLabel}
            </button>
            <button onClick={onConfirm} style={{
              flex:1, padding:'11px',
              background: danger ? '#ef4444' : '#2563eb',
              border:'none', borderRadius:'9px', color:'#fff',
              fontSize:'14px', fontWeight:'600', cursor:'pointer',
              transition:'background .15s',
            }}
              onMouseEnter={e => (e.currentTarget).style.background = danger ? '#dc2626' : '#1d4ed8'}
              onMouseLeave={e => (e.currentTarget).style.background = danger ? '#ef4444' : '#2563eb'}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
