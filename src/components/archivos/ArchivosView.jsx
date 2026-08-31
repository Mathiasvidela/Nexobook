import React, { useEffect, useMemo, useState } from 'react';
import { usePeriod } from '../../context/PeriodContext.jsx';
import { api } from '../../services/api.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { FileText, Eye, Upload, Download, Search, Trash2, Pencil, CheckSquare, Square, FolderOpen } from 'lucide-react';

export default function ArchivosView({ onUploadDocument, onOpenPdfViewer, onOpenEditor, addToast }) {
  const { periodoSeleccionado } = usePeriod();
  const [archivos, setArchivos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [tipo, setTipo] = useState('todos');
  const [materiaId, setMateriaId] = useState('todas');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const cargarArchivos = async () => {
    try {
      setLoading(true);
      const [files, subjects] = await Promise.all([api.getArchivos(), api.getMaterias(periodoSeleccionado ? { periodoId: periodoSeleccionado.id } : {})]);
      const ids = new Set((subjects || []).map(m => m.id));
      setMaterias(subjects || []); setArchivos((files || []).filter(file => ids.has(file.materiaId)));
    } catch (err) { addToast(err.message || 'No se pudo cargar la biblioteca.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarArchivos(); setSelected(new Set()); }, [periodoSeleccionado]);

  const filtered = useMemo(() => archivos.filter(file => {
    const isNote = file.tipo === 'markdown' || file.tipo === 'richtext';
    if (tipo === 'pdf' && file.tipo !== 'pdf') return false;
    if (tipo === 'resumen' && !isNote) return false;
    if (materiaId !== 'todas' && file.materiaId !== materiaId) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${file.titulo || ''} ${file.nombreOriginal || ''}`.toLowerCase().includes(needle);
  }), [archivos, tipo, materiaId, query]);

  const groups = materias.map(materia => ({ materia, files: filtered.filter(file => file.materiaId === materia.id) })).filter(group => group.files.length);
  const toggle = id => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const open = file => file.tipo === 'pdf' ? onOpenPdfViewer(file) : onOpenEditor(file.subtipo === 'apuntes' ? 'apunte' : 'resumen', file, file.materiaId);

  const rename = async file => {
    const title = window.prompt('Nuevo nombre', file.titulo || file.nombreOriginal || '');
    if (!title?.trim()) return;
    try {
      if (file.tipo === 'pdf') await api.updateArchivo(file.id, { titulo: title.trim() });
      else await api.updateResumen(file.id, { titulo: title.trim() });
      await cargarArchivos(); addToast('Documento renombrado.', 'success');
    } catch (err) { addToast(err.message || 'No se pudo renombrar.', 'error'); }
  };

  const removeSelected = async () => {
    if (!selected.size || !window.confirm(`¿Eliminar ${selected.size} documento${selected.size === 1 ? '' : 's'}?`)) return;
    try {
      await Promise.all([...selected].map(id => { const file = archivos.find(item => item.id === id); return file?.tipo === 'pdf' ? api.deleteArchivo(id) : api.deleteResumen(id); }));
      setSelected(new Set()); await cargarArchivos(); addToast('Documentos eliminados.', 'success');
    } catch (err) { addToast(err.message || 'No se pudieron eliminar todos los documentos.', 'error'); }
  };

  if (loading) return <LoadingSpinner message="Organizando tu biblioteca..." />;

  return <div className="library-page">
    <header className="library-head"><div><span className="eyebrow">Todo en su lugar</span><h1>Biblioteca</h1><p>Encontrá documentos por materia, nombre o tipo.</p></div><button className="btn btn-primary" onClick={onUploadDocument}><Upload size={16} /> Agregar documento</button></header>
    <div className="library-toolbar">
      <label className="library-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre…" /></label>
      <select value={materiaId} onChange={e => setMateriaId(e.target.value)}><option value="todas">Todas las materias</option>{materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
      <div className="segment-control">{[['todos','Todos'],['pdf','PDFs'],['resumen','Resúmenes']].map(([id,label]) => <button className={tipo === id ? 'active' : ''} key={id} onClick={() => setTipo(id)}>{label}</button>)}</div>
    </div>
    {selected.size > 0 && <div className="library-selection"><span>{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span><button onClick={() => setSelected(new Set())}>Cancelar</button><button className="danger" onClick={removeSelected}><Trash2 size={14} /> Eliminar</button></div>}
    {!groups.length ? <EmptyState title="No encontramos documentos" description="Probá con otro filtro o agregá un archivo nuevo." /> : <div className="library-groups">{groups.map(({ materia, files }) => <section className="library-group" key={materia.id}>
      <div className="library-group-head"><div className="library-folder" style={{ '--folder-color': materia.color }}><FolderOpen size={18} /></div><div><h2>{materia.nombre}</h2><span>{files.length} documento{files.length === 1 ? '' : 's'}</span></div></div>
      <div className="library-table">{files.map(file => { const isSelected = selected.has(file.id); const label = file.tipo === 'pdf' ? 'PDF' : file.subtipo === 'apuntes' ? 'Apunte' : 'Resumen'; return <article className={`library-row ${isSelected ? 'selected' : ''}`} key={file.id}>
        <button className="library-check" onClick={() => toggle(file.id)}>{isSelected ? <CheckSquare size={17} /> : <Square size={17} />}</button>
        <div className="library-type"><FileText size={17} /><span>{label}</span></div>
        <div className="library-file-name"><strong>{file.titulo || file.nombreOriginal}</strong><span>{file.nombreOriginal && file.nombreOriginal !== file.titulo ? file.nombreOriginal : `Agregado ${new Date(file.fechaCarga).toLocaleDateString('es-AR')}`}</span></div>
        {file.tipo === 'pdf' && <div className="library-reading"><i><b style={{ width: `${file.porcentajeLectura || 0}%` }} /></i><span>{file.porcentajeLectura || 0}%</span></div>}
        <div className="library-actions"><button onClick={() => rename(file)} title="Renombrar"><Pencil size={14} /></button><button className="open" onClick={() => open(file)}><Eye size={14} /> Abrir</button><a href={file.tipo === 'pdf' ? `/api/archivos/serve/${file.id}` : api.getResumenExportUrl(file.id)} download title="Descargar"><Download size={14} /></a></div>
      </article>; })}</div>
    </section>)}</div>}
  </div>;
}
