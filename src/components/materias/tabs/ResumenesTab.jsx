import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, FileText, Plus, Search, Star, Trash2 } from 'lucide-react';
import { api } from '../../../services/api.js';
import EmptyState from '../../common/EmptyState.jsx';
import ConfirmModal from '../../common/ConfirmModal.jsx';

const STARTER = '<h2>Ideas principales</h2><p>Empezá a escribir tu resumen…</p><h2>Conceptos clave</h2><ul><li>Primer concepto</li></ul><p><br></p>';
const plainText = value => (value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export default function ResumenesTab({ materiaId, addToast, onRefresh, onOpenEditor, materia }) {
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const metadata = await api.getResumenes({ materiaId, tipo: 'resumen' });
      const details = await Promise.all((metadata || []).map(item => api.getResumenDetail(item.id).catch(() => item)));
      setDocs(details.sort((a, b) => new Date(b.fechaModificacion || b.fechaCarga) - new Date(a.fechaModificacion || a.fechaCarga)));
    } catch (err) { addToast(err.message || 'No se pudieron cargar los resúmenes.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadDocs(); }, [materiaId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return docs.filter(doc => !needle || `${doc.titulo || ''} ${plainText(doc.contenido)}`.toLocaleLowerCase('es').includes(needle));
  }, [docs, query]);

  const createDoc = async () => {
    try {
      const created = await api.createResumen({ materiaId, titulo: 'Resumen sin título', tipo: 'resumen', formato: 'html', contenido: STARTER });
      await onRefresh?.(); onOpenEditor?.('resumen', created, materiaId);
    } catch (err) { addToast(err.message || 'No se pudo crear el resumen.', 'error'); }
  };
  const toggleFavorite = async doc => {
    try { const updated = await api.updateResumen(doc.id, { favorito: !doc.favorito }); setDocs(current => current.map(item => item.id === doc.id ? { ...item, ...updated } : item)); }
    catch (err) { addToast(err.message || 'No se pudo actualizar el favorito.', 'error'); }
  };
  const remove = async () => {
    if (!deletingDoc) return;
    try { await api.deleteResumen(deletingDoc.id); setDocs(current => current.filter(item => item.id !== deletingDoc.id)); await onRefresh?.(); addToast('Resumen enviado a la papelera.', 'success'); }
    catch (err) { addToast(err.message || 'No se pudo eliminar.', 'error'); }
    finally { setDeletingDoc(null); }
  };

  return <section className="subject-notes-library">
    <header><div><span className="eyebrow">Documentos de la materia</span><h2>Resúmenes</h2><p>Abrí una tarjeta para escribir en pantalla completa.</p></div><button className="btn btn-primary" onClick={createDoc}><Plus size={16} /> Nuevo resumen</button></header>
    <label className="subject-notes-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por título o contenido…" /></label>
    {loading ? <div className="subject-notes-loading">Organizando resúmenes…</div> : !filtered.length ? <EmptyState icon={FileText} title={query ? 'No encontramos coincidencias' : 'Todavía no hay resúmenes'} description={query ? 'Probá con otra búsqueda.' : 'Creá el primero y escribí con el editor visual.'} actionButton={!query && <button className="btn btn-primary" onClick={createDoc}><Plus size={15} /> Crear resumen</button>} /> : <div className="subject-notes-grid">{filtered.map((doc, index) => <article className="subject-note-card" key={doc.id} style={{ '--subject-note-color': materia?.color || 'var(--accent-primary)' }}>
      <div className="subject-note-cover"><FileText size={25} /><span>{String(index + 1).padStart(2, '0')}</span><button className={doc.favorito ? 'favorite' : ''} onClick={() => toggleFavorite(doc)} title="Favorito"><Star size={16} fill={doc.favorito ? 'currentColor' : 'none'} /></button></div>
      <button className="subject-note-content" onClick={() => onOpenEditor?.('resumen', doc, materiaId)}><h3>{doc.titulo || 'Sin título'}</h3><p>{plainText(doc.contenido) || 'Abrí el documento para empezar a escribir.'}</p><span><Clock3 size={13} /> {new Date(doc.fechaModificacion || doc.fechaCarga).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span></button>
      <footer><button onClick={() => onOpenEditor?.('resumen', doc, materiaId)}>Abrir y editar</button><button className="danger" onClick={() => setDeletingDoc(doc)} title="Mover a papelera"><Trash2 size={15} /></button></footer>
    </article>)}</div>}
    <ConfirmModal isOpen={Boolean(deletingDoc)} onClose={() => setDeletingDoc(null)} onConfirm={remove} title="Mover resumen a la papelera" message={`Podrás restaurar “${deletingDoc?.titulo || 'este resumen'}” más adelante.`} confirmText="Mover a papelera" />
  </section>;
}
