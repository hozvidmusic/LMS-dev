'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllStudents, toggleStudentStatus, updateProfile,
  assignCoursesToStudent, getAssignedCourseIds } from '@/services/userService';
import { createStudent } from '@/services/authService';
import { getCourses } from '@/services/courseService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdPeople, MdDelete } from 'react-icons/md';

export default function AdminStudents() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignedIds, setAssignedIds] = useState([]);
  const emptyForm = { username: '', displayName: '', password: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (profile && profile.role !== 'admin') router.push('/dashboard');
  }, [profile, router]);

  async function load() {
    const [s, c] = await Promise.all([getAllStudents(), getCourses()]);
    setStudents(s);
    setCourses(c.filter(c => c.status === 'active'));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createStudent({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
      });
      toast.success('Alumno creado');
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      if (err.message?.includes('already registered')) toast.error('Ese usuario ya existe');
      else toast.error('Error al crear alumno: ' + err.message);
    }
  }

  async function handleToggle(student) {
    await toggleStudentStatus(student.id, student.status);
    toast.success(`Alumno ${student.status === 'active' ? 'desactivado' : 'activado'}`);
    load();
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateProfile(selected.id, { display_name: selected.display_name });
    toast.success('Alumno actualizado');
    setShowEdit(false);
    load();
  }

  async function handleDelete(student) {
    if (!confirm(`¿Eliminar a "${student.display_name}"? Esta acción no se puede deshacer.`)) return;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${student.id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!response.ok) { toast.error('Error al eliminar alumno'); return; }
    await supabase.from('profiles').delete().eq('id', student.id);
    toast.success('Alumno eliminado');
    load();
  }

  async function openAssign(student) {
    const ids = await getAssignedCourseIds(student.id);
    setAssignedIds(ids);
    setSelected(student);
    setShowAssign(true);
  }

  async function handleAssign(courseId, checked) {
    const updated = checked ? [...assignedIds, courseId] : assignedIds.filter(id => id !== courseId);
    await assignCoursesToStudent(selected.id, updated);
    setAssignedIds(updated);
    toast.success('Cursos actualizados');
  }

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('es-ES') : '—';

  if (loading) return <div style={{ color: '#5a5a70' }}>Cargando alumnos...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Alumnos</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>
            {students.length} alumno{students.length !== 1 ? 's' : ''} registrado{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo alumno</Button>
      </div>

      <Card>
        {students.length === 0 ? (
          <div className="text-center py-12">
            <MdPeople className="text-4xl mx-auto mb-3" style={{ color: '#2a2a38' }} />
            <p style={{ color: '#5a5a70' }}>No hay alumnos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a38' }}>
                  {['Alumno','Usuario','Estado','Último acceso','Acciones'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#5a5a70' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #1c1c26' }}
                    className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: '#7c6af720', color: '#7c6af7' }}>
                          {student.display_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{student.display_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3" style={{ color: '#5a5a70' }}>@{student.username}</td>
                    <td className="py-3 px-3"><Badge status={student.status} /></td>
                    <td className="py-3 px-3" style={{ color: '#5a5a70' }}>{formatDate(student.last_login)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="secondary"
                          onClick={() => { setSelected({...student}); setShowEdit(true); }}>
                          <MdEdit />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openAssign(student)}>📚</Button>
                        <Button size="sm" variant={student.status === 'active' ? 'danger' : 'secondary'}
                          onClick={() => handleToggle(student)}>
                          {student.status === 'active' ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(student)}>
                          <MdDelete />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo alumno">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Nombre completo" value={form.displayName} required
            onChange={e => setForm(p => ({...p, displayName: e.target.value}))} />
          <Input label="Nombre de usuario" value={form.username} required
            placeholder="sin espacios, ej: juan_garcia"
            onChange={e => setForm(p => ({...p, username: e.target.value}))} />
          <Input label="Contraseña inicial" type="password" value={form.password} required
            onChange={e => setForm(p => ({...p, password: e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear alumno</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar alumno">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Input label="Nombre completo" value={selected.display_name}
              onChange={e => setSelected(p => ({...p, display_name: e.target.value}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal isOpen={showAssign} onClose={() => setShowAssign(false)}
          title={`Cursos de ${selected.display_name}`}>
          <p className="text-sm mb-4" style={{ color: '#5a5a70' }}>
            Selecciona los cursos que puede ver este alumno.
          </p>
          <div className="flex flex-col gap-2">
            {courses.map(course => (
              <label key={course.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                <input type="checkbox"
                  checked={assignedIds.includes(course.id)}
                  onChange={e => handleAssign(course.id, e.target.checked)}
                  className="accent-purple-500 w-4 h-4" />
                <span className="text-sm text-white">{course.title}</span>
              </label>
            ))}
          </div>
          <Button className="w-full mt-4" onClick={() => setShowAssign(false)}>Listo</Button>
        </Modal>
      )}
    </div>
  );
}
