// components/ConfirmModal.tsx
// Gantikan window.confirm() dengan modal yang on-brand
'use client';

import React, { useState } from 'react';

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
          background: rgba(0,0,0,.85);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadein .2s ease;
          backdrop-filter: blur(8px);
        }
        .confirm-box {
          background: var(--card-bg);
          border: 1px solid ${danger ? 'var(--color-negative)' : 'var(--border-color)'};
          border-radius: var(--radius-lg);
          padding: 32px;
          width: 100%; max-width: 420px;
          animation: popIn .3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      <div className="confirm-overlay" onClick={onCancel}>
        <div className="confirm-box" onClick={e => e.stopPropagation()}>
          {/* Icon */}
          <div style={{
            width:'56px', height:'56px', borderRadius:'var(--radius-md)',
            background: danger ? 'var(--color-negative-bg)' : 'var(--bg-secondary)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'28px', marginBottom:'24px',
            border: `1px solid ${danger ? 'var(--color-negative)' : 'var(--border-color)'}`,
          }}>
            {danger ? '⚠️' : 'ℹ️'}
          </div>

          {/* Title */}
          <div style={{ fontSize:'18px', fontWeight:'500', color:'var(--text-main)', marginBottom:'12px', letterSpacing:'-0.01em' }}>
            {title.toLowerCase()}
          </div>

          {/* Message */}
          <div style={{ fontSize:'14px', color:'var(--text-muted)', marginBottom: requireWord ? '20px' : '32px', lineHeight:'1.6' }}>
            {message.toLowerCase()}
          </div>

          {/* Verification Word Input */}
          {requireWord && (
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '400' }}>
                ketik <span style={{ color: 'var(--color-negative)', fontWeight: '600', fontFamily: 'monospace', background: 'var(--color-negative-bg)', padding: '2px 8px', borderRadius: '4px' }}>{requireWord.toUpperCase()}</span> untuk konfirmasi:
              </p>
              <input 
                type="text"
                autoFocus
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={requireWord.toUpperCase()}
                style={{
                  width: '100%', padding: '14px', background: 'var(--bg-secondary)',
                  border: `1px solid ${inputValue.toUpperCase() === requireWord.toUpperCase() ? 'var(--color-positive)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '15px', fontWeight: '600',
                  textAlign: 'center', letterSpacing: '2px', outline: 'none',
                  transition: 'all 0.2s',
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:'16px' }}>
            <button onClick={onCancel} style={{
              flex:1, padding:'14px',
              background:'transparent', border:'1px solid var(--border-color)',
              borderRadius:'var(--radius-md)', color:'var(--text-muted)',
              fontSize:'14px', fontWeight:'500', cursor:'pointer',
              transition:'all 0.2s',
            }}>
              {cancelLabel.toLowerCase()}
            </button>
            <button 
              onClick={() => { if (isConfirmed) onConfirm(); }} 
              disabled={!isConfirmed}
              style={{
                flex:1, padding:'14px',
                background: danger ? 'var(--color-negative)' : 'var(--accent-primary)',
                border:'none', borderRadius:'var(--radius-md)', color: danger ? '#fff' : 'var(--accent-primary-fg)',
                fontSize:'14px', fontWeight:'600', cursor: isConfirmed ? 'pointer' : 'not-allowed',
                transition:'all 0.2s',
                opacity: isConfirmed ? 1 : 0.4,
                boxShadow: isConfirmed ? '0 10px 20px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {confirmLabel.toLowerCase()}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
