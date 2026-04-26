'use client';
import { useEffect, useState } from 'react';

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // No mostrar si ya fue instalada o ya se cerró el banner
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) return;

    // Detectar si ya está instalada como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (isStandalone) return;

    // Detectar iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // En iOS no hay evento beforeinstallprompt, mostrar instrucciones manuales
      setTimeout(() => setShow(true), 2000);
    } else {
      // Android/PC — esperar evento del navegador
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setTimeout(() => setShow(true), 2000);
      });
    }
  }, []);

  function dismiss() {
    localStorage.setItem('pwa-banner-dismissed', '1');
    setShow(false);
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
      else setShow(false);
    }
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: 420,
      background: '#1c1c26',
      border: '1px solid #7c6af740',
      borderRadius: 20,
      padding: '20px 24px',
      zIndex: 9999,
      boxShadow: '0 8px 40px #00000060',
    }}>
      {/* Flecha decorativa */}
      <div style={{
        position: 'absolute',
        bottom: -10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 20,
        height: 10,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 14,
          height: 14,
          background: '#1c1c26',
          border: '1px solid #7c6af740',
          transform: 'rotate(45deg)',
          margin: '-7px auto 0',
        }} />
      </div>

      <div className="flex items-start gap-3">
        <img src="/icons/icon-72x72.png" alt="logo"
          style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
        <div className="flex-1">
          <p className="font-semibold text-white text-sm mb-1">
            📲 Instala Hozvid Academy
          </p>
          {isIOS ? (
            <p className="text-xs" style={{ color: '#9090a8', lineHeight: 1.5 }}>
              Toca el botón <strong style={{ color: '#7c6af7' }}>Compartir</strong> de Safari
              y luego <strong style={{ color: '#7c6af7' }}>"Agregar a pantalla de inicio"</strong>
              para instalarla como app.
            </p>
          ) : deferredPrompt ? (
            <p className="text-xs" style={{ color: '#9090a8', lineHeight: 1.5 }}>
              Instálala en tu dispositivo para acceder más rápido sin abrir el navegador.
            </p>
          ) : (
            <p className="text-xs" style={{ color: '#9090a8', lineHeight: 1.5 }}>
              En Chrome, toca el ícono <strong style={{ color: '#7c6af7' }}>⋮</strong> y
              selecciona <strong style={{ color: '#7c6af7' }}>"Instalar aplicación"</strong>
              para agregarla a tu pantalla de inicio.
            </p>
          )}
        </div>
        <button onClick={dismiss}
          style={{ color: '#5a5a70', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>✕</button>
      </div>

      {deferredPrompt && !isIOS && (
        <div className="flex gap-2 mt-4">
          <button onClick={install}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#7c6af7', color: 'white' }}>
            Instalar ahora
          </button>
          <button onClick={dismiss}
            className="px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: '#0f0f13', color: '#9090a8', border: '1px solid #2a2a38' }}>
            Ahora no
          </button>
        </div>
      )}

      {!deferredPrompt && !isIOS && (
        <button onClick={dismiss}
          className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#0f0f13', color: '#9090a8', border: '1px solid #2a2a38' }}>
          Entendido
        </button>
      )}
    </div>
  );
}