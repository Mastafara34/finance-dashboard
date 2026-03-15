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
          background: #111118;
          border: 1px solid #2a2a3a;
          border-radius: 16px;
          padding: 24px;
          width: 100%; max-width: 360px;
          animation: popIn .2s ease;
        }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      <div className="confirm-overlay" onClick={onCancel}>
        <div className="confirm-box" onClick={e => e.stopPropagation()}>
          {/* Icon */}
          <div style={{
            width:'44px', height:'44px', borderRadius:'12px',
            background: danger ? '#2d0f0f' : '#0c1f3a',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'20px', marginBottom:'14px',
          }}>
            {danger ? '🗑️' : 'ℹ️'}
          </div>

          {/* Title */}
          <div style={{ fontSize:'16px', fontWeight:'600', color:'#f0f0f5', marginBottom:'8px' }}>
            {title}
          </div>

          {/* Message */}
          <div style={{ fontSize:'14px', color:'#9ca3af', marginBottom:'22px', lineHeight:'1.6' }}>
            {message}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={onCancel} style={{
              flex:1, padding:'11px',
              background:'transparent', border:'1px solid #2a2a3a',
              borderRadius:'9px', color:'#9ca3af',
              fontSize:'14px', fontWeight:'500', cursor:'pointer',
              transition:'border-color .15s',
            }}
              onMouseEnter={e => (e.currentTarget).style.borderColor='#374151'}
              onMouseLeave={e => (e.currentTarget).style.borderColor='#2a2a3a'}
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
