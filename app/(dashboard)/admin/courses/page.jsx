'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, createCourse, updateCourse, toggleCourseStatus } from '@/services/courseService';
import { assignCourse, removeAssignment, getCourseAssignments } from '@/services/assignmentService';
import { getAllStudents } from '@/services/userService';
import { getGroups, getSubgroupsByGroup } from '@/services/groupService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdChevronRight, MdSchool, MdDelete } from 'react-icons/md';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [assignType, setAssignType] = useState('student');
  const [assignTarget, setAssignTarget] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allSubgroups, setAllSubgroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const router = useRouter();

  async function load() {
    const [c, s, g] = await Promise.all([getCourses(), getAllStudents(), getGroups()]);
    setCourses(c);
    setAllStudents(s);
    setAllGroups(g);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await createCourse(form);
    toast.success('Curso creado');
    setShowCreate(false);
    setForm({ title: '', description: '' });
    load();
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateCourse(selected.id, { title: selected.title, description: selected.description });
    toast.success('Curso actualizado');
    setShowEdit(false);
    load();
  }

  async function handleToggle(course) {
    await toggleCourseStatus(course.id, course.status);
    toast.success(`Curso ${course.status === 'active' ? 'desactivado' : 'activado'}`);
    load();
  }

  async function handleDelete(course) {
    if (!confirm(`¿Eliminar "${course.title}"?`)) return;
    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (error) { toast.error('Error al eliminar curso'); return; }
    toast.success('Curso eliminado');
    load();
  }

  async function openAssign(course) {
    setSelected(course);
    setAssignType('student');
    setAssignTarget('');
    setAllSubgroups([]);
    setShowAssign(true);
  }

  async function openMembers(course) {
    setSelected(course);
    const data = await getCourseAssignments(course.id);
    setAssignments(data);
    setShowMembers(true);
  }

  async function handleAssignTypeChange(type) {
    setAssignType(type);
    setAssignTarget('');
    if (type === 'subgroup') {
      const subs = await Promise.all(allGroups.map(g => getSubgroupsByGroup(g.id)));
      setAllSubgroups(subs.flat());
    }
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignTarget) { toast.error('Selecciona un destino'); return; }
    try {
      await assignCourse({
        courseId: selected.id,
        userId: assignType === 'student' ? assignTarget : null,
        groupId: assignType === 'group' ? assignTarget : null,
        subgroupId: assignType === 'subgroup' ? assignTarget : null,
      });
      toast.success('Curso asignado');
      setShowAssign(false);
    } catch (err) {
      toast.error('Error al asignar: ' + err.message);
    }
  }

  async function handleRemoveAssignment(id) {
    if (!confirm('¿Quitar esta asignación?')) return;
    await removeAssignment(id);
    toast.success('Asignación eliminada');
    const data = await getCourseAssignments(selected.id);
    setAssignments(data);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Cursos</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{courses.length} cursos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo curso</Button>
      </div>

      <div className="flex flex-col gap-3">
        {courses.length === 0 ? (
          <Card><div className="text-center py-12">
            <MdSchool className="text-4xl mx-auto mb-3" style={{ color: '#2a2a38' }} />
            <p style={{ color: '#5a5a70' }}>No hay cursos creados</p>
          </div></Card>
        ) : courses.map(course => (
          <Card key={course.id}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#7c6af720' }}>
                <MdSchool style={{ color: '#7c6af7' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{course.title}</h3>
                  <Badge status={course.status} />
                </div>
                {course.description && (
                  <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{course.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button size="sm" variant="secondary"
                  onClick={() => { setSelected({...course}); setShowEdit(true); }}>
                  <MdEdit />
                </Button>
                <Button size="sm" variant={course.status === 'active' ? 'danger' : 'secondary'}
                  onClick={() => handleToggle(course)}>
                  {course.status === 'active' ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => router.push(`/admin/courses/${course.id}/lessons`)}>
                  Lecciones <MdChevronRight />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openAssign(course)}>
                  📋 Asignar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openMembers(course)}>
                  👥 Alumnos
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(course)}>
                  <MdDelete />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo curso">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Título del curso" value={form.title} required
            onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Descripción</label>
            <textarea value={form.description}
              onChange={e => setForm(p => ({...p, description: e.target.value}))}
              rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear curso</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      {selected && (
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar curso">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Input label="Título" value={selected.title}
              onChange={e => setSelected(p => ({...p, title: e.target.value}))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Descripción</label>
              <textarea value={selected.description || ''}
                onChange={e => setSelected(p => ({...p, description: e.target.value}))}
                rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal asignar */}
      {selected && (
        <Modal isOpen={showAssign} onClose={() => setShowAssign(false)}
          title={`Asignar: ${selected.title}`}>
          <form onSubmit={handleAssign} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Asignar a</label>
              <div className="flex gap-2">
                {[
                  { value: 'student', label: '👤 Alumno' },
                  { value: 'group', label: '👥 Grupo' },
                  { value: 'subgroup', label: '🔹 Subgrupo' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => handleAssignTypeChange(opt.value)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: assignType === opt.value ? '#7c6af720' : '#22222e',
                      color: assignType === opt.value ? '#7c6af7' : '#9090a8',
                      border: `1px solid ${assignType === opt.value ? '#7c6af740' : '#333344'}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>
                {assignType === 'student' ? 'Alumno' : assignType === 'group' ? 'Grupo' : 'Subgrupo'}
              </label>
              <select value={assignTarget}
                onChange={e => setAssignTarget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Selecciona —</option>
                {assignType === 'student' && allStudents.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#1c1c26' }}>
                    {s.display_name} (@{s.username})
                  </option>
                ))}
                {assignType === 'group' && allGroups.map(g => (
                  <option key={g.id} value={g.id} style={{ background: '#1c1c26' }}>
                    {g.name}
                  </option>
                ))}
                {assignType === 'subgroup' && allSubgroups.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#1c1c26' }}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">Asignar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal ver alumnos */}
      {selected && (
        <Modal isOpen={showMembers} onClose={() => setShowMembers(false)}
          title={`Asignados: ${selected.title}`} size="lg">
          <div className="flex flex-col gap-3">
            {assignments.length === 0 ? (
              <p className="text-sm" style={{ color: '#5a5a70' }}>
                Este curso no tiene asignaciones todavía.
              </p>
            ) : assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                <div className="flex items-center gap-2">
                  {a.user_id && (
                    <>
                      <span>👤</span>
                      <span className="text-sm text-white">{a.profiles?.display_name}</span>
                      <span className="text-xs" style={{ color: '#5a5a70' }}>@{a.profiles?.username}</span>
                    </>
                  )}
                  {a.group_id && (
                    <>
                      <span>👥</span>
                      <span className="text-sm text-white">{a.groups?.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#22222e', color: '#9090a8' }}>Grupo</span>
                    </>
                  )}
                  {a.subgroup_id && (
                    <>
                      <span>🔹</span>
                      <span className="text-sm text-white">{a.subgroups?.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#22222e', color: '#9090a8' }}>Subgrupo</span>
                    </>
                  )}
                </div>
                <Button size="sm" variant="danger" onClick={() => handleRemoveAssignment(a.id)}>
                  <MdDelete />
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setShowMembers(false)} className="mt-2">
              Cerrar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
