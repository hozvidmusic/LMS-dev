'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, createCourse, updateCourse, toggleCourseStatus } from '@/services/courseService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdChevronRight, MdSchool, MdDelete } from 'react-icons/md';

const PRESET_COLORS = [
  '#7c6af7','#f75c6a','#f7a23c','#3cf7a2','#3ca2f7',
  '#f73cf0','#f7e23c','#3cf7f0','#a2f73c','#f7603c',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Color del curso</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className="w-7 h-7 rounded-full transition-all"
            style={{
              background: c,
              outline: value === c ? `3px solid white` : '3px solid transparent',
              outlineOffset: '2px',
            }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input type="color" value={value || '#7c6af7'} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
          style={{ background: '#0f0f13' }} />
        <input type="text" value={value || '#7c6af7'} onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}
          placeholder="#7c6af7" />
        <div className="w-10 h-10 rounded-xl" style={{ background: value || '#7c6af7' }} />
      </div>
    </div>
  );
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', color: '#7c6af7' });
  const router = useRouter();

  async function load() {
    const c = await getCourses();
    setCourses(c);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await createCourse(form);
    toast.success('Curso creado');
    setShowCreate(false);
    setForm({ title: '', description: '', color: '#7c6af7' });
    load();
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateCourse(selected.id, {
      title: selected.title,
      description: selected.description,
      color: selected.color,
    });
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
                style={{ background: (course.color || '#7c6af7') + '30' }}>
                <MdSchool style={{ color: course.color || '#7c6af7' }} />
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
          <ColorPicker value={form.color} onChange={c => setForm(p => ({...p, color: c}))} />
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
            <ColorPicker value={selected.color || '#7c6af7'}
              onChange={c => setSelected(p => ({...p, color: c}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
