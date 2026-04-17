'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/services/authService';
import toast from 'react-hot-toast';
import { MdDashboard, MdLibraryBooks, MdPerson, MdPeople, MdSchool, MdLogout, MdGroups } from 'react-icons/md';
import Image from 'next/image';

export default function Sidebar({ isOpen, onClose }) {
  const { profile } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
      router.push('/login');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }

  const sidebarStyle = {
    background: '#16161d',
    borderRight: '1px solid #2a2a38',
    width: '240px',
    flexShrink: 0,
  };

  return (
    <>
      <aside className="hidden md:flex flex-col h-full" style={sidebarStyle}>
        <SidebarContent profile={profile} onLogout={handleLogout} />
      </aside>
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={sidebarStyle}>
        <SidebarContent profile={profile} onLogout={handleLogout} onClose={onClose} />
      </aside>
    </>
  );
}

function NavItem({ href, icon, label, onClose }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive ? 'bg-[#7c6af720] text-[#7c6af7]' : 'text-[#9090a8] hover:text-white hover:bg-[#22222e]'
      }`}>
      {icon} {label}
    </Link>
  );
}

function SidebarContent({ profile, onLogout, onClose }) {
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 px-3 py-4 mb-6">
        <Image src="/logo.png" alt="Hozvid Academy" width={32} height={32} />
        <span className="font-display font-bold text-white text-lg">Hozvid</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <NavItem href="/dashboard" icon={<MdDashboard className="text-lg" />} label="Dashboard" onClose={onClose} />
        <NavItem href="/courses" icon={<MdLibraryBooks className="text-lg" />} label="Mis Cursos" onClose={onClose} />
        <NavItem href="/profile" icon={<MdPerson className="text-lg" />} label="Mi Perfil" onClose={onClose} />

        {isAdmin && (
          <>
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a70' }}>
                Administración
              </span>
            </div>
            <NavItem href="/admin/students" icon={<MdPeople className="text-lg" />} label="Alumnos" onClose={onClose} />
            <NavItem href="/admin/groups" icon={<MdGroups className="text-lg" />} label="Grupos" onClose={onClose} />
            <NavItem href="/admin/courses" icon={<MdSchool className="text-lg" />} label="Cursos" onClose={onClose} />
          </>
        )}
      </nav>

      <div className="mt-auto pt-4" style={{ borderTop: '1px solid #2a2a38' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: '#7c6af720', color: '#7c6af7' }}>
            {profile?.display_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
            <p className="text-xs truncate" style={{ color: '#5a5a70' }}>
              {profile?.role === 'admin' ? 'Administrador' : 'Alumno'}
            </p>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#f87171' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8717120'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <MdLogout className="text-lg" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
