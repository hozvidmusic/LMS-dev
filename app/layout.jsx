import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata = {
  title: 'Hozvid Academy',
  description: 'Plataforma de aprendizaje musical',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}
        style={{ background: '#0f0f13', color: '#e8e8f0', margin: 0 }}>
        <AuthProvider>
          {children}
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
