import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { GraduationCap, Code2, BookOpen, Plus, ArrowRight, X, Compass, Settings2, Pencil, ArchiveRestore, Trash2 } from 'lucide-react';
import NexobookMark from '../common/NexobookMark.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';

const COLORS = ['#3478f6', '#8b5cf6', '#15a46d', '#e26d3f', '#d9468d', '#0891b2'];
const ICONS = { universidad: GraduationCap, tecnicatura: GraduationCap, bootcamp: Code2, curso: BookOpen, autodidacta: Compass };
const TEMPLATES = [
  { id: 'universidad', label: 'Carrera universitaria', description: 'Organizada por años y cuatrimestres.', icon: GraduationCap, anios: 5, periodos: 2 },
  { id: 'tecnicatura', label: 'Tecnicatura', description: 'Un plan corto organizado por años.', icon: GraduationCap, anios: 2, periodos: 2 },
  { id: 'bootcamp', label: 'Bootcamp', description: 'Una cohorte intensiva por módulos.', icon: Code2, anios: 1, periodos: 4 },
  { id: 'curso_corto', label: 'Curso corto', description: 'Un trayecto simple y enfocado.', icon: BookOpen, anios: 1, periodos: 1 },
  { id: 'autodidacta', label: 'Autodidacta', description: 'Una ruta flexible de aprendizaje.', icon: Compass, anios: 1, periodos: 1 }
];

export default function WorkspacePicker() {
  const { espacios, seleccionarEspacio, crearEspacio, actualizarEspacio, eliminarEspacio } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [deletingSpace, setDeletingSpace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', plantilla: 'universidad', descripcion: '', color: COLORS[0], duracionAnios: 5, periodosPorAnio: 2, tieneCursosBonificados: false });

  const submit = async event => {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingSpace) { await actualizarEspacio(editingSpace.id, form); setCreating(false); setEditingSpace(null); setManaging(true); }
      else await crearEspacio(form);
    }
    finally { setSaving(false); }
  };
  const openCreate = () => { setEditingSpace(null); setForm({ nombre: '', plantilla: 'universidad', descripcion: '', color: COLORS[0], duracionAnios: 5, periodosPorAnio: 2, tieneCursosBonificados: false }); setCreating(true); };
  const openEdit = space => { setEditingSpace(space); setForm({ nombre: space.nombre, plantilla: space.plantilla || space.tipo || 'curso_corto', descripcion: space.descripcion || '', color: space.color || COLORS[0], duracionAnios: space.duracionAnios || 1, periodosPorAnio: space.periodosPorAnio || 1, tieneCursosBonificados: Boolean(space.tieneCursosBonificados) }); setManaging(false); setCreating(true); };
  const archive = async () => { if (!deletingSpace) return; try { await eliminarEspacio(deletingSpace.id); setDeletingSpace(null); } catch (error) { window.alert(error.message); } };
  const restore = async space => { await actualizarEspacio(space.id, { archivado: false, archivadoEn: null }); };

  return <main className="workspace-picker">
    <header className="workspace-picker-head"><div className="picker-brand"><NexobookMark variant="logo" size={150} /></div><p className="eyebrow">Tus espacios</p><h1>¿Qué vas a estudiar hoy?</h1><p>Elegí una carrera, universidad o curso para continuar.</p><button className="workspace-manage-trigger" onClick={() => setManaging(true)}><Settings2 size={15} /> Administrar espacios</button></header>
    <section className="workspace-profiles">
      {espacios.filter(space => !space.archivado).map(space => {
        const Icon = ICONS[space.tipo] || BookOpen;
        return <button className="workspace-profile" key={space.id} onClick={() => seleccionarEspacio(space)}>
          <div className="workspace-cover" style={{ '--space-color': space.color }}><Icon size={42} /><span className="workspace-open"><ArrowRight size={19} /></span></div>
          <strong>{space.nombre}</strong><span>{space.descripcion}</span><small>{space.tipo}</small>
        </button>;
      })}
      <button className="workspace-profile add" onClick={openCreate}><div className="workspace-cover"><Plus size={38} /></div><strong>Nuevo espacio</strong><span>Universidad, carrera o bootcamp</span></button>
    </section>

    {managing && <div className="workspace-create-backdrop"><section className="workspace-manager"><button className="workspace-create-close" type="button" onClick={() => setManaging(false)}><X size={18} /></button><span className="eyebrow">Organización</span><h2>Administrar espacios</h2><p>Renombrá tus perfiles o archivá los que ya no utilizás. Archivar no elimina tus datos.</p><div className="workspace-manager-list">{espacios.map(space => <article key={space.id} className={space.archivado ? 'archived' : ''}><div className="workspace-manager-symbol"><BookOpen size={18} /></div><div><strong>{space.nombre}</strong><span>{space.descripcion} · {space.archivado ? 'Archivado' : space.tipo}</span></div>{space.archivado ? <button onClick={() => restore(space)} title="Restaurar"><ArchiveRestore size={15} /> Restaurar</button> : <><button onClick={() => openEdit(space)} title="Editar"><Pencil size={15} /> Editar</button><button className="danger" onClick={() => setDeletingSpace(space)} title="Archivar"><Trash2 size={15} /></button></>}</article>)}</div><button className="btn btn-primary" onClick={() => { setManaging(false); openCreate(); }}><Plus size={15} /> Nuevo espacio</button></section></div>}

    {creating && <div className="workspace-create-backdrop"><form className="workspace-create" onSubmit={submit}>
      <button className="workspace-create-close" type="button" onClick={() => setCreating(false)}><X size={18} /></button>
      <span className="eyebrow">{editingSpace ? 'Editar perfil' : 'Nuevo comienzo'}</span><h2>{editingSpace ? 'Editar espacio de estudio' : 'Crear espacio de estudio'}</h2><p>{editingSpace ? 'Actualizá el nombre y la configuración general del perfil.' : 'Elegí una plantilla. Nexobook preparará una estructura inicial que después podés adaptar.'}</p>
      <div className="workspace-templates">{TEMPLATES.map(template => { const Icon = template.icon; return <button type="button" key={template.id} className={form.plantilla === template.id ? 'active' : ''} onClick={() => setForm({ ...form, plantilla: template.id, duracionAnios: template.anios, periodosPorAnio: template.periodos })}><Icon size={19} /><span><strong>{template.label}</strong><small>{template.description}</small></span></button>; })}</div>
      <label><span>Nombre</span><input autoFocus value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Universidad CBA" required /></label>
      <label><span>Descripción</span><input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Licenciatura en Sistemas" /></label>
      <div className="workspace-plan-fields"><label><span>Duración en años</span><input type="number" min="1" max="12" value={form.duracionAnios} onChange={e => setForm({ ...form, duracionAnios: Number(e.target.value) })} /></label><label><span>Períodos por año</span><input type="number" min="1" max="6" value={form.periodosPorAnio} onChange={e => setForm({ ...form, periodosPorAnio: Number(e.target.value) })} /></label></div>
      <label className="workspace-bonus-toggle"><input type="checkbox" checked={form.tieneCursosBonificados} onChange={e => setForm({ ...form, tieneCursosBonificados: e.target.checked })} /><span><strong>Incluye cursos bonificados</strong><small>Podrás cargarlos manualmente desde el plan.</small></span></label>
      <div className="workspace-colors">{COLORS.map(color => <button type="button" key={color} className={form.color === color ? 'active' : ''} style={{ background: color }} onClick={() => setForm({ ...form, color })} />)}</div>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : editingSpace ? 'Guardar cambios' : 'Crear y entrar'}</button>
    </form></div>}
    <ConfirmModal isOpen={Boolean(deletingSpace)} onClose={() => setDeletingSpace(null)} onConfirm={archive} title="Archivar espacio" message={`“${deletingSpace?.nombre || 'Este espacio'}” dejará de aparecer en el inicio, pero sus materias, documentos y resúmenes se conservarán y podrás restaurarlo después.`} confirmText="Archivar espacio" />
  </main>;
}
