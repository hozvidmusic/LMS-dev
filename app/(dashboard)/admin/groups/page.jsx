'use client';
import { useEffect, useState } from 'react';
import { getGroups, createGroup, updateGroup, deleteGroup, toggleGroupStatus,
  getSubgroupsByGroup, createSubgroup, deleteSubgroup,
  getGroupMembers, assignStudentToGroup, removeStudentFromGroup } from '@/services/groupService';
import { getAllStudents } from '@/services/userService';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdPeople, MdExpandMore, MdExpandLess } from 'react-icons/md';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [subgroups, setSubgroups] = useState({});
  const [members, setMembers] = useState({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showCreateSubgroup, setShowCreateSubgroup] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [subgroupForm, setSubgroupForm] = useState({ name: '', description: '' });
  const [assignForm, setAssignForm] = useState({ userId: '', subgroupId: '' });

  async function load() {
    const [g, s] = await Promise.all([getGroups(), getAllStudents()]);
    setGroups(g);
    setStudents(s);
  }

  useEffect(() => { load(); }, []);

  async function toggleExpand(group) {
    const isOpen = expanded[group.id];
    setExpanded(prev => ({ ...prev, [group.id]: !isOpen }));
    if (!isOpen) {
      const [subs, mems] = await Promise.all([
        getSubgroupsByGroup(group.id),
        getGroupMembers(group.id),
      ]);
      setSubgroups(prev => ({ ...prev, [group.id]: subs }));
      setMembers(prev => ({ ...prev, [group.id]: mems }));
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
    setSubgroupForm({ name: '', description: '' });
    const subs = await getSubgroupsByGroup(selectedGroup.id);
    setSubgroups(prev => ({ ...prev, [selectedGroup.id]: subs }));
  }

  async function handleDeleteSubgroup(groupId, subgroupId) {
    if (!confirm('¿Eliminar este subgrupo?')) return;
    await deleteSubgroup(subgroupId);
    toast.success('Subgrupo eliminado');
    const subs = await getSubgroupsByGroup(groupId);
    setSubgroups(prev => ({ ...prev, [groupId]: subs }));
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignForm.userId) { toast.error('Selecciona un alumno'); return; }
    await assignStudentToGroup({
      userId: assignForm.userId,
      groupId: selectedGroup.id,
      subgroupId: assignForm.subgroupId || null,
    });
    toast.success('Alumno asignado');
    setShowAssign(false);
    setAssignForm({ userId: '', subgroupId: '' });
    const mems = await getGroupMembers(selectedGroup.id);
    setMembers(prev => ({ ...prev, [selectedGroup.id]: mems }));
  }

  async function handleRemoveMember(groupId, memberId) {
    if (!confirm('¿Quitar este alumno del grupo?')) return;
    await removeStudentFromGroup(memberId);
    toast.success('Alumno removido');
    const mems = await getGroupMembers(groupId);
    setMembers(prev => ({ ...prev, [groupId]: mems }));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Grupos</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{groups.length} grupos</p>
        </div>
        <Button onClick={() => setShowCreateGroup(true)}><MdAdd /> Nuevo grupo</Button>
      </div>

      <div className="flex flex-col gap-3">
        {groups.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <MdPeople className="text-4xl mx-auto mb-3" style={{ color: '#2a2a38' }} />
              <p style={{ color: '#5a5a70' }}>No hay grupos creados</p>
            </div>
          </Card>
        ) : groups.map(group => (
          <Card key={group.id}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#7c6af720' }}>
                <MdPeople style={{ color: '#7c6af7' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{group.name}</h3>
                  <Badge status={group.status} />
                </div>
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
                  onClick={() => { setSelectedGroup(group); setShowAssign(true); setAssignForm({ userId: '', subgroupId: '' }); }}>
                  <MdAdd /> Alumno
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => { setSelectedGroup(group); setShowCreateSubgroup(true); }}>
                  <MdAdd /> Subgrupo
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteGroup(group)}>
                  <MdDelete />
                </Button>
                <button onClick={() => toggleExpand(group)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: '#9090a8' }}>
                  {expanded[group.id] ? <MdExpandLess className="text-xl" /> : <MdExpandMore className="text-xl" />}
                </button>
              </div>
            </div>

            {expanded[group.id] && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #2a2a38' }}>
                {/* Subgrupos */}
                {subgroups[group.id]?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: '#5a5a70' }}>Subgrupos</p>
                    <div className="flex flex-col gap-2">
                      {subgroups[group.id].map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg"
                          style={{ background: '#0f0f13' }}>
                          <span className="text-sm text-white">🔹 {sub.name}</span>
                          <Button size="sm" variant="danger"
                            onClick={() => handleDeleteSubgroup(group.id, sub.id)}>
                            <MdDelete />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Miembros */}
                {members[group.id]?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: '#5a5a70' }}>Alumnos</p>
                    <div className="flex flex-col gap-2">
                      {members[group.id].map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded-lg"
                          style={{ background: '#0f0f13' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                              style={{ background: '#7c6af720', color: '#7c6af7' }}>
                              {member.profiles?.display_name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm text-white">{member.profiles?.display_name}</span>
                            {member.subgroups && (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: '#22222e', color: '#9090a8' }}>
                                {member.subgroups.name}
                              </span>
                            )}
                          </div>
                          <Button size="sm" variant="danger"
                            onClick={() => handleRemoveMember(group.id, member.id)}>
                            <MdDelete />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!subgroups[group.id]?.length && !members[group.id]?.length) && (
                  <p className="text-sm" style={{ color: '#5a5a70' }}>
                    Este grupo no tiene subgrupos ni alumnos aún.
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Modal crear grupo */}
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

      {/* Modal editar grupo */}
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

      {/* Modal crear subgrupo */}
      {selectedGroup && (
        <Modal isOpen={showCreateSubgroup} onClose={() => setShowCreateSubgroup(false)}
          title={`Nuevo subgrupo en ${selectedGroup.name}`}>
          <form onSubmit={handleCreateSubgroup} className="flex flex-col gap-4">
            <Input label="Nombre del subgrupo" value={subgroupForm.name} required
              onChange={e => setSubgroupForm(p => ({...p, name: e.target.value}))} />
            <Input label="Descripción" value={subgroupForm.description}
              onChange={e => setSubgroupForm(p => ({...p, description: e.target.value}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Crear</Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateSubgroup(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal asignar alumno */}
      {selectedGroup && (
        <Modal isOpen={showAssign} onClose={() => setShowAssign(false)}
          title={`Agregar alumno a ${selectedGroup.name}`}>
          <form onSubmit={handleAssign} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Alumno</label>
              <select value={assignForm.userId}
                onChange={e => setAssignForm(p => ({...p, userId: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Selecciona un alumno —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#1c1c26' }}>
                    {s.display_name} (@{s.username})
                  </option>
                ))}
              </select>
            </div>
            {subgroups[selectedGroup.id]?.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: '#9090a8' }}>
                  Subgrupo (opcional)
                </label>
                <select value={assignForm.subgroupId}
                  onChange={e => setAssignForm(p => ({...p, subgroupId: e.target.value}))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                  <option value="">— Sin subgrupo —</option>
                  {subgroups[selectedGroup.id].map(sub => (
                    <option key={sub.id} value={sub.id} style={{ background: '#1c1c26' }}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Agregar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
