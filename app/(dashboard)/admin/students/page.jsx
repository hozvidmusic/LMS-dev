'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllStudents, toggleStudentStatus, updateProfile } from '@/services/userService';
import { createStudent } from '@/services/authService';
import { getGroups, createGroup, updateGroup, deleteGroup,
  getSubgroupsByGroup, createSubgroup, updateSubgroup, deleteSubgroup,
  getGroupMembers, getSubgroupMembers, getStudentSubgroups,
  assignStudentToGroup, removeStudentFromGroup,
  assignStudentToSubgroup, removeStudentFromSubgroup,
  getStudentCurrentGroup } from '@/services/groupService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdPeople, MdDelete, MdGroups, MdExpandMore, MdExpandLess } from 'react-icons/md';

const PRESET_COLORS = [
  '#7c6af7','#f75c6a','#f7a23c','#3cf7a2','#3ca2f7',
  '#f73cf0','#f7e23c','#3cf7f0','#a2f73c','#f7603c',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Color</label>
      <div className="flex flex-wrap gap-2 mb-1">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className="w-6 h-6 rounded-full transition-all"
            style={{
              background: c,
              outline: value === c ? '3px solid white' : '3px solid transparent',
              outlineOffset: '2px',
            }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input type="color" value={value || '#7c6af7'} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5"
          style={{ background: '#0f0f13' }} />
        <input type="text" value={value || '#7c6af7'} onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}
          placeholder="#7c6af7" />
        <div className="w-9 h-9 rounded-xl" style={{ background: value || '#7c6af7' }} />
      </div>
    </div>
  );
}

export default function AdminStudents() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('students');

  useEffect(() => {
    if (profile && profile.role !== 'admin') router.push('/dashboard');
  }, [profile, router]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-white mb-6">Alumnos</h1>
      <div className="flex gap-2 mb-6">
        {[
          { key: 'students', label: '👤 Alumnos' },
          { key: 'groups', label: '👥 Grupos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? '#7c6af720' : '#1c1c26',
              color: tab === t.key ? '#7c6af7' : '#9090a8',
              border: `1px solid ${tab === t.key ? '#7c6af740' : '#2a2a38'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'students' && <StudentsTab />}
      {tab === 'groups' && <GroupsTab />}
    </div>
  );
}

// ─── PESTAÑA ALUMNOS ──────────────────────────────────────────
function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedStudentGroup, setSelectedStudentGroup] = useState(null);
  const [groupTarget, setGroupTarget] = useState('');
  const emptyForm = { username: '', displayName: '', password: '', groupId: '' };
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const [s, g] = await Promise.all([getAllStudents(), getGroups()]);
    setStudents(s);
    setGroups(g);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const newStudent = await createStudent({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
      });
      if (form.groupId && newStudent?.id) {
        try {
          await assignStudentToGroup({ userId: newStudent.id, groupId: form.groupId });
        } catch {}
      }
      toast.success('Alumno creado');
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      if (err.message?.includes('already registered')) toast.error('Ese usuario ya existe');
      else toast.error('Error: ' + err.message);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateProfile(selected.id, { display_name: selected.display_name });
    toast.success('Alumno actualizado');
    setShowEdit(false);
    load();
  }

  async function handleToggle(student) {
    await toggleStudentStatus(student.id, student.status);
    toast.success(`Alumno ${student.status === 'active' ? 'desactivado' : 'activado'}`);
    load();
  }

  async function handleDelete(student) {
    if (!confirm(`¿Eliminar a "${student.display_name}"?`)) return;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${student.id}`,
      { method: 'DELETE', headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY}`,
      }}
    );
    if (!response.ok) { toast.error('Error al eliminar alumno'); return; }
    await supabase.from('profiles').delete().eq('id', student.id);
    toast.success('Alumno eliminado');
    load();
  }

  async function openGroupModal(student) {
    setSelected(student);
    const current = await getStudentCurrentGroup(student.id);
    setSelectedStudentGroup(current);
    setGroupTarget(current?.group_id || '');
    setShowGroup(true);
  }

  async function handleAssignGroup(e) {
    e.preventDefault();
    try {
      if (selectedStudentGroup) {
        await removeStudentFromGroup(selected.id);
      }
      if (groupTarget) {
        await assignStudentToGroup({ userId: selected.id, groupId: groupTarget });
      }
      toast.success(groupTarget ? 'Grupo asignado' : 'Alumno removido del grupo');
      setShowGroup(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('es-ES') : '—';
  if (loading) return <div style={{ color: '#5a5a70' }}>Cargando...</div>;

  return (
    <>
      <div className="flex justify-end mb-4">
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
                {students.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #1c1c26' }} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: '#7c6af720', color: '#7c6af7' }}>
                          {s.display_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{s.display_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3" style={{ color: '#5a5a70' }}>@{s.username}</td>
                    <td className="py-3 px-3"><Badge status={s.status} /></td>
                    <td className="py-3 px-3" style={{ color: '#5a5a70' }}>{formatDate(s.last_login)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="secondary"
                          onClick={() => { setSelected({...s}); setShowEdit(true); }}>
                          <MdEdit />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openGroupModal(s)}>
                          <MdGroups />
                        </Button>
                        <Button size="sm" variant={s.status === 'active' ? 'danger' : 'secondary'}
                          onClick={() => handleToggle(s)}>
                          {s.status === 'active' ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(s)}>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Grupo (opcional)</label>
            <select value={form.groupId}
              onChange={e => setForm(p => ({...p, groupId: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
              <option value="">— Sin grupo —</option>
              {groups.map(g => (
                <option key={g.id} value={g.id} style={{ background: '#1c1c26' }}>{g.name}</option>
              ))}
            </select>
          </div>
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
        <Modal isOpen={showGroup} onClose={() => setShowGroup(false)}
          title={`Grupo de ${selected.display_name}`}>
          <form onSubmit={handleAssignGroup} className="flex flex-col gap-4">
            {selectedStudentGroup && (
              <div className="px-3 py-2 rounded-xl text-sm"
                style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
                Grupo actual: <strong>{selectedStudentGroup.groups?.name}</strong>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Asignar a grupo</label>
              <select value={groupTarget} onChange={e => setGroupTarget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Sin grupo —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id} style={{ background: '#1c1c26' }}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowGroup(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── PESTAÑA GRUPOS ───────────────────────────────────────────
function GroupsTab() {
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showCreateSubgroup, setShowCreateSubgroup] = useState(false);
  const [showEditSubgroup, setShowEditSubgroup] = useState(false);
  const [showManageSubgroups, setShowManageSubgroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [subgroupForm, setSubgroupForm] = useState({ name: '', description: '', color: '#7c6af7' });
  const [groupData, setGroupData] = useState({});
  const [memberSubgroups, setMemberSubgroups] = useState([]);

  async function load() {
    setGroups(await getGroups());
  }
  useEffect(() => { load(); }, []);

  async function loadGroupData(groupId) {
    const [subs, mems] = await Promise.all([
      getSubgroupsByGroup(groupId),
      getGroupMembers(groupId),
    ]);
    setGroupData(prev => ({ ...prev, [groupId]: { subs, mems, expanded: true } }));
  }

  function toggleExpand(group) {
    const current = groupData[group.id];
    if (!current) {
      loadGroupData(group.id);
    } else {
      setGroupData(prev => ({ ...prev, [group.id]: { ...prev[group.id], expanded: !prev[group.id].expanded } }));
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    await createGroup(groupForm);
    toast.success('Grupo creado');
    setShowCreateGroup(false);
    setGroupForm({ name: '', description: '' });
    load();
  }

  async function handleEditGroup(e) {
    e.preventDefault();
    await updateGroup(selectedGroup.id, { name: selectedGroup.name, description: selectedGroup.description });
    toast.success('Grupo actualizado');
    setShowEditGroup(false);
    load();
  }

  async function handleDeleteGroup(group) {
    if (!confirm(`¿Eliminar el grupo "${group.name}"?`)) return;
    await deleteGroup(group.id);
    toast.success('Grupo eliminado');
    load();
  }

  async function handleCreateSubgroup(e) {
    e.preventDefault();
    await createSubgroup({ groupId: selectedGroup.id, ...subgroupForm });
    toast.success('Subgrupo creado');
    setShowCreateSubgroup(false);
    setSubgroupForm({ name: '', description: '', color: '#7c6af7' });
    loadGroupData(selectedGroup.id);
  }

  async function handleEditSubgroup(e) {
    e.preventDefault();
    await updateSubgroup(selectedSubgroup.id, {
      name: selectedSubgroup.name,
      description: selectedSubgroup.description,
      color: selectedSubgroup.color,
    });
    toast.success('Subgrupo actualizado');
    setShowEditSubgroup(false);
    loadGroupData(selectedGroup.id);
  }

  async function handleDeleteSubgroup(groupId, subgroupId) {
    if (!confirm('¿Eliminar este subgrupo?')) return;
    await deleteSubgroup(subgroupId);
    toast.success('Subgrupo eliminado');
    loadGroupData(groupId);
  }

  async function openManageSubgroups(group, member) {
    setSelectedGroup(group);
    setSelectedMember(member);
    const subs = await getStudentSubgroups(member.profiles.id);
    setMemberSubgroups(subs.map(s => s.subgroup_id));
    setShowManageSubgroups(true);
  }

  async function toggleSubgroup(subgroupId, checked) {
    if (checked) {
      await assignStudentToSubgroup({ userId: selectedMember.profiles.id, subgroupId });
      setMemberSubgroups(p => [...p, subgroupId]);
    } else {
      await removeStudentFromSubgroup({ userId: selectedMember.profiles.id, subgroupId });
      setMemberSubgroups(p => p.filter(id => id !== subgroupId));
    }
    loadGroupData(selectedGroup.id);
  }

  async function handleRemoveMember(groupId, userId) {
    if (!confirm('¿Quitar este alumno del grupo? También se quitará de todos sus subgrupos.')) return;
    await removeStudentFromGroup(userId);
    toast.success('Alumno removido');
    loadGroupData(groupId);
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreateGroup(true)}><MdAdd /> Nuevo grupo</Button>
      </div>

      <div className="flex flex-col gap-3">
        {groups.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <MdGroups className="text-4xl mx-auto mb-3" style={{ color: '#2a2a38' }} />
              <p style={{ color: '#5a5a70' }}>No hay grupos creados</p>
            </div>
          </Card>
        ) : groups.map(group => {
          const data = groupData[group.id];
          const isExpanded = data?.expanded;
          const subs = data?.subs || [];
          const mems = data?.mems || [];

          return (
            <Card key={group.id}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#7c6af720' }}>
                  <MdGroups style={{ color: '#7c6af7' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary"
                    onClick={() => { setSelectedGroup({...group}); setShowEditGroup(true); }}>
                    <MdEdit />
                  </Button>
                  <Button size="sm" variant="secondary"
                    onClick={() => {
                      setSelectedGroup(group);
                      setSubgroupForm({ name: '', description: '', color: '#7c6af7' });
                      setShowCreateSubgroup(true);
                    }}>
                    <MdAdd /> Subgrupo
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteGroup(group)}>
                    <MdDelete />
                  </Button>
                  <button onClick={() => toggleExpand(group)}
                    className="p-1 rounded-lg" style={{ color: '#9090a8' }}>
                    {isExpanded ? <MdExpandLess className="text-xl" /> : <MdExpandMore className="text-xl" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid #2a2a38' }}>
                  {/* General — alumnos sin subgrupos */}
                  <GeneralSection
                    mems={mems}
                    groupId={group.id}
                    onRemove={handleRemoveMember}
                    onManageSubgroups={(member) => openManageSubgroups(group, member)}
                  />
                  {/* Subgrupos */}
                  {subs.map(sub => (
                    <SubgroupSection
                      key={sub.id}
                      sub={sub}
                      groupId={group.id}
                      onRemove={handleRemoveMember}
                      onManageSubgroups={(member) => openManageSubgroups(group, member)}
                      onEdit={() => { setSelectedGroup(group); setSelectedSubgroup({...sub}); setShowEditSubgroup(true); }}
                      onDelete={() => handleDeleteSubgroup(group.id, sub.id)}
                    />
                  ))}
                  {mems.length === 0 && subs.length === 0 && (
                    <p className="text-sm text-center py-3" style={{ color: '#5a5a70' }}>
                      Este grupo no tiene subgrupos ni alumnos. Agrega alumnos desde la pestaña Alumnos.
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} title="Nuevo grupo">
        <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
          <Input label="Nombre del grupo" value={groupForm.name} required
            onChange={e => setGroupForm(p => ({...p, name: e.target.value}))} />
          <Input label="Descripción" value={groupForm.description}
            onChange={e => setGroupForm(p => ({...p, description: e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear grupo</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreateGroup(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {selectedGroup && (
        <Modal isOpen={showEditGroup} onClose={() => setShowEditGroup(false)} title="Editar grupo">
          <form onSubmit={handleEditGroup} className="flex flex-col gap-4">
            <Input label="Nombre" value={selectedGroup.name}
              onChange={e => setSelectedGroup(p => ({...p, name: e.target.value}))} />
            <Input label="Descripción" value={selectedGroup.description || ''}
              onChange={e => setSelectedGroup(p => ({...p, description: e.target.value}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEditGroup(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedGroup && (
        <Modal isOpen={showCreateSubgroup} onClose={() => setShowCreateSubgroup(false)}
          title={`Nuevo subgrupo en ${selectedGroup.name}`}>
          <form onSubmit={handleCreateSubgroup} className="flex flex-col gap-4">
            <Input label="Nombre del subgrupo" value={subgroupForm.name} required
              onChange={e => setSubgroupForm(p => ({...p, name: e.target.value}))} />
            <Input label="Descripción" value={subgroupForm.description}
              onChange={e => setSubgroupForm(p => ({...p, description: e.target.value}))} />
            <ColorPicker value={subgroupForm.color} onChange={c => setSubgroupForm(p => ({...p, color: c}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Crear</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateSubgroup(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedSubgroup && (
        <Modal isOpen={showEditSubgroup} onClose={() => setShowEditSubgroup(false)} title="Editar subgrupo">
          <form onSubmit={handleEditSubgroup} className="flex flex-col gap-4">
            <Input label="Nombre" value={selectedSubgroup.name}
              onChange={e => setSelectedSubgroup(p => ({...p, name: e.target.value}))} />
            <Input label="Descripción" value={selectedSubgroup.description || ''}
              onChange={e => setSelectedSubgroup(p => ({...p, description: e.target.value}))} />
            <ColorPicker value={selectedSubgroup.color || '#7c6af7'}
              onChange={c => setSelectedSubgroup(p => ({...p, color: c}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEditSubgroup(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedMember && selectedGroup && (
        <Modal isOpen={showManageSubgroups} onClose={() => setShowManageSubgroups(false)}
          title={`Subgrupos de ${selectedMember.profiles?.display_name}`}>
          <div className="flex flex-col gap-2">
            <p className="text-sm mb-2" style={{ color: '#9090a8' }}>
              Selecciona los subgrupos a los que pertenece este alumno:
            </p>
            {groupData[selectedGroup.id]?.subs?.length === 0 ? (
              <p className="text-sm" style={{ color: '#5a5a70' }}>
                Este grupo no tiene subgrupos creados aún.
              </p>
            ) : groupData[selectedGroup.id]?.subs?.map(sub => (
              <label key={sub.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: '#0f0f13', border: `1px solid ${memberSubgroups.includes(sub.id) ? sub.color + '40' : '#2a2a38'}` }}>
                <input type="checkbox"
                  checked={memberSubgroups.includes(sub.id)}
                  onChange={e => toggleSubgroup(sub.id, e.target.checked)}
                  className="w-4 h-4" style={{ accentColor: sub.color }} />
                <div className="w-3 h-3 rounded-full" style={{ background: sub.color || '#7c6af7' }} />
                <span className="text-sm text-white">{sub.name}</span>
              </label>
            ))}
            <Button className="mt-2" onClick={() => setShowManageSubgroups(false)}>Listo</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function GeneralSection({ mems, groupId, onRemove, onManageSubgroups }) {
  const [expanded, setExpanded] = useState(false);

  // Alumnos sin ningún subgrupo asignado
  // Necesitamos cargar los subgrupos de cada miembro para saber si están en alguno
  const [membersWithSubs, setMembersWithSubs] = useState(null);

  useEffect(() => {
    async function load() {
      const results = await Promise.all(
        mems.map(async m => {
          const { data } = await supabase
            .from('profile_subgroups')
            .select('id')
            .eq('user_id', m.profiles.id)
            .limit(1);
          return { ...m, hasSubgroup: data?.length > 0 };
        })
      );
      setMembersWithSubs(results);
    }
    load();
  }, [mems]);

  const generalMembers = (membersWithSubs || []).filter(m => !m.hasSubgroup);
  if (generalMembers.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #5a5a7030' }}>
      <button onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        style={{ background: '#5a5a7010' }}>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#5a5a70' }} />
        <span className="text-sm font-semibold flex-1" style={{ color: '#9090a8' }}>General</span>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: '#5a5a7020', color: '#9090a8' }}>
          {generalMembers.length} alumno{generalMembers.length !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#9090a8' }}>{expanded ? <MdExpandLess /> : <MdExpandMore />}</span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 p-3" style={{ background: '#0f0f13' }}>
          {generalMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: '#1c1c26' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: '#5a5a7020', color: '#9090a8' }}>
                  {member.profiles?.display_name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-white">{member.profiles?.display_name}</span>
                <span className="text-xs" style={{ color: '#5a5a70' }}>@{member.profiles?.username}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => onManageSubgroups(member)}>
                  <MdGroups />
                </Button>
                <Button size="sm" variant="danger" onClick={() => onRemove(groupId, member.profiles.id)}>
                  <MdDelete />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubgroupSection({ sub, groupId, onRemove, onManageSubgroups, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function handleExpand() {
    if (!loaded) {
      const data = await getSubgroupMembers(sub.id);
      setMembers(data);
      setLoaded(true);
    }
    setExpanded(p => !p);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${sub.color}30` }}>
      <button onClick={handleExpand}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        style={{ background: sub.color + '10' }}>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: sub.color }} />
        <span className="text-sm font-semibold flex-1" style={{ color: sub.color }}>{sub.name}</span>
        {!expanded && (
          <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="secondary" onClick={onEdit}><MdEdit /></Button>
            <Button size="sm" variant="danger" onClick={onDelete}><MdDelete /></Button>
          </div>
        )}
        <span style={{ color: sub.color }}>{expanded ? <MdExpandLess /> : <MdExpandMore />}</span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 p-3" style={{ background: '#0f0f13' }}>
          <div className="flex justify-end gap-1 mb-2">
            <Button size="sm" variant="secondary" onClick={onEdit}><MdEdit /></Button>
            <Button size="sm" variant="danger" onClick={onDelete}><MdDelete /></Button>
          </div>
          {members.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: '#5a5a70' }}>Sin alumnos en este subgrupo</p>
          ) : members.map(member => (
            <div key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: '#1c1c26' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: sub.color + '20', color: sub.color }}>
                  {member.profiles?.display_name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-white">{member.profiles?.display_name}</span>
                <span className="text-xs" style={{ color: '#5a5a70' }}>@{member.profiles?.username}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => onManageSubgroups(member)}>
                  <MdGroups />
                </Button>
                <Button size="sm" variant="danger" onClick={() => onRemove(groupId, member.profiles.id)}>
                  <MdDelete />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
