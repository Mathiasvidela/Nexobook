import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import Modal from '../common/Modal.jsx';
import { api } from '../../services/api.js';
import { ArrowLeft, Bold, Check, Code2, Heading1, Heading2, Highlighter, ImagePlus, Italic, Link, List, ListOrdered, ListChecks, Quote, Redo2, RemoveFormatting, Save, Strikethrough, Table2, Underline, Undo2 } from 'lucide-react';

const STARTER = '<h2>Ideas principales</h2><p>Empezá a escribir…</p><h2>Conceptos clave</h2><ul><li>Primer concepto</li></ul><p><br></p>';

export default function MarkdownEditorModal({ isOpen, onClose, doc = null, tipo = 'resumen', materiaId = null, onSaved, addToast, materiasList = [], inline = false }) {
  const [titulo, setTitulo] = useState('');
  const [selectedMateriaId, setSelectedMateriaId] = useState('');
  const [contenido, setContenido] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('saved');
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const hydratedRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    hydratedRef.current = false;
    setDirty(false);
    setSelectedMateriaId(doc?.materiaId || materiaId || materiasList[0]?.id || '');
    setTitulo(doc?.titulo || '');
    if (!doc?.id) {
      setContenido(STARTER); setStatus('saved');
      requestAnimationFrame(() => { if (editorRef.current) editorRef.current.innerHTML = STARTER; hydratedRef.current = true; });
      return;
    }
    api.getResumenDetail(doc.id).then(detail => {
      let html = detail.formato === 'html' || detail.tipo === 'richtext' ? (detail.contenido || '') : marked.parse(detail.contenido || '');
      let nextTitle = detail.titulo || '';
      const draft = localStorage.getItem(`nexobook-draft-${doc.id}`);
      if (draft) { try { const parsed = JSON.parse(draft); html = parsed.content ?? html; nextTitle = parsed.title ?? nextTitle; setStatus('error'); } catch { localStorage.removeItem(`nexobook-draft-${doc.id}`); setStatus('saved'); } } else setStatus('saved');
      setTitulo(nextTitle); setSelectedMateriaId(detail.materiaId || materiaId || ''); setContenido(html);
      requestAnimationFrame(() => { if (editorRef.current) editorRef.current.innerHTML = html; hydratedRef.current = true; });
    }).catch(err => addToast(err.message || 'No se pudo abrir el documento.', 'error'));
  }, [doc?.id, isOpen, materiaId]);

  useEffect(() => {
    if (!isOpen || !doc?.id || !hydratedRef.current) return;
    setStatus('saving');
    const draftKey = `nexobook-draft-${doc.id}`;
    localStorage.setItem(draftKey, JSON.stringify({ title: titulo, content: contenido, savedAt: Date.now() }));
    const timer = setTimeout(() => api.updateResumen(doc.id, { titulo: titulo.trim() || 'Sin título', contenido, formato: 'html' }).then(() => { localStorage.removeItem(draftKey); setStatus('saved'); setDirty(false); onSaved?.(); }).catch(() => setStatus('error')), 750);
    return () => clearTimeout(timer);
  }, [titulo, contenido, doc?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || (!dirty && status !== 'saving')) return;
    const protect = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [isOpen, dirty, status]);

  const command = (name, value = null) => {
    editorRef.current?.focus(); document.execCommand(name, false, value); setContenido(editorRef.current?.innerHTML || ''); setDirty(true);
  };
  const setBlock = tag => command('formatBlock', tag);
  const addLink = () => { const url = window.prompt('Pegá el enlace'); if (url) command('createLink', /^https?:\/\//i.test(url) ? url : `https://${url}`); };
  const insertImage = file => {
    if (!file?.type?.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return addToast('La imagen supera el límite de 10 MB.', 'error');
    const reader = new FileReader(); reader.onload = () => command('insertImage', reader.result); reader.readAsDataURL(file);
  };
  const handlePaste = event => { const image = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/')); if (image) { event.preventDefault(); insertImage(image.getAsFile()); } };
  const save = async () => {
    if (!titulo.trim() || !selectedMateriaId) return addToast('Completá el título y la materia.', 'error');
    try {
      setSaving(true); let saved;
      if (doc?.id) saved = await api.updateResumen(doc.id, { titulo: titulo.trim(), contenido, formato: 'html' });
      else saved = await api.createResumen({ materiaId: selectedMateriaId, titulo: titulo.trim(), tipo, contenido, formato: 'html' });
      if (doc?.id) localStorage.removeItem(`nexobook-draft-${doc.id}`);
      setStatus('saved'); setDirty(false); await onSaved?.(); addToast('Documento guardado.', 'success'); onClose(); return saved;
    } catch (err) { setStatus('error'); addToast(err.message || 'No se pudo guardar el documento.', 'error'); }
    finally { setSaving(false); }
  };
  const requestClose = () => {
    if (!doc?.id && dirty && !window.confirm('Este documento todavía no fue guardado. ¿Querés salir y descartarlo?')) return;
    onClose();
  };

  const editor = <div className={`visual-editor-modal ${inline ? 'inline' : ''}`}>
      <header className="visual-editor-info"><input className="visual-editor-title" value={titulo} onChange={event => { setTitulo(event.target.value); setDirty(true); }} placeholder="Título del documento" autoFocus /><select value={selectedMateriaId} onChange={event => { setSelectedMateriaId(event.target.value); setDirty(true); }} disabled={Boolean(doc)}>{materiasList.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><span className={`save-status ${status}`}>{status === 'saving' ? 'Guardando…' : status === 'error' ? 'Borrador local' : <><Check size={13} /> Guardado</>}</span></header>
      <div className="visual-editor-toolbar">
        <button onMouseDown={event => { event.preventDefault(); setBlock('p'); }}>Aa</button><button onMouseDown={event => { event.preventDefault(); setBlock('h1'); }} title="Título"><Heading1 size={17} /></button><button onMouseDown={event => { event.preventDefault(); setBlock('h2'); }} title="Subtítulo"><Heading2 size={17} /></button><i />
        {[['bold',Bold],['italic',Italic],['underline',Underline],['strikeThrough',Strikethrough]].map(([name, Icon]) => <button key={name} onMouseDown={event => { event.preventDefault(); command(name); }}><Icon size={16} /></button>)}
        <button onMouseDown={event => { event.preventDefault(); command('hiliteColor', '#fff0a8'); }}><Highlighter size={16} /></button><i /><button onMouseDown={event => { event.preventDefault(); command('insertUnorderedList'); }}><List size={16} /></button><button onMouseDown={event => { event.preventDefault(); command('insertOrderedList'); }}><ListOrdered size={16} /></button><button onMouseDown={event => { event.preventDefault(); setBlock('blockquote'); }}><Quote size={16} /></button><button onMouseDown={event => { event.preventDefault(); setBlock('pre'); }}><Code2 size={16} /></button><button onMouseDown={event => { event.preventDefault(); command('insertHTML', '<ul class="rich-checklist"><li><label><input type="checkbox"> Tarea o concepto</label></li></ul><p><br></p>'); }}><ListChecks size={16} /></button><button onMouseDown={event => { event.preventDefault(); command('insertHTML', '<table><tbody><tr><th>Concepto</th><th>Detalle</th></tr><tr><td>Idea</td><td>Descripción</td></tr></tbody></table><p><br></p>'); }}><Table2 size={16} /></button><button onMouseDown={event => { event.preventDefault(); addLink(); }}><Link size={16} /></button><button onMouseDown={event => { event.preventDefault(); imageInputRef.current?.click(); }}><ImagePlus size={16} /></button><button onMouseDown={event => { event.preventDefault(); command('removeFormat'); }}><RemoveFormatting size={16} /></button><button onMouseDown={event => { event.preventDefault(); command('undo'); }}><Undo2 size={16} /></button><button onMouseDown={event => { event.preventDefault(); command('redo'); }}><Redo2 size={16} /></button>
        <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={event => { insertImage(event.target.files?.[0]); event.target.value = ''; }} />
      </div>
      <div className="visual-editor-scroll"><article ref={editorRef} className="rich-editor visual-editor-page" contentEditable suppressContentEditableWarning onInput={event => { setContenido(event.currentTarget.innerHTML); setDirty(true); }} onPaste={handlePaste} data-placeholder="Empezá a escribir…" spellCheck="true" /></div>
      <footer className="visual-editor-footer"><span>Editor visual · Podés pegar imágenes con ⌘V</span><div><button className="btn btn-secondary" onClick={requestClose}>Cerrar</button><button className="btn btn-primary" onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}</button></div></footer>
    </div>;
  if (inline) return <div className="editor-page-view"><header><button onClick={requestClose}><ArrowLeft size={17} /> Volver</button><div><span className="eyebrow">Nexobook</span><strong>{doc ? 'Editando documento' : 'Nuevo documento'}</strong></div><span className="editor-focus-label">Modo escritura</span></header>{editor}</div>;
  return <Modal isOpen={isOpen} onClose={onClose} title={doc ? 'Editar documento' : `Nuevo ${tipo === 'apunte' ? 'apunte' : 'resumen'}`} maxWidth="96vw">{editor}</Modal>;
}
