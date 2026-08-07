import { useState, useEffect } from 'react';

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const handler = (event: Event & { detail?: { sw?: { skipWaiting: () => Promise<void> } } }) => {
      setUpdateSW(() => async () => {
        if (event.detail?.sw) {
          await event.detail.sw.skipWaiting();
        }
        window.location.reload();
      });
      setNeedRefresh(true);
    };

    window.addEventListener('need-refresh', handler as EventListener);
    return () => window.removeEventListener('need-refresh', handler as EventListener);
  }, []);

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      background: '#1e293b',
      color: 'white',
      padding: '0.75rem 1rem',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      zIndex: 100,
      fontSize: '0.8125rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      <span>Nueva versión disponible</span>
      <button
        onClick={() => updateSW?.()}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.375rem 0.75rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.8125rem',
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
