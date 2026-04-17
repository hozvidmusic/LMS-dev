'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithUsername } from '@/services/authService';
import { MdPerson, MdLock } from 'react-icons/md';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await loginWithUsername(username.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        toast.error('Usuario o contraseña incorrectos');
      } else if (err.message?.includes('Email not confirmed')) {
        toast.error('La cuenta no está confirmada. Contacta al administrador.');
      } else {
        toast.error('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0f0f13' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c6af7, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c6af7, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ background: '#7c6af720', border: '1px solid #7c6af740' }}>
            <Image src="/logo.png" alt="Hozvid Academy" width={48} height={48} />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Hozvid Academy</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Aprendizaje Musical</p>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: '#16161d', border: '1px solid #2a2a38' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Usuario</label>
              <div className="relative">
                <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: '#5a5a70' }} />
                <input type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="tu_usuario" autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}
                  onFocus={e => e.target.style.borderColor = '#7c6af7'}
                  onBlur={e => e.target.style.borderColor = '#333344'} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Contraseña</label>
              <div className="relative">
                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: '#5a5a70' }} />
                <input type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}
                  onFocus={e => e.target.style.borderColor = '#7c6af7'}
                  onBlur={e => e.target.style.borderColor = '#333344'} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all mt-2 disabled:opacity-50"
              style={{ background: '#7c6af7' }}
              onMouseEnter={e => !loading && (e.target.style.background = '#6a58e8')}
              onMouseLeave={e => e.target.style.background = '#7c6af7'}>
              {loading ? 'Entrando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
