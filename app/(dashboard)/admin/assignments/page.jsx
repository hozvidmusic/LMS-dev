'use client';
import { useEffect, useState } from 'react';
import { getCourses } from '@/services/courseService';
import { getCourseAssignments, assignCourse, removeAssignment } from '@/services/assignmentService';
import { getAllStudents } from '@/services/userService';
import { getGroups, getSubgroupsByGroup, getAllSubgroups } from '@/services/groupService';
import { getGroupMembers, getSubgroupMembers } from '@/services/groupService';
import { sendPushNotification } from '@/services/notificationService';
import { getAdminClient } from '@/supabase/adminClient';
const supabase = getAdminClient();
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { MdExpandMore, MdExpandLess, MdAdd, MdDelete } from 'react-icons/md';

export default function AssignmentsPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const c = await getCourses();
    setCourses(c);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ color: '#5a5a70' }}>Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Asignación de Cursos</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>
          Gestiona qué alumnos, grupos o subgrupos tienen acceso a cada curso.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {courses.length === 0 ? (
          <Card>
            <p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay cursos creados.</p>
          </Card>
        ) : courses.map(course => (
          <CourseAssignmentBlock key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

function CourseAssignmentBlock({ course }) {
  const [expanded, setExpanded] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const color = course.color || '#7c6af7';

  async function load() {
    const data = await getCourseAssignments(course.id);
    setAssignments(data);
    setLoaded(true);
  }

  async function handleExpand() {
    if (!loaded) await load();
    setExpanded(p => !p);
  }

  async function handleRemove(id) {
    if (!confirm('¿Quitar esta asignación?')) return;
    await removeAssignment(id);
    toast.success('Asignación eliminada');
    load();
  }

  // Separar asignaciones por tipo
  const directStudents = assignments.filter(a => a.user_id);
  const groupAssignments = assignments.filter(a => a.group_id);
  const subgroupAssignments = assignments.filter(a => a.subgroup_id);

  return (
    <Card>
      <button onClick={handleExpand} className="w-full flex items-center gap-4 text-left">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: color + '25' }}>
          {course.icon || '🎵'}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{course.title}</h3>
          {course.description && (
            <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{course.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loaded && (
            <span className="text-xs px-2 py-1 rounded-full"
              style={{ background: color + '20', color }}>
              {assignments.length} asignacion{assignments.length !== 1 ? 'es' : ''}
            </span>
          )}
          <span style={{ color: '#9090a8' }}>
            {expanded ? <MdExpandLess className="text-xl" /> : <MdExpandMore className="text-xl" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 flex flex-col gap-4" style={{ borderTop: '1px solid #2a2a38' }}>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAssign(true)}><MdAdd /> Asignar</Button>
          </div>

          {/* Alumnos directos */}
          {directStudents.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#5a5a70' }}>👤 Alumnos directos</p>
              <div className="flex flex-col gap-1">
                {directStudents.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: color + '20', color }}>
                        {a.profiles?.display_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-white">{a.profiles?.display_name}</span>
                      <span className="text-xs" style={{ color: '#5a5a70' }}>@{a.profiles?.username}</span>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => handleRemove(a.id)}>
                      <MdDelete />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grupos */}
          {groupAssignments.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#5a5a70' }}>👥 Grupos completos</p>
              <div className="flex flex-col gap-1">
                {groupAssignments.map(a => (
                  <GroupAssignmentRow key={a.id} assignment={a} color={color} onRemove={handleRemove} />
                ))}
              </div>
            </div>
          )}

          {/* Subgrupos */}
          {subgroupAssignments.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#5a5a70' }}>🔹 Subgrupos</p>
              <div className="flex flex-col gap-1">
                {subgroupAssignments.map(a => (
                  <SubgroupAssignmentRow key={a.id} assignment={a} onRemove={handleRemove} />
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: '#5a5a70' }}>
              Este curso no tiene asignaciones todavía.
            </p>
          )}
        </div>
      )}

      {showAssign && (
        <AssignModal
          course={course}
          onClose={() => setShowAssign(false)}
          onSave={() => { load(); setShowAssign(false); }}
        />
      )}
    </Card>
  );
}

function GroupAssignmentRow({ assignment, color, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [subgroups, setSubgroups] = useState([]);

  async function handleExpand() {
    if (!loaded) {
      const [mems, subs] = await Promise.all([
        getGroupMembers(assignment.group_id),
        getSubgroupsByGroup(assignment.group_id),
      ]);
      setMembers(mems);
      setSubgroups(subs);
      setLoaded(true);
    }
    setExpanded(p => !p);
  }

  // Agrupar miembros por subgrupo
  const grouped = { general: { label: 'General', color: '#5a5a70', members: [] } };
  subgroups.forEach(s => { grouped[s.id] = { label: s.name, color: s.color || '#7c6af7', members: [] }; });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a38' }}>
      <div className="flex items-center gap-3 px-3 py-2.5"
        style={{ background: '#16161f' }}>
        <button onClick={handleExpand} className="flex items-center gap-2 flex-1 text-left">
          <span style={{ color: '#9090a8' }}>
            {expanded ? <MdExpandLess /> : <MdExpandMore />}
          </span>
          <span className="text-sm font-medium text-white">👥 {assignment.groups?.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#22222e', color: '#9090a8' }}>Grupo completo</span>
        </button>
        <Button size="sm" variant="danger" onClick={() => onRemove(assignment.id)}>
          <MdDelete />
        </Button>
      </div>

      {expanded && loaded && (
        <div className="p-3 flex flex-col gap-3" style={{ background: '#12121a' }}>
          {members.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: '#5a5a70' }}>Sin alumnos en este grupo</p>
          ) : (() => {
            // Necesitamos subgrupos de cada miembro desde profile_subgroups
            // Por simplicidad mostramos todos bajo el grupo
            return members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: '#1c1c26' }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                  style={{ background: color + '20', color }}>
                  {m.profiles?.display_name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-white">{m.profiles?.display_name}</span>
                <span className="text-xs" style={{ color: '#5a5a70' }}>@{m.profiles?.username}</span>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function SubgroupAssignmentRow({ assignment, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const color = assignment.subgroups?.color || '#7c6af7';

  async function handleExpand() {
    if (!loaded) {
      const data = await getSubgroupMembers(assignment.subgroup_id);
      setMembers(data);
      setLoaded(true);
    }
    setExpanded(p => !p);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}30` }}>
      <div className="flex items-center gap-3 px-3 py-2.5"
        style={{ background: color + '10' }}>
        <button onClick={handleExpand} className="flex items-center gap-2 flex-1 text-left">
          <span style={{ color }}>
            {expanded ? <MdExpandLess /> : <MdExpandMore />}
          </span>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-medium" style={{ color }}>{assignment.subgroups?.name} — {assignment.subgroups?.groups?.name}</span>
        </button>
        <Button size="sm" variant="danger" onClick={() => onRemove(assignment.id)}>
          <MdDelete />
        </Button>
      </div>

      {expanded && (
        <div className="p-3 flex flex-col gap-1" style={{ background: '#12121a' }}>
          {members.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: '#5a5a70' }}>Sin alumnos en este subgrupo</p>
          ) : members.map(m => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: '#1c1c26' }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                style={{ background: color + '20', color }}>
                {m.profiles?.display_name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-white">{m.profiles?.display_name}</span>
              <span className="text-xs" style={{ color: '#5a5a70' }}>@{m.profiles?.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignModal({ course, onClose, onSave }) {
  const [assignType, setAssignType] = useState('student');
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [target, setTarget] = useState('');

  useEffect(() => {
    async function load() {
      const [s, g] = await Promise.all([getAllStudents(), getGroups()]);
      setStudents(s);
      setGroups(g);
    }
    load();
  }, []);

  async function handleTypeChange(type) {
    setAssignType(type);
    setTarget('');
    if (type === 'subgroup') {
      const allSubs = await getAllSubgroups();
      setSubgroups(allSubs);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!target) { toast.error('Selecciona un destino'); return; }
    try {
      await assignCourse({
        courseId: course.id,
        userId: assignType === 'student' ? target : null,
        groupId: assignType === 'group' ? target : null,
        subgroupId: assignType === 'subgroup' ? target : null,
      });
      let user_ids = null;
      if (assignType === 'student') {
        user_ids = [target];
      } else if (assignType === 'group') {
        const { data: members } = await supabase.from('profile_groups').select('user_id').eq('group_id', target);
        user_ids = (members || []).map(m => m.user_id);
      } else if (assignType === 'subgroup') {
        const { data: members } = await supabase.from('profile_subgroups').select('user_id').eq('subgroup_id', target);
        user_ids = (members || []).map(m => m.user_id);
      }
      sendPushNotification({ user_ids, title: '🎓 Nuevo curso disponible', body: course.title, url: '/courses' });
      toast.success('Curso asignado');
      onSave();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Asignar: ${course.title}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          {[
            { value: 'student', label: '👤 Alumno' },
            { value: 'group', label: '👥 Grupo' },
            { value: 'subgroup', label: '🔹 Subgrupo' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => handleTypeChange(opt.value)}
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>
            {assignType === 'student' ? 'Alumno' : assignType === 'group' ? 'Grupo' : 'Subgrupo'}
          </label>
          <select value={target} onChange={e => setTarget(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
            <option value="">— Selecciona —</option>
            {assignType === 'student' && students.map(s => (
              <option key={s.id} value={s.id} style={{ background: '#1c1c26' }}>
                {s.display_name} (@{s.username})
              </option>
            ))}
            {assignType === 'group' && groups.map(g => (
              <option key={g.id} value={g.id} style={{ background: '#1c1c26' }}>{g.name}</option>
            ))}
            {assignType === 'subgroup' && subgroups.map(s => (
              <option key={s.id} value={s.id} style={{ background: '#1c1c26' }}>{s.name} — {s.groups?.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">Asignar</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
