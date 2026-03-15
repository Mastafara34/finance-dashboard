// components/PWAInstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [prompt,  setPrompt]  = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Cek kalau sudah di-install atau sudah dismiss sebelumnya
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Cek kalau sudah standalone (sudah di-install)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Tampilkan setelah 3 detik
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  }

  if (!visible || !prompt) return null;

  return (
    <div className="pwa-install-banner">
      <div style={{ fontSize: '28px', flexShrink: 0 }}>📱</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f5', marginBottom: '2px' }}>
          Install FinTrack AI
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          Tambah ke homescreen untuk akses lebih cepat
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            padding: '7px 14px', background: '#2563eb', border: 'none',
            borderRadius: '8px', color: '#fff', fontSize: '12px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '7px 10px', background: 'transparent',
            border: '1px solid #2a2a3a', borderRadius: '8px',
            color: '#6b7280', fontSize: '12px', cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
