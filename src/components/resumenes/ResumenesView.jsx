import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Clock3, Edit3, FileText, FolderInput, Plus, Search, Star, Trash2 } from 'lucide-react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ConfirmModal from '../common/ConfirmModal.jsx';
import Modal from '../common/Modal.jsx';

const STARTER = '<h2>Ideas principales</h2><p>Empezá a escribir tu resumen…</p><h2>Conceptos clave</h2><ul><li>Primer concepto</li></ul><p><br></p>';
const plainText = html => (html || '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const relativeDate = value => {
  const date = new Date(value); const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Hoy'; if (days === 1) return 'Ayer'; if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

export default function ResumenesView({ onOpenEditor, addToast, refreshKey }) {
  const { periodoSeleccionado } = usePeriod();
  const [materias, setMaterias] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('recientes');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ materiaId: '', tipo: 'resumen', titulo: '' });
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [subjects, metadata] = await Promise.all([api.getMaterias(periodoSeleccionado ? { periodoId: periodoSeleccionado.id } : {}), api.getResumenes()]);
      const ids = new Set((subjects || []).map(item => item.id));
      const visible = (metadata || []).filter(item => ids.has(item.materiaId));
      const details = await Promise.all(visible.map(item => api.getResumenDetail(item.id).catch(() => item)));
      setMaterias(subjects || []); setDocs(details);
      setCreateForm(current => ({ ...current, materiaId: ids.has(current.materiaId) ? current.materiaId : subjects?.[0]?.id || '' }));
    } catch (err) { addToast?.(err.message || 'No se pudieron cargar tus resúmenes.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [periodoSeleccionado, refreshKey]);

  const visibleDocs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    let result = docs.filter(doc => !needle || `${doc.titulo || ''} ${plainText(doc.contenido)}`.toLocaleLowerCase('es').includes(needle));
    if (view === 'favoritos') result = result.filter(doc => doc.favorito);
    result.sort((a, b) => new Date(b.ultimaApertura || b.fechaModificacion || b.fechaCarga) - new Date(a.ultimaApertura || a.fechaModificacion || a.fechaCarga));
    return view === 'recientes' ? result.slice(0, 8) : result;
  }, [docs, query, view]);

  const create = async event => {
    event.preventDefault();
    try {
      const title = createForm.titulo.trim() || (createForm.tipo === 'apunte' ? 'Nuevo apunte' : 'Nuevo resumen');
      const created = await api.createResumen({ materiaId: createForm.materiaId, titulo: title, tipo: createForm.tipo, formato: 'html', contenido: STARTER });
      setCreating(false); setCreateForm(current => ({ ...current, titulo: '' })); await load();
      onOpenEditor(createForm.tipo, created, createForm.materiaId);
    } catch (err) { addToast?.(err.message || 'No se pudo crear el documento.', 'error'); }
  };
  const toggleFavorite = async doc => {
    try {
      const updated = await api.updateResumen(doc.id, { favorito: !doc.favorito });
      setDocs(current => current.map(item => item.id === doc.id ? { ...item, ...updated } : item));
    } catch (err) { addToast?.(err.message || 'No se pudo actualizar el favorito.', 'error'); }
  };
  const move = async (doc, materiaId) => {
    if (!materiaId || materiaId === doc.materiaId) return;
    try { await api.moverResumen(doc.id, materiaId); await load(); addToast?.('Documento movido.', 'success'); }
    catch (err) { addToast?.(err.message || 'No se pudo mover el documento.', 'error'); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { await api.deleteResumen(deleting.id); setDocs(current => current.filter(item => item.id !== deleting.id)); addToast?.('Documento eliminado.', 'success'); }
    catch (err) { addToast?.(err.message || 'No se pudo eliminar.', 'error'); }
    finally { setDeleting(null); }
  };

  if (loading) return <LoadingSpinner message="Preparando tu escritorio de escritura…" />;
  return <div className="notes-hub">
    <header className="notes-hub-head"><div><span className="eyebrow">Tu conocimiento</span><h1>Resúmenes</h1><p>Tus ideas, apuntes y resúmenes en un solo lugar.</p></div><button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!materias.length}><Plus size={16} /> Nuevo documento</button></header>
    <div className="notes-hub-toolbar"><label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por título o dentro del contenido…" /></label><div className="segment-control">{[['recientes','Recientes'],['favoritos','Favoritos'],['todos','Todos']].map(([id, label]) => <button className={view === id ? 'active' : ''} key={id} onClick={() => setView(id)}>{label}</button>)}</div></div>
    {view === 'recientes' && !query && docs.length > 0 && <div className="notes-continue"><Clock3 size={16} /><div><strong>Continuá donde dejaste</strong><span>{docs.slice().sort((a,b) => new Date(b.ultimaApertura || b.fechaModificacion) - new Date(a.ultimaApertura || a.fechaModificacion))[0]?.titulo}</span></div><button onClick={() => { const doc = docs.slice().sort((a,b) => new Date(b.ultimaApertura || b.fechaModificacion) - new Date(a.ultimaApertura || a.fechaModificacion))[0]; onOpenEditor(doc.subtipo === 'apuntes' ? 'apunte' : 'resumen', doc, doc.materiaId); }}>Abrir</button></div>}
    {!visibleDocs.length ? <EmptyState icon={BookOpenText} title={view === 'favoritos' ? 'Todavía no tenés favoritos' : 'No encontramos documentos'} description={view === 'favoritos' ? 'Marcá con una estrella los resúmenes que consultás más seguido.' : 'Creá un resumen o probá con otra búsqueda.'} actionButton={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} /> Crear documento</button>} /> : <div className="notes-card-grid">{visibleDocs.map(doc => {
      const subject = materias.find(item => item.id === doc.materiaId); const excerpt = plainText(doc.contenido);
      return <article className="notes-card" key={doc.id} style={{ '--note-color': subject?.color || 'var(--accent-primary)' }}>
        <div className="notes-card-top"><span><FileText size={17} /> {doc.subtipo === 'apuntes' ? 'Apunte' : 'Resumen'}</span><button className={doc.favorito ? 'favorite' : ''} onClick={() => toggleFavorite(doc)} title="Favorito"><Star size={16} fill={doc.favorito ? 'currentColor' : 'none'} /></button></div>
        <button className="notes-card-open" onClick={() => onOpenEditor(doc.subtipo === 'apuntes' ? 'apunte' : 'resumen', doc, doc.materiaId)}><h2>{doc.titulo || 'Sin título'}</h2><p>{excerpt || 'Documento vacío. Abrilo para empezar a escribir.'}</p></button>
        <div className="notes-card-meta"><span><i />{subject?.nombre || 'Sin materia'}</span><small>{relativeDate(doc.fechaModificacion || doc.fechaCarga)}</small></div>
        <div className="notes-card-actions"><label title="Mover a otra materia"><FolderInput size={14} /><select value={doc.materiaId} onChange={event => move(doc, event.target.value)}>{materias.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><button onClick={() => onOpenEditor(doc.subtipo === 'apuntes' ? 'apunte' : 'resumen', doc, doc.materiaId)} title="Editar"><Edit3 size={15} /></button><button className="danger" onClick={() => setDeleting(doc)} title="Eliminar"><Trash2 size={15} /></button></div>
      </article>;
    })}</div>}
    <Modal isOpen={creating} onClose={() => setCreating(false)} title="Nuevo documento" maxWidth="520px"><form className="notes-create-form" onSubmit={create}><label><span>Título</span><input autoFocus value={createForm.titulo} onChange={event => setCreateForm({ ...createForm, titulo: event.target.value })} placeholder="Ej: Arquitectura de servidores" /></label><label><span>Materia</span><select value={createForm.materiaId} onChange={event => setCreateForm({ ...createForm, materiaId: event.target.value })}>{materias.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label><span>Tipo</span><select value={createForm.tipo} onChange={event => setCreateForm({ ...createForm, tipo: event.target.value })}><option value="resumen">Resumen</option><option value="apunte">Apunte</option></select></label><div><button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancelar</button><button className="btn btn-primary">Crear y escribir</button></div></form></Modal>
    <ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="Eliminar documento" message={`¿Querés eliminar “${deleting?.titulo || 'este documento'}”?`} />
  </div>;
}
