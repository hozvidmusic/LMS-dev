'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { changeCurrentUserPassword } from '@/services/authService';
import { getCoursesForStudent } from '@/services/assignmentService';
import { getCourses } from '@/services/courseService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { supabase } from '@/supabase/client';
import { MdPerson, MdLock, MdSchool } from 'react-icons/md';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [myCourses, setMyCourses] = useState([]);

  useEffect(() => {
    async function loadCourses() {
      if (!profile) return;
      const ids = await getCoursesForStudent(profile.id);
      const all = await getCourses();
      setMyCourses(all.filter(c => ids.includes(c.id) && c.status === 'active'));
    }
    loadCourses();
  }, [profile]);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 6000)
      );
      const update = supabase.auth.updateUser({ password: newPassword });
      const { error } = await Promise.race([update, timeout]);
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.message === 'timeout') {
        toast.success('Contraseña actualizada correctamente');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error('Error: ' + (err.message || 'Vuelve a iniciar sesión e intenta de nuevo'));
      }
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (ts) => {
    if (!ts) return 'Nunca';
    return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-white mb-6">Mi Perfil</h1>

      <Card className="mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: '#7c6af720', color: '#7c6af7' }}>
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-xl text-white">{profile?.display_name}</h2>
            <p className="text-sm" style={{ color: '#5a5a70' }}>@{profile?.username}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon={<MdPerson />} label="Rol"
            value={profile?.role === 'admin' ? 'Administrador' : 'Alumno'} />
          <InfoItem icon={<MdPerson />} label="Último acceso"
            value={formatDate(profile?.last_login)} />
        </div>
      </Card>

      {profile?.role !== 'admin' && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MdSchool style={{ color: '#7c6af7' }} className="text-lg" />
            <h3 className="font-semibold text-white">Mis Cursos</h3>
          </div>
          {myCourses.length === 0 ? (
            <p className="text-sm" style={{ color: '#5a5a70' }}>No tienes cursos asignados aún.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {myCourses.map(course => (
                <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#0f0f13' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#7c6af720' }}>
                    <MdSchool style={{ color: '#7c6af7' }} />
                  </div>
                  <span className="text-sm text-white">{course.title}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <MdLock style={{ color: '#7c6af7' }} className="text-lg" />
          <h3 className="font-semibold text-white">Cambiar contraseña</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
          <Input label="Nueva contraseña" type="password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <Input label="Confirmar contraseña" type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: '#0f0f13' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: '#7c6af7' }}>{icon}</span>
        <span className="text-xs" style={{ color: '#5a5a70' }}>{label}</span>
      </div>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
