import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import PWAInstallBanner from '@/components/PWAInstallBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata = {
  title: 'Hozvid Academy',
  description: 'Plataforma de aprendizaje musical',
  manifest: '/manifest.json',
  themeColor: '#7c6af7',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hozvid Academy',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c6af7" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hozvid Academy" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}
        style={{ background: '#0f0f13', color: '#e8e8f0', margin: 0 }}>
        <AuthProvider>
          {children}
          <PWAInstallBanner />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1c1c26',
                color: '#e8e8f0',
                border: '1px solid #333344',
                borderRadius: '10px',
              },
              success: { iconTheme: { primary: '#4ade80', secondary: '#1c1c26' } },
              error: { iconTheme: { primary: '#f87171', secondary: '#1c1c26' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}