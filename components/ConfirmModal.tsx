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
  requireWord?: string; // New: requirement to type this word
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title = 'Konfirmasi', message,
  confirmLabel = 'Ya, lanjutkan', cancelLabel = 'Batal',
  danger = true, requireWord, onConfirm, onCancel,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  if (!open) return null;

  const isConfirmed = requireWord ? inputValue.toUpperCase() === requireWord.toUpperCase() : true;

  return (
    <>
      <style>{`
        .confirm-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,.75);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadein .15s ease;
          backdrop-filter: blur(4px);
        }
        .confirm-box {
          background: var(--card-bg, #111118);
          border: 1px solid ${danger ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color, #1f1f2e)'};
          border-radius: 20px;
          padding: 28px;
          width: 100%; max-width: 400px;
          animation: popIn .2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      <div className="confirm-overlay" onClick={onCancel}>
        <div className="confirm-box" onClick={e => e.stopPropagation()}>
          {/* Icon */}
          <div style={{
            width:'48px', height:'48px', borderRadius:'14px',
            background: danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'24px', marginBottom:'18px',
            border: `1px solid ${danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.3)'}`,
          }}>
            {danger ? '⚠️' : 'ℹ️'}
          </div>

          {/* Title */}
          <div style={{ fontSize:'18px', fontWeight:'700', color:'var(--text-main, #f0f0f5)', marginBottom:'10px' }}>
            {title}
          </div>

          {/* Message */}
          <div style={{ fontSize:'14px', color:'var(--text-muted, #9ca3af)', marginBottom: requireWord ? '18px' : '24px', lineHeight:'1.6' }}>
            {message}
          </div>

          {/* Verification Word Input */}
          {requireWord && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>
                Ketik <span style={{ color: '#ef4444', fontWeight: '700', fontFamily: 'monospace', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{requireWord.toUpperCase()}</span> untuk konfirmasi:
              </p>
              <input 
                type="text"
                autoFocus
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={requireWord.toUpperCase()}
                style={{
                  width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${inputValue.toUpperCase() === requireWord.toUpperCase() ? '#10b981' : 'var(--border-color, #2a2a3a)'}`,
                  borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700',
                  textAlign: 'center', letterSpacing: '2px', outline: 'none',
                  transition: 'all 0.2s',
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:'12px' }}>
            <button onClick={onCancel} style={{
              flex:1, padding:'12px',
              background:'transparent', border:'1px solid var(--border-color, #2a2a3a)',
              borderRadius:'10px', color:'var(--text-muted, #9ca3af)',
              fontSize:'14px', fontWeight:'600', cursor:'pointer',
              transition:'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget).style.background='rgba(255,255,255,0.03)'; (e.currentTarget).style.borderColor='#4b5563'; }}
              onMouseLeave={e => { (e.currentTarget).style.background='transparent'; (e.currentTarget).style.borderColor='var(--border-color, #2a2a3a)'; }}
            >
              {cancelLabel}
            </button>
            <button 
              onClick={() => { if (isConfirmed) onConfirm(); }} 
              disabled={!isConfirmed}
              style={{
                flex:1, padding:'12px',
                background: danger ? '#ef4444' : '#2563eb',
                border:'none', borderRadius:'10px', color:'#fff',
                fontSize:'14px', fontWeight:'700', cursor: isConfirmed ? 'pointer' : 'not-allowed',
                transition:'all 0.2s',
                opacity: isConfirmed ? 1 : 0.4,
                boxShadow: isConfirmed ? (danger ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(37,99,235,0.3)') : 'none',
              }}
              onMouseEnter={e => { if (isConfirmed) (e.currentTarget).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { if (isConfirmed) (e.currentTarget).style.transform = 'translateY(0)'; }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
